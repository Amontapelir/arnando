from urllib.parse import quote

from fastapi import APIRouter, Depends, Request, Form
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_active_user
from app import crud, schemas, models
from app.templates import templates

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("", response_class=HTMLResponse)
async def profile_page(
        request: Request,
        current_user: models.User = Depends(get_current_active_user)
):
    return templates.TemplateResponse(
        "profile.html",
        {"request": request, "user": current_user}
    )


@router.post("", response_class=HTMLResponse)
async def update_profile(
        request: Request,
        full_name: str = Form(None),
        phone: str = Form(None),
        current_user: models.User = Depends(get_current_active_user),
        db: AsyncSession = Depends(get_db)
):
    await crud.update_user_profile(
        db, current_user, schemas.UserUpdate(full_name=full_name, phone=phone)
    )
    return RedirectResponse(
        url="/profile?success=" + quote("Профиль обновлён"), status_code=303
    )
