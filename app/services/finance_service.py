from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import List, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, case
from app import models, schemas


class FinanceService:

    @staticmethod
    async def get_financial_overview(
            db: AsyncSession,
            user_id: int,
            start_date: date,
            end_date: date
    ) -> Dict:
        """Полный финансовый обзор за период"""
        # Доходы из бронирований
        booking_income = await db.execute(
            select(
                func.sum(models.Booking.total_amount).label("total"),
                func.sum(models.Booking.official_amount).label("official"),
                func.count(models.Booking.id).label("count")
            ).where(
                and_(
                    models.Booking.user_id == user_id,
                    models.Booking.status == "confirmed",
                    models.Booking.check_in >= start_date,
                    models.Booking.check_in <= end_date
                )
            )
        )

        # Доходы из транзакций
        transaction_income = await db.execute(
            select(
                func.sum(models.Transaction.amount).label("total"),
                func.sum(models.Transaction.official_amount).label("official"),
                func.count(models.Transaction.id).label("count")
            ).where(
                and_(
                    models.Transaction.user_id == user_id,
                    models.Transaction.transaction_type == schemas.TransactionType.INCOME,
                    models.Transaction.date >= start_date,
                    models.Transaction.date <= end_date
                )
            )
        )

        # Расходы
        expenses = await db.execute(
            select(
                func.sum(models.Transaction.amount).label("total"),
                func.sum(models.Transaction.official_amount).label("official"),
                func.sum(
                    case(
                        (models.Transaction.is_tax_deductible == True, models.Transaction.amount),
                        else_=0
                    )
                ).label("deductible"),
                func.count(models.Transaction.id).label("count")
            ).where(
                and_(
                    models.Transaction.user_id == user_id,
                    models.Transaction.transaction_type == schemas.TransactionType.EXPENSE,
                    models.Transaction.date >= start_date,
                    models.Transaction.date <= end_date
                )
            )
        )

        booking_result = booking_income.first()
        transaction_result = transaction_income.first()
        expenses_result = expenses.first()

        total_income = (booking_result.total or Decimal('0')) + (transaction_result.total or Decimal('0'))
        official_income = (booking_result.official or Decimal('0')) + (transaction_result.official or Decimal('0'))
        total_expenses = expenses_result.total or Decimal('0')

        return {
            "total_income": float(total_income),
            "official_income": float(official_income),
            "unofficial_income": float(total_income - official_income),
            "total_expenses": float(total_expenses),
            "official_expenses": float(expenses_result.official or 0),
            "deductible_expenses": float(expenses_result.deductible or 0),
            "non_deductible_expenses": float(total_expenses - (expenses_result.deductible or 0)),
            "net_profit": float(total_income - total_expenses),
            "taxable_profit": float(official_income - (expenses_result.deductible or 0)),
            "booking_count": booking_result.count or 0,
            "transaction_count": transaction_result.count or 0,
            "expense_count": expenses_result.count or 0
        }

    @staticmethod
    async def get_income_by_category(
            db: AsyncSession,
            user_id: int,
            start_date: date,
            end_date: date
    ) -> List[Dict]:
        """Доходы по категориям"""
        # Бронирования как одна категория
        booking_income = await db.execute(
            select(
                func.sum(models.Booking.total_amount).label("amount"),
                func.sum(models.Booking.official_amount).label("official")
            ).where(
                and_(
                    models.Booking.user_id == user_id,
                    models.Booking.status == "confirmed",
                    models.Booking.check_in >= start_date,
                    models.Booking.check_in <= end_date
                )
            )
        )

        # Транзакции по категориям
        transaction_income = await db.execute(
            select(
                models.Transaction.category,
                func.sum(models.Transaction.amount).label("total"),
                func.sum(models.Transaction.official_amount).label("official")
            ).where(
                and_(
                    models.Transaction.user_id == user_id,
                    models.Transaction.transaction_type == schemas.TransactionType.INCOME,
                    models.Transaction.date >= start_date,
                    models.Transaction.date <= end_date
                )
            ).group_by(models.Transaction.category)
        )

        booking_result = booking_income.first()
        transaction_results = transaction_income.all()

        categories = []

        # Добавляем бронирования как категорию
        if booking_result.amount:
            categories.append({
                "category": "Бронирования",
                "total": float(booking_result.amount),
                "official": float(booking_result.official or booking_result.amount),
                "percentage": 100.0  # будет пересчитано позже
            })

        # Добавляем транзакции по категориям
        for category, total, official in transaction_results:
            categories.append({
                "category": category,
                "total": float(total),
                "official": float(official or total),
                "percentage": 0.0
            })

        # Рассчитываем проценты
        total_sum = sum(cat["total"] for cat in categories)
        for cat in categories:
            if total_sum > 0:
                cat["percentage"] = round((cat["total"] / total_sum) * 100, 1)

        return categories

    @staticmethod
    async def get_expenses_by_category(
            db: AsyncSession,
            user_id: int,
            start_date: date,
            end_date: date
    ) -> List[Dict]:
        """Расходы по категориям"""
        expenses = await db.execute(
            select(
                models.Transaction.category,
                func.sum(models.Transaction.amount).label("total"),
                func.sum(models.Transaction.official_amount).label("official"),
                func.sum(
                    case(
                        (models.Transaction.is_tax_deductible == True, models.Transaction.amount),
                        else_=0
                    )
                ).label("deductible")
            ).where(
                and_(
                    models.Transaction.user_id == user_id,
                    models.Transaction.transaction_type == schemas.TransactionType.EXPENSE,
                    models.Transaction.date >= start_date,
                    models.Transaction.date <= end_date
                )
            ).group_by(models.Transaction.category)
        )

        results = expenses.all()

        categories = []
        for category, total, official, deductible in results:
            categories.append({
                "category": category,
                "total": float(total),
                "official": float(official or total),
                "deductible": float(deductible or 0),
                "non_deductible": float(total - (deductible or 0)),
                "percentage": 0.0
            })

        # Рассчитываем проценты
        total_sum = sum(cat["total"] for cat in categories)
        for cat in categories:
            if total_sum > 0:
                cat["percentage"] = round((cat["total"] / total_sum) * 100, 1)

        return categories

    @staticmethod
    async def get_monthly_trend(
            db: AsyncSession,
            user_id: int,
            year: int
    ) -> List[Dict]:
        """Тренды по месяцам за год"""
        monthly_data = []

        for month in range(1, 13):
            month_start = date(year, month, 1)
            if month == 12:
                month_end = date(year + 1, 1, 1) - timedelta(days=1)
            else:
                month_end = date(year, month + 1, 1) - timedelta(days=1)

            overview = await FinanceService.get_financial_overview(
                db, user_id, month_start, month_end
            )

            monthly_data.append({
                "month": month,
                "month_name": month_start.strftime("%b"),
                "total_income": overview["total_income"],
                "official_income": overview["official_income"],
                "total_expenses": overview["total_expenses"],
                "net_profit": overview["net_profit"]
            })

        return monthly_data