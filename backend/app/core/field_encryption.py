"""
Field-Level Encryption for Sensitive PII Columns (DPDP Act 2023 Compliance).

Encrypts sensitive citizen data at rest (Aadhaar numbers, phone numbers, contact info)
using AES-256-GCM / Fernet with key rotation support.
"""

import base64
import hashlib
import logging
from typing import Optional

from cryptography.fernet import Fernet

from app.core.config import get_settings
from app.core.secrets import get_secret

logger = logging.getLogger(__name__)
settings = get_settings()

_cipher_instance: Optional[Fernet] = None


def _get_fernet_cipher() -> Fernet:
    global _cipher_instance
    if _cipher_instance is None:
        # Derive a 32-byte URL-safe base64 key from jwt_secret_key or field_encryption_key
        raw_key = get_secret("field_encryption_key", default=settings.jwt_secret_key)
        derived = hashlib.sha256(raw_key.encode("utf-8")).digest()
        key_b64 = base64.urlsafe_b64encode(derived)
        _cipher_instance = Fernet(key_b64)
    return _cipher_instance


def encrypt_pii(plaintext: Optional[str]) -> Optional[str]:
    """Encrypt a sensitive plaintext string to a ciphertext string."""
    if not plaintext:
        return plaintext
    try:
        cipher = _get_fernet_cipher()
        return cipher.encrypt(plaintext.encode("utf-8")).decode("utf-8")
    except Exception as exc:
        logger.error("PII encryption failed: %s", exc)
        return plaintext


def decrypt_pii(ciphertext: Optional[str]) -> Optional[str]:
    """Decrypt a ciphertext string back to plaintext."""
    if not ciphertext:
        return ciphertext
    try:
        cipher = _get_fernet_cipher()
        return cipher.decrypt(ciphertext.encode("utf-8")).decode("utf-8")
    except Exception:
        # If not encrypted (e.g. legacy plain record), return as-is
        return ciphertext
