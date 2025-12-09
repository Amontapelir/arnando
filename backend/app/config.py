import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # Получаем DATABASE_URL и заменяем postgres:// на postgresql:// если нужно
    raw_db_url = os.getenv("DATABASE_URL", "postgresql://postgres:14020Aaa@localhost:5432/rent_tax_db")
    
    # Render использует postgres://, SQLAlchemy требует postgresql://
    if raw_db_url and raw_db_url.startswith("postgres://"):
        raw_db_url = raw_db_url.replace("postgres://", "postgresql://", 1)
    
    DATABASE_URL: str = raw_db_url
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-super-secret-key-here-make-it-very-long-and-random-12345")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

settings = Settings()
