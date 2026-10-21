from fastapi import APIRouter, Depends, HTTPException, Request, Form, Query
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import date, datetime
from decimal import Decimal

from app.database import get_db
from app.dependencies import get_current_active_user
from app import crud, schemas, models
from app.services.tax_service import TaxService
from app.templates import templates

router = APIRouter(prefix="/taxes", tags=["taxes"])


@router.get("/calculator", response_class=HTMLResponse)
async def tax_calculator(
        request: Request,
        year: Optional[int] = Query(None),
        current_user: models.User = Depends(get_current_active_user),
        db: AsyncSession = Depends(get_db)
):
    today = date.today()
    if not year:
        year = today.year

    start_date = date(year, 1, 1)
    end_date = date(year, 12, 31)

    # Получаем финансовую сводку за год
    summary = await crud.get_financial_summary(db, current_user.id, start_date, end_date)

    # Рассчитываем налоги
    tax_calculation = TaxService.calculate_tax(
        tax_mode=current_user.tax_mode,
        official_income=summary["official_income"],
        deductible_expenses=summary["deductible_expenses"],
        year=year
    )

    # Получаем налоговые платежи
    tax_deadlines = TaxService.get_tax_deadlines(year, today.month)

    return templates.TemplateResponse(
        "taxes/calculator.html",
        {
            "request": request,
            "user": current_user,
            "summary": summary,
            "tax_calculation": tax_calculation,
            "tax_deadlines": tax_deadlines,
            "selected_year": year,
            "current_year": today.year
        }
    )


@router.post("/change-mode", response_class=HTMLResponse)
async def change_tax_mode(
        request: Request,
        tax_mode: str = Form(...),
        current_user: models.User = Depends(get_current_active_user),
        db: AsyncSession = Depends(get_db)
):
    try:
        current_user.tax_mode = schemas.TaxMode(tax_mode)
        await db.commit()
        return RedirectResponse(url="/taxes/calculator", status_code=303)
    except ValueError:
        raise HTTPException(status_code=400, detail="Некорректный режим налогообложения")