FROM python:3.9-slim

# Устанавливаем системные зависимости
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .

RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Удаляем миграции из команд запуска, создаем таблицы напрямую
CMD ["sh", "-c", "python -c \"from app.database import Base, engine; Base.metadata.create_all(bind=engine); print('✅ Tables created successfully')\" && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"]
