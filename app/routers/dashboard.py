from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date, timedelta

from app.database import get_db
from app.dependencies import get_current_user_required
from app import crud, schemas, models
from app.templates import templates

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_class=HTMLResponse)
async def dashboard(
    request: Request,
    current_user: models.User = Depends(get_current_user_required),
    db: AsyncSession = Depends(get_db)
):
    # Получаем текущий месяц
    today = date.today()
    month_start = date(today.year, today.month, 1)
    if today.month == 12:
        month_end = date(today.year + 1, 1, 1) - timedelta(days=1)
    else:
        month_end = date(today.year, today.month + 1, 1) - timedelta(days=1)

    # Получаем предыдущий месяц
    if today.month == 1:
        prev_month_start = date(today.year - 1, 12, 1)
        prev_month_end = date(today.year, 1, 1) - timedelta(days=1)
    else:
        prev_month_start = date(today.year, today.month - 1, 1)
        prev_month_end = date(today.year, today.month, 1) - timedelta(days=1)

    # Получаем объекты пользователя
    properties = await crud.get_user_properties(db, current_user.id)

    # Ближайшие бронирования (на 30 дней вперед)
    bookings_end_date = today + timedelta(days=30)
    bookings = await crud.get_user_transactions(
        db, current_user.id, today, bookings_end_date
    )

    # Финансовая сводка за текущий месяц
    month_summary = await crud.get_financial_summary(
        db, current_user.id, month_start, month_end
    )

    # Финансовая сводка за предыдущий месяц
    prev_month_summary = await crud.get_financial_summary(
        db, current_user.id, prev_month_start, prev_month_end
    )

    return templates.TemplateResponse(
        "dashboard/index.html",
        {
            "request": request,
            "user": current_user,
            "properties": properties,
            "bookings": bookings[:10],  # только 10 ближайших
            "month_summary": month_summary,
            "prev_month_summary": prev_month_summary,
            "today": today
        }
    )