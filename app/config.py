from pydantic_settings import BaseSettings
from typing import List, Optional

class Settings(BaseSettings):
    # Database
    database_url: str
    redis_url: Optional[str] = "redis://localhost:6379"  # Значение по умолчанию

    # Security
    secret_key: str = "dev-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # App
    debug: bool = False
    allowed_hosts: List[str] = ["localhost", "127.0.0.1", "0.0.0.0"]

    class Config:
        env_file = ".env"
        extra = "ignore"  # Игнорировать лишние переменные

settings = Settings()