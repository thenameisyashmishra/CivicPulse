import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Using the `bcrypt` package directly (rather than passlib's CryptContext)
# to sidestep a known passlib/bcrypt>=4.1 version-detection incompatibility.
_MAX_BCRYPT_BYTES = 72

# In-memory revocation set for development/testing when Redis is bypassed
_revoked_tokens_mem: set[str] = set()


def hash_password(password: str) -> str:
    pw_bytes = password.encode("utf-8")[:_MAX_BCRYPT_BYTES]
    return bcrypt.hashpw(pw_bytes, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    pw_bytes = plain_password.encode("utf-8")[:_MAX_BCRYPT_BYTES]
    try:
        return bcrypt.checkpw(pw_bytes, hashed_password.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(
    subject: str,
    role: str,
    expires_minutes: Optional[int] = None,
    extra_claims: Optional[dict] = None,
) -> str:
    minutes = expires_minutes or settings.access_token_expire_minutes
    expire = datetime.now(timezone.utc) + timedelta(minutes=minutes)
    payload = {
        "sub": subject,
        "role": role,
        "type": "access",
        "jti": uuid.uuid4().hex,
        "exp": expire,
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_refresh_token(subject: str, role: str, expires_days: int = 7) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=expires_days)
    payload = {
        "sub": subject,
        "role": role,
        "type": "refresh",
        "jti": uuid.uuid4().hex,
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_token_pair(subject: str, role: str) -> dict:
    access_token = create_access_token(subject, role)
    refresh_token = create_refresh_token(subject, role)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


def decode_access_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        jti = payload.get("jti")
        if jti and jti in _revoked_tokens_mem:
            return None
        return payload
    except (jwt.PyJWTError, Exception):
        return None


async def revoke_token(jti: str, ttl_seconds: int = 86400) -> None:
    """Revoke a token by its JTI (using Redis or in-memory fallback)."""
    _revoked_tokens_mem.add(jti)
    try:
        from app.db.cache import redis_cache

        client = await redis_cache.get_client()
        if client:
            await client.setex(f"civicpulse:revoked:{jti}", ttl_seconds, "1")
    except Exception as exc:
        logger.debug("Redis token revocation set error: %s", exc)


async def is_token_revoked(jti: str) -> bool:
    """Check if token JTI has been placed in the revocation list."""
    if jti in _revoked_tokens_mem:
        return True
    try:
        from app.db.cache import redis_cache

        client = await redis_cache.get_client()
        if client:
            return bool(await client.exists(f"civicpulse:revoked:{jti}"))
    except Exception as exc:
        logger.debug("Redis token revocation check error: %s", exc)
    return False
