# backend/config.py
import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:14020Aaa@localhost:5432/rent_tax_db")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-super-secret-key-here-make-it-very-long-and-random-12345")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 часа

settings = Settings()