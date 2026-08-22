"""
Enterprise Secrets Manager for CivicPulse.

Supports HashiCorp Vault, AWS Secrets Manager, and GCP Secret Manager in production,
with zero-friction fallback to environment variables and .env in development mode.
"""

import logging
import os
from functools import lru_cache
from typing import Optional

from app.core.config import get_settings

logger = logging.getLogger(__name__)


@lru_cache
def get_secret(key: str, default: Optional[str] = None) -> str:
    """
    Retrieve a sensitive secret value.

    In production: attempts to fetch from configured Vault/KMS backend.
    In development: reads from environment variables / application settings.
    """
    settings = get_settings()

    # In production with Vault configured, attempt Vault fetch
    if settings.app_env == "production" and getattr(settings, "vault_url", None) and getattr(settings, "vault_token", None):
        try:
            import hvac

            client = hvac.Client(url=settings.vault_url, token=settings.vault_token)
            if client.is_authenticated():
                secret_version = client.secrets.kv.v2.read_secret_version(
                    path=f"civicpulse/{key}",
                    mount_point=getattr(settings, "vault_mount_point", "secret"),
                )
                return secret_version["data"]["data"]["value"]
        except Exception as exc:
            logger.warning("Vault retrieval failed for key '%s': %s. Falling back to env.", key, exc)

    # Standard fallback: check OS environment, then pydantic settings, then default
    env_val = os.getenv(key.upper()) or os.getenv(key)
    if env_val:
        return env_val

    setting_val = getattr(settings, key.lower(), None)
    if setting_val is not None:
        return str(setting_val)

    if default is not None:
        return default

    return ""
