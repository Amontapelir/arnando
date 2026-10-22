# 🏠 RentLedger (Arnando) — учёт посуточной аренды для самозанятых

Веб-приложение для учёта посуточной аренды недвижимости с раздельным бухгалтерским
учётом официальных и неофициальных сумм, календарём бронирований и калькулятором
налогов для разных режимов налогообложения.

Проект начинался как решение кейс-чемпионата (учёт объектов, договоров и платежей
для самозанятых арендодателей) и затем был доработан в полноценное приложение.

---

## ✨ Возможности

- 📊 **Дашборд** — доходы, расходы, прибыль и налоговая база за месяц, сравнение с прошлым месяцем
- 🏢 **Объекты недвижимости** — добавление и управление
- 📅 **Календарь бронирований** — с проверкой пересечения дат
- 💰 **Раздельный учёт** — официальная и неофициальная часть дохода по каждой операции
- 🧮 **Налоговый калькулятор** — самозанятость (НПД 4%/6%), УСН "Доходы", УСН "Доходы-расходы"
- 📈 **Отчёты** — экспорт в CSV (финансовый и налоговый отчёт за год)
- 👤 **Профиль** — редактирование личных данных, смена режима налогообложения
- 🌓 **Светлая/тёмная тема** — переключатель с запоминанием выбора
- 🔐 **JWT-аутентификация** — через cookie для веб-интерфейса

### Дизайн

Собственная визуальная система ("гроссбух", а не типовой SaaS-шаблон): один
акцентный цвет, Lora для заголовков рядом с Inter для интерфейса, карточки на
тонких обводках вместо тяжёлых теней и градиентов. Полностью поддерживается
тёмная тема во всех разделах.

---

## 🏗 Архитектура

Единое серверное приложение на FastAPI с рендерингом через Jinja2 (без отдельного
REST API и отдельного фронтенда).

- **Backend**: FastAPI, SQLAlchemy 2.0 (async), Alembic
- **DB**: PostgreSQL (asyncpg)
- **Auth**: JWT (python-jose) + bcrypt, токен в httpOnly cookie
- **Templates**: Jinja2
- **Контейнеризация**: Docker / docker-compose

### Структура проекта

```text
rentledger/
├── app/
│   ├── main.py              # FastAPI-приложение и маршруты
│   ├── models.py             # SQLAlchemy модели
│   ├── schemas.py            # Pydantic-схемы
│   ├── crud.py                # CRUD-операции
│   ├── auth.py                 # JWT, хэширование паролей
│   ├── dependencies.py    # Зависимости авторизации
│   ├── database.py          # Подключение к БД
│   ├── config.py              # Конфигурация (pydantic-settings)
│   ├── routers/                # Роутеры: auth, properties, bookings, transactions, taxes, reports, dashboard, profile
│   ├── services/               # Бизнес-логика: расчёт бронирований, финансов, налогов
│   ├── templates/             # Jinja2-шаблоны
│   └── static/                  # CSS/JS
├── alembic/                     # Миграции БД
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
└── .env.example
```

---

## 🚀 Запуск

### Через Docker (рекомендуется)

```bash
git clone https://github.com/Amontapelir/arnando.git rentledger
cd rentledger
cp .env.example .env   # и заполните SECRET_KEY своим значением
docker compose up --build
```

Приложение будет доступно на `http://localhost:8000`.

### Локально без Docker (с Postgres)

```bash
python -m venv .venv
.venv\Scripts\activate     # Windows
# source .venv/bin/activate  # Linux/Mac

pip install -r requirements.txt
cp .env.example .env
# укажите DATABASE_URL на свой Postgres

alembic upgrade head
uvicorn app.main:app --reload --port 8001
```

### Быстрый локальный запуск на SQLite (без Postgres и без Docker)

Удобно для демонстрации/проверки, когда под рукой нет Postgres:

```bash
pip install -r requirements.txt
pip install aiosqlite

# Windows PowerShell:
$env:DATABASE_URL = "sqlite+aiosqlite:///./dev.db"
$env:SECRET_KEY = "local-dev-secret-key"
uvicorn app.main:app --reload --port 8001

# Linux/Mac:
# DATABASE_URL="sqlite+aiosqlite:///./dev.db" SECRET_KEY="local-dev-secret-key" uvicorn app.main:app --reload --port 8001
```

Таблицы создаются автоматически при старте. Alembic-миграции рассчитаны на
Postgres и для этого режима не нужны.

---

## 🔐 Безопасность

- Пароли хранятся в виде bcrypt-хэша
- JWT-токен передаётся через httpOnly cookie
- Детали внутренних ошибок не отдаются клиенту, если не включён `DEBUG=true`
- `.env` с реальными секретами не хранится в репозитории — см. `.env.example`

---

## 🎯 Происхождение проекта

Разработан для решения проблемы учёта доходов и расходов при сдаче недвижимости в
аренду для плательщиков налога на профессиональный доход (НПД): изначально — как
решение кейс-чемпионата, затем доработан самостоятельно до рабочего приложения с
календарём бронирований и налоговым калькулятором.

---

## 📝 Лицензия

Учебный проект. Свободное использование в образовательных целях.
