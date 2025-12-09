from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

print(f"🔄 Подключаемся к базе: {settings.DATABASE_URL[:50]}...")  # Печатаем только начало URL

try:
    # Определяем параметры подключения в зависимости от окружения
    connect_args = {}

    # Если это не локальная база (localhost), добавляем SSL для Render
    if "localhost" not in settings.DATABASE_URL:
        connect_args = {
            'sslmode': 'require'
        }
        print("🔒 Используем SSL подключение (Render)")

    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        echo=False,  # Отключаем для продакшена, чтобы не засорять логи
        connect_args=connect_args
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
