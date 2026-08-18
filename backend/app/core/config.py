"""
Application configuration.

Reads from environment variables / a .env file (see .env.example). Everything
has a sane default so the API runs out of the box with zero setup on SQLite.
"""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "CivicPulse API"
    api_prefix: str = "/api"

    database_url: str = "sqlite:///./civicpulse.db"

    jwt_secret_key: str = "change-this-to-a-long-random-secret-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 480

    upload_dir: str = "./uploads"

    cors_origins: str = "http://localhost:3000,http://localhost:5173"

    geofence_radius_meters: float = 500.0

    redis_url: str = "redis://localhost:6379/0"
    rate_limit_requests: int = 120
    rate_limit_window_seconds: int = 60

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
