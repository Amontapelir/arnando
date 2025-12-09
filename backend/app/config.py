import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:14020Aaa@localhost:5432/rent_tax_db")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-super-secret-key-here-make-it-very-long-and-random-12345")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    @property
    def sync_database_url(self):
        """Для SQLAlchemy 2.0+ с SSL"""
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        
        # Добавляем SSL для Render
        if "render.com" in url or "localhost" not in url:
            url += "?sslmode=require"
        
        return url

settings = Settings()
