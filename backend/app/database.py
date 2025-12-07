# backend/database.py
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

# Простая версия без сложного кодирования
print(f"🔄 Подключаемся к базе: {settings.DATABASE_URL}")

try:
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        echo=True  # Включите для отладки SQL
    )

    # Тестовое подключение
    with engine.connect() as conn:
        print("✅ SQLAlchemy подключение успешно!")

except Exception as e:
    print(f"❌ Ошибка SQLAlchemy: {e}")
    raise

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()