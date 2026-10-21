from fastapi import APIRouter, Depends, HTTPException, status, Response, Request, Form
from fastapi.responses import RedirectResponse, HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import timedelta
import logging

from app.database import get_db
from app import crud, schemas
from app.auth import verify_password, create_access_token
from app.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])
templates = Jinja2Templates(directory="app/templates")
logger = logging.getLogger(__name__)


@router.get("/register", response_class=HTMLResponse)
async def register_page(request: Request):
    return templates.TemplateResponse(
        "auth/register.html",
        {"request": request}
    )


@router.post("/register", response_class=RedirectResponse)
async def register(
        request: Request,
        email: str = Form(...),
        password: str = Form(...),
        full_name: str = Form(None),
        phone: str = Form(None),
        tax_mode: str = Form("self_employed"),
        db: AsyncSession = Depends(get_db)
):
    try:
        # Проверяем, существует ли пользователь
        existing_user = await crud.get_user_by_email(db, email=email)
        if existing_user:
            return templates.TemplateResponse(
                "auth/register.html",
                {
                    "request": request,
                    "error": "Пользователь с таким email уже существует"
                },
                status_code=400
            )

        # Создаем пользователя
        user_create = schemas.UserCreate(
            email=email,
            password=password,
            full_name=full_name,
            phone=phone,
            tax_mode=tax_mode
        )

        user = await crud.create_user(db=db, user=user_create)

        # Сразу логиним пользователя
        access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
        access_token = create_access_token(
            data={"sub": str(user.id)}, expires_delta=access_token_expires
        )

        response = RedirectResponse(url="/dashboard", status_code=303)
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            max_age=1800,
            expires=1800,
        )

        return response

    except Exception as e:
        logger.error(f"Registration error: {e}")
        return templates.TemplateResponse(
            "auth/register.html",
            {
                "request": request,
                "error": f"Ошибка регистрации: {str(e)}"
            },
            status_code=500
        )


@router.post("/login", response_class=RedirectResponse)
async def login(
        response: Response,
        request: Request,
        username: str = Form(...),
        password: str = Form(...),
        db: AsyncSession = Depends(get_db)
):
    try:
        user = await crud.get_user_by_email(db, email=username)
        if not user or not verify_password(password, user.hashed_password):
            return templates.TemplateResponse(
                "auth/login.html",
                {
                    "request": request,
                    "error": "Неверный email или пароль"
                },
                status_code=401
            )

        access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
        access_token = create_access_token(
            data={"sub": str(user.id)}, expires_delta=access_token_expires
        )

        response = RedirectResponse(url="/dashboard", status_code=303)
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            max_age=1800,
            expires=1800,
        )

        return response

    except Exception as e:
        logger.error(f"Login error: {e}")
        return templates.TemplateResponse(
            "auth/login.html",
            {
                "request": request,
                "error": f"Ошибка входа: {str(e)}"
            },
            status_code=500
        )


@router.get("/logout", response_class=HTMLResponse)
async def logout_get(request: Request, response: Response):
    response.delete_cookie(key="access_token")
    return RedirectResponse(url="/", status_code=303)