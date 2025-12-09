from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

print(f"🔄 Подключаемся к базе: {settings.sync_database_url[:50]}...")

engine = create_engine(
    settings.sync_database_url,
    pool_pre_ping=True,
    echo=False,
    pool_size=20,
    max_overflow=30
)

# Тестовое подключение
try:
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
