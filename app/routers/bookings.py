from fastapi import APIRouter, Depends, HTTPException, Request, Form, Query
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import date, timedelta

from app.database import get_db
from app.dependencies import get_current_active_user
from app import crud, schemas, models
from app.templates import templates

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.get("/calendar", response_class=HTMLResponse)
async def calendar_view(
        request: Request,
        month: Optional[int] = Query(None),
        year: Optional[int] = Query(None),
        property_id: Optional[int] = Query(None),
        current_user: models.User = Depends(get_current_active_user),
        db: AsyncSession = Depends(get_db)
):
    today = date.today()
    if not month or not year:
        month = today.month
        year = today.year

    # Начало и конец месяца
    start_date = date(year, month, 1)
    if month == 12:
        end_date = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        end_date = date(year, month + 1, 1) - timedelta(days=1)

    # Получаем объекты пользователя
    properties = await crud.get_user_properties(db, current_user.id)

    # Получаем бронирования
    bookings = []
    if property_id:
        bookings = await crud.get_property_bookings(
            db, property_id, current_user.id, start_date, end_date
        )
    else:
        # Для всех объектов
        for prop in properties:
            prop_bookings = await crud.get_property_bookings(
                db, prop.id, current_user.id, start_date, end_date
            )
            bookings.extend(prop_bookings)

    # Получаем количество дней в месяце
    import calendar
    days_in_month = calendar.monthrange(year, month)[1]

    return templates.TemplateResponse(
        "bookings/calendar.html",  # Убедитесь, что путь правильный
        {
            "request": request,
            "user": current_user,
            "properties": properties,
            "selected_property_id": property_id,
            "bookings": bookings,
            "current_month": month,
            "current_year": year,
            "today": today,
            "days_in_month": days_in_month,
            "date": date  # Добавляем date в контекст
        }
    )


@router.get("/new", response_class=HTMLResponse)
async def new_booking_form(
        request: Request,
        property_id: Optional[int] = Query(None),
        current_user: models.User = Depends(get_current_active_user),
        db: AsyncSession = Depends(get_db)
):
    properties = await crud.get_user_properties(db, current_user.id)

    return templates.TemplateResponse(
        "bookings/form.html",
        {
            "request": request,
            "user": current_user,
            "properties": properties,
            "selected_property_id": property_id,
            "today": date.today()
        }
    )


@router.post("", response_class=HTMLResponse)
async def create_booking(
        request: Request,
        property_id: int = Form(...),
        guest_name: str = Form(...),
        guest_contact: str = Form(None),
        check_in: date = Form(...),
        check_out: date = Form(...),
        total_amount: float = Form(...),
        official_amount: float = Form(...),
        notes: str = Form(None),
        current_user: models.User = Depends(get_current_active_user),
        db: AsyncSession = Depends(get_db)
):
    try:
        booking_create = schemas.BookingCreate(
            property_id=property_id,
            guest_name=guest_name,
            guest_contact=guest_contact,
            check_in=check_in,
            check_out=check_out,
            total_amount=total_amount,
            official_amount=official_amount,
            notes=notes
        )

        await crud.create_booking(db, booking_create, current_user.id)
        return RedirectResponse(url="/bookings/calendar", status_code=303)

    except ValueError as e:
        properties = await crud.get_user_properties(db, current_user.id)
        return templates.TemplateResponse(
            "bookings/form.html",
            {
                "request": request,
                "user": current_user,
                "properties": properties,
                "selected_property_id": property_id,
                "today": date.today(),
                "error": str(e)
            },
            status_code=400
        )