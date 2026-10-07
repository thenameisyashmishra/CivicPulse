"""
Pluggable Object Storage Layer for CivicPulse.

Supports:
- LocalStorage: Zero-configuration local disk storage (development mode).
- S3Storage: Enterprise S3 / MinIO object storage with presigned URLs,
  CDN integration, and non-blocking streaming (production mode).
"""

import logging
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class StorageBackend(ABC):
    """Abstract interface for evidence storage operations."""

    @abstractmethod
    def upload(self, relative_path: str, data: bytes, content_type: str = "image/jpeg") -> str:
        """Saves image bytes and returns the public / accessible URL path."""
        pass

    @abstractmethod
    def get_public_url(self, relative_path: str) -> str:
        """Resolves public URL for a stored asset."""
        pass

    @abstractmethod
    def generate_presigned_upload_url(self, relative_path: str, expires_in: int = 3600) -> Optional[str]:
        """Generates presigned upload URL for direct-to-object-store client uploads."""
        pass


class LocalStorage(StorageBackend):
    """Local filesystem storage mounted under settings.upload_dir."""

    def __init__(self, base_dir: Optional[Path] = None):
        self.base_dir = base_dir or settings.upload_path
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def upload(self, relative_path: str, data: bytes, content_type: str = "image/jpeg") -> str:
        clean_rel = relative_path.replace("\\", "/").lstrip("/")
        full_path = (self.base_dir / clean_rel).resolve()
        if not str(full_path).startswith(str(self.base_dir.resolve())):
            raise ValueError("Path traversal attempt detected in storage relative_path")
        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_bytes(data)
        return f"/uploads/{clean_rel}"

    def get_public_url(self, relative_path: str) -> str:
        return f"/uploads/{relative_path.replace('\\', '/')}"

    def generate_presigned_upload_url(self, relative_path: str, expires_in: int = 3600) -> Optional[str]:
        return None


class S3Storage(StorageBackend):
    """Production AWS S3 / MinIO compatible storage backend."""

    def __init__(self):
        import boto3
        from botocore.config import Config

        self.bucket = getattr(settings, "s3_bucket", "civicpulse-uploads")
        self.cdn_url = getattr(settings, "cdn_base_url", "").rstrip("/")
        endpoint_url = getattr(settings, "s3_endpoint_url", None)

        self.client = boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            aws_access_key_id=getattr(settings, "s3_access_key", None),
            aws_secret_access_key=getattr(settings, "s3_secret_key", None),
            config=Config(signature_version="s3v4", s3={"addressing_style": "virtual"}),
        )

    def upload(self, relative_path: str, data: bytes, content_type: str = "image/jpeg") -> str:
        key = relative_path.replace("\\", "/").lstrip("/")
        self.client.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=data,
            ContentType=content_type,
            ServerSideEncryption="AES256",
        )
        if self.cdn_url:
            return f"{self.cdn_url}/{key}"
        return f"https://{self.bucket}.s3.amazonaws.com/{key}"

    def get_public_url(self, relative_path: str) -> str:
        key = relative_path.replace("\\", "/").lstrip("/")
        if self.cdn_url:
            return f"{self.cdn_url}/{key}"
        return f"https://{self.bucket}.s3.amazonaws.com/{key}"

    def generate_presigned_upload_url(self, relative_path: str, expires_in: int = 3600) -> Optional[str]:
        key = relative_path.replace("\\", "/").lstrip("/")
        try:
            return self.client.generate_presigned_url(
                "put_object",
                Params={"Bucket": self.bucket, "Key": key},
                ExpiresIn=expires_in,
            )
        except Exception as exc:
            logger.error("Failed to generate presigned upload URL: %s", exc)
            return None


def get_storage() -> StorageBackend:
    """Factory helper to obtain configured storage backend."""
    storage_type = getattr(settings, "storage_backend", "local").lower()
    if storage_type == "s3" or (settings.app_env == "production" and getattr(settings, "s3_bucket", None)):
        try:
            return S3Storage()
        except Exception as exc:
            logger.warning("Could not initialize S3 storage (%s). Falling back to LocalStorage.", exc)
            return LocalStorage()
    return LocalStorage()
