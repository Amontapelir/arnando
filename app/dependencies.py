from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
import logging

from app.database import get_db
from app.auth import decode_access_token
from app.crud import get_user

logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=False)


async def get_current_user(
        request: Request,
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
        db: AsyncSession = Depends(get_db)
) -> Optional[dict]:
    """
    Получение текущего пользователя для API
    """
    # 1. Проверяем куки (для веб-интерфейса)
    token = request.cookies.get("access_token")

    # 2. Если нет в куках, проверяем заголовок Authorization
    if not token and credentials:
        token = credentials.credentials

    if not token:
        logger.warning("No token provided")
        return None

    # Декодируем токен
    token_data = decode_access_token(token)
    if not token_data:
        logger.warning(f"Invalid token: {token[:20]}...")
        return None

    # Получаем пользователя из БД
    user = await get_user(db, user_id=token_data.user_id)
    if not user:
        logger.warning(f"User not found for ID: {token_data.user_id}")
        return None

    return user


async def get_current_active_user(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> dict:
    """
    Получение текущего активного пользователя
    """
    user = await get_current_user_required(request, db)
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Пользователь неактивен"
        )
    return user

async def get_current_user_optional(
        request: Request,
        db: AsyncSession = Depends(get_db)
) -> Optional[dict]:
    """
    Получение текущего пользователя (опционально, не выбрасывает ошибку)
    """
    return await get_current_user(request, None, db)


async def get_current_user_required(
        request: Request,
        db: AsyncSession = Depends(get_db)
) -> dict:
    """
    Получение текущего пользователя (обязательно, выбрасывает ошибку 401)
    """
    user = await get_current_user(request, None, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Не авторизован",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user