from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date
import io
import csv

from app.database import get_db
from app.dependencies import get_current_active_user
from app import crud, models
from app.templates import templates

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("", response_class=HTMLResponse)
async def reports_dashboard(
        request: Request,
        current_user: models.User = Depends(get_current_active_user)
):
    today = date.today()
    return templates.TemplateResponse(
        "reports/index.html",
        {
            "request": request,
            "user": current_user,
            "current_year": today.year,
            "today": today
        }
    )


@router.get("/export-financial")
async def export_financial_report(
        start_date: date,
        end_date: date,
        current_user: models.User = Depends(get_current_active_user),
        db: AsyncSession = Depends(get_db)
):
    # Получаем транзакции за период
    transactions = await crud.get_user_transactions(db, current_user.id, start_date, end_date)

    # Создаем CSV в памяти
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')

    # Заголовок
    writer.writerow([
        'Дата', 'Тип', 'Категория', 'Описание',
        'Общая сумма', 'Официальная сумма',
        'Объект', 'Вычитаемый расход'
    ])

    # Данные
    for transaction in transactions:
        writer.writerow([
            transaction.date,
            'Доход' if transaction.transaction_type == schemas.TransactionType.INCOME else 'Расход',
            transaction.category,
            transaction.description or '',
            str(transaction.amount),
            str(transaction.official_amount),
            transaction.property.name if transaction.property else '',
            'Да' if transaction.is_tax_deductible else 'Нет'
        ])

    output.seek(0)

    # Возвращаем файл
    from fastapi.responses import StreamingResponse

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=financial_report_{start_date}_{end_date}.csv"
        }
    )


@router.get("/export-tax")
async def export_tax_report(
        year: int,
        current_user: models.User = Depends(get_current_active_user),
        db: AsyncSession = Depends(get_db)
):
    start_date = date(year, 1, 1)
    end_date = date(year, 12, 31)

    summary = await crud.get_financial_summary(db, current_user.id, start_date, end_date)

    # Создаем CSV
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')

    writer.writerow(['Налоговый отчет за год', year])
    writer.writerow(['Пользователь', current_user.email])
    writer.writerow(['Режим налогообложения', current_user.tax_mode.value])
    writer.writerow([])
    writer.writerow(['Показатель', 'Сумма (₽)'])
    writer.writerow(['Общий доход', str(summary['total_income'])])
    writer.writerow(['Официальный доход', str(summary['official_income'])])
    writer.writerow(['Неофициальный доход', str(summary['unofficial_income'])])
    writer.writerow(['Все расходы', str(summary['total_expenses'])])
    writer.writerow(['Официальные расходы', str(summary['official_expenses'])])
    writer.writerow(['Вычитаемые расходы', str(summary['deductible_expenses'])])
    writer.writerow(['Прибыль', str(summary['profit'])])

    output.seek(0)

    from fastapi.responses import StreamingResponse

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=tax_report_{year}.csv"
        }
    )