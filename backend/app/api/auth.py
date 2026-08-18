import random
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.db import models
from app import schemas
from app.db.database import get_db
from app.core.deps import get_current_user
from app.core.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


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

    token = create_access_token(subject=user.email, role=user.role.value)
    return schemas.Token(access_token=token, user=schemas.UserOut.model_validate(user))


@router.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # OAuth2PasswordRequestForm uses `username` as the field name; we treat it as email.
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")

    token = create_access_token(subject=user.email, role=user.role.value)
    return schemas.Token(access_token=token, user=schemas.UserOut.model_validate(user))


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.post("/digilocker/verify", response_model=schemas.UserOut)
def verify_aadhaar(
    payload: schemas.DigiLockerVerifyIn,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Simulates Aadhaar identity verification via DigiLocker API OAuth + OTP sync
    if len(payload.aadhaar_number) != 12 or not payload.aadhaar_number.isdigit():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Aadhaar number format. Must be 12 digits.")
    
    if len(payload.otp_code) != 6 or not payload.otp_code.isdigit():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OTP code. Must be 6 digits.")

    # Simulates a successful consent audit and OTP verify:
    # Set verification state on User model
    last_4 = payload.aadhaar_number[-4:]
    current_user.aadhaar_verified = True
    current_user.aadhaar_last_4 = last_4

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return current_user


import random

# In-memory store for reset verification codes (simulated email delivery)
RESET_CODES = {}


@router.put("/profile/password", response_model=schemas.UserOut)
def change_password(
    payload: schemas.PasswordChange,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password"
        )
    
    current_user.hashed_password = hash_password(payload.new_password)
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/reset-password/request")
def request_password_reset(payload: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email address not found in system"
        )
    
    # Generate 6-digit random code
    code = f"{random.randint(100000, 999999)}"
    RESET_CODES[payload.email] = code
    
    # Log code to standard output for cloud observability / local console viewing
    print(f"[MFA EMAIL SIMULATION] Reset code for {payload.email} is: {code}")
    
    return {
        "message": "Verification code generated successfully.",
        "simulated_mfa_code": code  # Returned for easy frontend simulation
    }


@router.post("/reset-password/verify")
def verify_password_reset(payload: schemas.ResetPasswordVerify, db: Session = Depends(get_db)):
    cached_code = RESET_CODES.get(payload.email)
    if not cached_code or cached_code != payload.mfa_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code"
        )
    
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email address not found"
        )
        
    # Update password and invalidate verification code
    user.hashed_password = hash_password(payload.new_password)
    db.add(user)
    db.commit()
    
    RESET_CODES.pop(payload.email, None)
    return {"message": "Password updated successfully."}
