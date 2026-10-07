"""
Application configuration for CivicPulse enterprise platform.

Reads from environment variables / a .env file. Provides strict validation
for production mode while allowing zero-friction out-of-the-box local development.
"""

from functools import lru_cache
from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "CivicPulse API"
    app_env: str = "development"  # "development", "staging", "production"
    api_prefix: str = "/api"

    # Database URLs (Default local database path stored in dedicated database_files/)
    database_url: str = "sqlite:///./database_files/civicpulse.db"
    async_database_url: str = "sqlite+aiosqlite:///./database_files/civicpulse.db"
    database_replica_url: str = ""
    database_migration_url: str = ""

    # High Concurrency & Production Pool Configuration (tuned for PgBouncer multiplexing)
    db_pool_size: int = 20
    db_max_overflow: int = 30
    db_pool_timeout: float = 30.0
    db_pool_recycle: int = 1800
    db_ssl_mode: str = "prefer"  # "disable", "prefer", "require", "verify-full"

    # Security & Authentication
    jwt_secret_key: str = "change-this-to-a-long-random-secret-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    field_encryption_key: str = ""
    ledger_hmac_key: str = ""
    otp_signing_secret: str = ""
    allow_demo_personas: bool = True

    # Cloud Storage & Object Store (S3 / MinIO)
    storage_backend: str = "local"  # "local" or "s3"
    upload_dir: str = "./uploads"
    s3_bucket: str = ""
    s3_access_key: str = ""
    s3_secret_key: str = ""
    s3_region: str = "ap-south-1"
    s3_endpoint_url: str = ""
    cdn_base_url: str = ""

    # HashiCorp Vault Secrets Management
    vault_url: str = ""
    vault_token: str = ""

    # Logging
    log_level: str = "INFO"

    cors_origins: str = "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173"

    # Geofence & Spatial
    geofence_radius_meters: float = 500.0

    # Redis (Cache vs Stream Ingestion Buffer separation)
    redis_url: str = "redis://localhost:6379/0"
    redis_streams_url: str = "redis://localhost:6379/0"
    redis_write_buffer_stream: str = "civicpulse:write_buffer"
    redis_ssl: bool = False
    rate_limit_requests: int = 120
    rate_limit_window_seconds: int = 60

    # Observability & Tracing (OpenTelemetry)
    opentelemetry_enabled: bool = False
    opentelemetry_endpoint: str = "http://localhost:4317"

    # Deep Vision & Multimodal AI Pipeline
    gemini_api_key: str = ""
    gemini_model: str = "gemini-1.5-flash"
    vision_offline_mode: bool = False

    @model_validator(mode="after")
    def _validate_production_environment(self) -> "Settings":
        """Enforces security constraints in production."""
        if self.app_env == "production":
            if "change-this" in self.jwt_secret_key.lower() or len(self.jwt_secret_key) < 32:
                raise ValueError(
                    "Insecure jwt_secret_key detected in production. "
                    "Production requires a high-entropy secret of at least 32 characters."
                )
            if self.database_url.startswith("sqlite"):
                raise ValueError(
                    "SQLite database is not permitted in production mode. "
                    "Set DATABASE_URL to a production PostgreSQL connection string."
                )
            if not self.field_encryption_key or len(self.field_encryption_key) < 32:
                raise ValueError(
                    "Insecure or missing field_encryption_key in production. "
                    "Production requires a high-entropy key of at least 32 characters for DPDP Act 2023 compliance."
                )
            if not self.ledger_hmac_key or len(self.ledger_hmac_key) < 32:
                raise ValueError(
                    "Insecure or missing ledger_hmac_key in production. "
                    "Production requires a high-entropy key of at least 32 characters for audit ledger integrity."
                )
        return self

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def upload_path(self) -> Path:
        p = Path(self.upload_dir)
        p.mkdir(parents=True, exist_ok=True)
        return p


@lru_cache
def get_settings() -> Settings:
    return Settings()
