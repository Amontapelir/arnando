import logging

from fastapi import FastAPI, Request, Depends
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from app.config import settings
from app.database import engine, Base
from app.routers import auth, properties, bookings, transactions, taxes, reports, dashboard
from app.dependencies import get_current_user
from app.models import User
from app.templates import templates
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


# Создание таблиц при старте
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Создаем таблицы
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # При завершении
    await engine.dispose()


app = FastAPI(
    title="RentLedger",
    description="Учёт посуточной аренды с раздельным бухгалтерским учётом",
    version="0.1.0",
    lifespan=lifespan
)


# Обработчики исключений
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    content = {"detail": "Internal server error"}
    if settings.debug:
        content["error"] = str(exc)
    return JSONResponse(status_code=500, content=content)


# Подключаем статические файлы
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Регистрация роутеров
app.include_router(auth.router)
app.include_router(properties.router)
app.include_router(bookings.router)
app.include_router(transactions.router)
app.include_router(taxes.router)
app.include_router(reports.router)
app.include_router(dashboard.router)


# Главная страница
@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    # Проверяем, авторизован ли пользователь
    from app.auth import decode_access_token
    from app.database import get_db
    from app.crud import get_user

    user = None
    token = request.cookies.get("access_token")

    if token:
        try:
            token_data = decode_access_token(token)
            if token_data:
                async for db in get_db():
                    user = await get_user(db, user_id=token_data.user_id)
                    if user:
                        return RedirectResponse(url="/dashboard")
        except Exception:
            logger.exception("Error checking token on /")

    return templates.TemplateResponse(
        "home.html",
        {"request": request, "user": user}
    )


# Добавляем новый маршрут для быстрого старта
@app.get("/quick-start", response_class=HTMLResponse)
async def quick_start(
        request: Request,
        current_user: User = Depends(get_current_user)
):
    return templates.TemplateResponse(
        "quick-start.html",
        {
            "request": request,
            "user": current_user
        }
    )


@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    return templates.TemplateResponse(
        "auth/login.html",
        {"request": request}
    )


@app.get("/register", response_class=HTMLResponse)
async def register_page(request: Request):
    return templates.TemplateResponse(
        "auth/register.html",
        {"request": request}
    )


# /dashboard и /properties обслуживаются роутерами dashboard.router и
# properties.router (зарегистрированы выше с полноценным набором данных
# и обязательной авторизацией) — дублирующих маршрутов здесь больше нет.


# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8001,
        reload=True
    )