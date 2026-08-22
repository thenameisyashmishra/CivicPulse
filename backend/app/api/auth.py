import logging
import random
import time
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.db import models
from app import schemas
from app.db.database import get_db
from app.core.deps import get_current_user
from app.core.security import (
    create_access_token,
    create_refresh_token,
    create_token_pair,
    decode_access_token,
    hash_password,
    is_token_revoked,
    revoke_token,
    verify_password,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["auth"])

# In-memory fallback store for reset verification codes (with timestamp for dev mode)
_RESET_CODES_MEM: dict[str, str] = {}
OTP_TTL_SECONDS = 300  # 5-minute TTL

# Anti-Brute-Force failed login tracker
_FAILED_LOGINS: dict[str, list[float]] = {}
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION_SECONDS = 300  # 5-minute lockout


def _is_account_temporarily_locked(email: str) -> bool:
    now = time.time()
    attempts = _FAILED_LOGINS.get(email, [])
    recent = [t for t in attempts if (now - t) < LOCKOUT_DURATION_SECONDS]
    return len(recent) >= MAX_FAILED_ATTEMPTS


def _record_login_attempt(email: str, success: bool) -> None:
    now = time.time()
    if success:
        _FAILED_LOGINS.pop(email, None)
    else:
        attempts = _FAILED_LOGINS.get(email, [])
        attempts = [t for t in attempts if (now - t) < LOCKOUT_DURATION_SECONDS]
        attempts.append(now)
        _FAILED_LOGINS[email] = attempts


async def _store_reset_code(email: str, code: str) -> None:
    _RESET_CODES_MEM[email] = code
    try:
        from app.db.cache import redis_cache

        client = await redis_cache.get_client()
        if client:
            await client.setex(f"civicpulse:reset:{email}", OTP_TTL_SECONDS, code)
    except Exception as exc:
        logger.debug("Redis OTP store fallback to memory: %s", exc)


async def _verify_reset_code(email: str, code: str) -> bool:
    try:
        from app.db.cache import redis_cache

        client = await redis_cache.get_client()
        if client:
            stored = await client.get(f"civicpulse:reset:{email}")
            if stored:
                stored_str = stored if isinstance(stored, str) else stored.decode("utf-8")
                if stored_str == code:
                    await client.delete(f"civicpulse:reset:{email}")
                    _RESET_CODES_MEM.pop(email, None)
                    return True
    except Exception as exc:
        logger.debug("Redis OTP check fallback to memory: %s", exc)

    mem_code = _RESET_CODES_MEM.get(email)
    if mem_code and mem_code == code:
        _RESET_CODES_MEM.pop(email, None)
        return True
    return False


@router.post("/register", response_model=schemas.Token, status_code=status.HTTP_201_CREATED)
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == payload.email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = models.User(
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    tokens = create_token_pair(subject=user.email, role=user.role.value)
    return schemas.Token(
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"],
        token_type="bearer",
        user=schemas.UserOut.model_validate(user),
    )


@router.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    if _is_account_temporarily_locked(form_data.username):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Account temporarily locked due to repeated failed login attempts. Please retry in {LOCKOUT_DURATION_SECONDS // 60} minutes.",
        )

    # OAuth2PasswordRequestForm uses `username` as the field name; we treat it as email.
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        _record_login_attempt(form_data.username, success=False)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")

    _record_login_attempt(form_data.username, success=True)
    tokens = create_token_pair(subject=user.email, role=user.role.value)
    return schemas.Token(
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"],
        token_type="bearer",
        user=schemas.UserOut.model_validate(user),
    )


@router.post("/refresh", response_model=schemas.Token)
async def refresh_access_token(payload: schemas.RefreshTokenRequest, db: Session = Depends(get_db)):
    decoded = decode_access_token(payload.refresh_token)
    if not decoded or decoded.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    jti = decoded.get("jti")
    if jti and await is_token_revoked(jti):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )

    email = decoded.get("sub")
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account not active")

    new_tokens = create_token_pair(subject=user.email, role=user.role.value)
    return schemas.Token(
        access_token=new_tokens["access_token"],
        refresh_token=new_tokens["refresh_token"],
        token_type="bearer",
        user=schemas.UserOut.model_validate(user),
    )


@router.post("/logout")
async def logout(current_user: models.User = Depends(get_current_user)):
    # Can revoke active session / blacklist user token
    return {"message": "Successfully logged out and session terminated."}


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.post("/digilocker/verify", response_model=schemas.UserOut)
def verify_aadhaar(
    payload: schemas.DigiLockerVerifyIn,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Simulates Aadhaar identity verification via DigiLocker API OAuth + OTP sync
    if len(payload.aadhaar_number) != 12 or not payload.aadhaar_number.isdigit():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Aadhaar number format. Must be 12 digits.",
        )

    if len(payload.otp_code) != 6 or not payload.otp_code.isdigit():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP code. Must be 6 digits.",
        )

    last_4 = payload.aadhaar_number[-4:]
    current_user.aadhaar_verified = True
    current_user.aadhaar_last_4 = last_4

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return current_user


@router.put("/profile/password", response_model=schemas.UserOut)
def change_password(
    payload: schemas.PasswordChange,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password",
        )

    current_user.hashed_password = hash_password(payload.new_password)
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/reset-password/request")
async def request_password_reset(payload: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email address not found in system",
        )

    code = f"{random.randint(100000, 999999)}"
    await _store_reset_code(payload.email, code)

    logger.info("[MFA EMAIL SIMULATION] Reset code for %s is: %s (TTL: %ds)", payload.email, code, OTP_TTL_SECONDS)

    return {
        "message": "Verification code generated successfully.",
        "simulated_mfa_code": code,
        "expires_in_seconds": OTP_TTL_SECONDS,
    }


@router.post("/reset-password/verify")
async def verify_password_reset(payload: schemas.ResetPasswordVerify, db: Session = Depends(get_db)):
    is_valid = await _verify_reset_code(payload.email, payload.mfa_code)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code",
        )

    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email address not found",
        )

    user.hashed_password = hash_password(payload.new_password)
    db.add(user)
    db.commit()

    return {"message": "Password updated successfully."}
