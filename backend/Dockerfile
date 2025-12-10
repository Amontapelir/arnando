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

# Копируем весь бэкенд-код
COPY . .

EXPOSE 8000
# БЫЛО:
#CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

# СТАЛО:
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
