from fastapi import APIRouter, Depends, HTTPException, Request, Form, Query
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import date, datetime, timedelta
from decimal import Decimal

from app.database import get_db
from app.dependencies import get_current_active_user
from app import crud, schemas, models
from app.templates import templates

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("", response_class=HTMLResponse)
async def list_transactions(
        request: Request,
        start_date: Optional[date] = Query(None),
        end_date: Optional[date] = Query(None),
        transaction_type: Optional[str] = Query(None),
        current_user: models.User = Depends(get_current_active_user),
        db: AsyncSession = Depends(get_db)
):
    # По умолчанию - текущий месяц
    today = date.today()
    if not start_date:
        start_date = date(today.year, today.month, 1)
    if not end_date:
        if today.month == 12:
            end_date = date(today.year + 1, 1, 1) - timedelta(days=1)
        else:
            end_date = date(today.year, today.month + 1, 1) - timedelta(days=1)

    # Преобразуем строку в enum если указана
    type_enum = None
    if transaction_type:
        type_enum = schemas.TransactionType(transaction_type)

    transactions = await crud.get_user_transactions(
        db, current_user.id, start_date, end_date, type_enum
    )

    # Получаем сводку
    summary = await crud.get_financial_summary(db, current_user.id, start_date, end_date)

    # Получаем объекты для фильтрации
    properties = await crud.get_user_properties(db, current_user.id)

    return templates.TemplateResponse(
        "transactions/list.html",
        {
            "request": request,
            "user": current_user,
            "transactions": transactions,
            "summary": summary,
            "properties": properties,
            "start_date": start_date,
            "end_date": end_date,
            "transaction_type": transaction_type
        }
    )


@router.get("/new", response_class=HTMLResponse)
async def new_transaction_form(
        request: Request,
        transaction_type: str = Query("income"),
        current_user: models.User = Depends(get_current_active_user),
        db: AsyncSession = Depends(get_db)
):
    properties = await crud.get_user_properties(db, current_user.id)

    return templates.TemplateResponse(
        "transactions/new.html",
        {
            "request": request,
            "user": current_user,
            "properties": properties,
            "transaction_type": transaction_type,
            "today": date.today()
        }
    )


@router.post("", response_class=HTMLResponse)
async def create_transaction(
        request: Request,
        property_id: Optional[int] = Form(None),
        transaction_type: str = Form(...),
        category: str = Form(...),
        description: str = Form(None),
        amount: float = Form(...),
        official_amount: float = Form(...),
        is_tax_deductible: bool = Form(False),
        transaction_date: date = Form(...),
        current_user: models.User = Depends(get_current_active_user),
        db: AsyncSession = Depends(get_db)
):
    # Проверяем, что объект принадлежит пользователю
    if property_id:
        property_obj = await crud.get_property(db, property_id, current_user.id)
        if not property_obj:
            raise HTTPException(status_code=404, detail="Объект не найден")

    try:
        transaction_create = schemas.TransactionCreate(
            property_id=property_id,
            transaction_type=schemas.TransactionType(transaction_type),
            category=category,
            description=description,
            amount=Decimal(str(amount)),
            official_amount=Decimal(str(official_amount)),
            is_tax_deductible=is_tax_deductible,
            date=transaction_date
        )

        await crud.create_transaction(db, transaction_create, current_user.id)
        return RedirectResponse(url="/transactions", status_code=303)

    except Exception as e:
        properties = await crud.get_user_properties(db, current_user.id)
        return templates.TemplateResponse(
            "transactions/new.html",
            {
                "request": request,
                "user": current_user,
                "properties": properties,
                "transaction_type": transaction_type,
                "today": date.today(),
                "error": str(e)
            },
            status_code=400
        )