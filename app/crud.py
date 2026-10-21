from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, case
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import date, timedelta
from decimal import Decimal
import calendar

from app import models, schemas
from app.auth import get_password_hash


# User CRUD
async def get_user_by_email(db: AsyncSession, email: str) -> Optional[models.User]:
    result = await db.execute(
        select(models.User).where(models.User.email == email)
    )
    return result.scalar_one_or_none()


async def create_user(db: AsyncSession, user: schemas.UserCreate) -> models.User:
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        hashed_password=hashed_password,
        full_name=user.full_name,
        phone=user.phone,
        tax_mode=user.tax_mode
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user


async def get_user(db: AsyncSession, user_id: int) -> Optional[models.User]:
    result = await db.execute(
        select(models.User).where(models.User.id == user_id)
    )
    return result.scalar_one_or_none()


# Property CRUD
async def get_user_properties(db: AsyncSession, user_id: int) -> List[models.Property]:
    result = await db.execute(
        select(models.Property)
        .where(models.Property.user_id == user_id)
        .order_by(models.Property.created_at.desc())
    )
    return result.scalars().all()


async def create_property(db: AsyncSession, property: schemas.PropertyCreate, user_id: int) -> models.Property:
    db_property = models.Property(
        **property.model_dump(),
        user_id=user_id
    )
    db.add(db_property)
    await db.commit()
    await db.refresh(db_property)
    return db_property


async def get_property(db: AsyncSession, property_id: int, user_id: int) -> Optional[models.Property]:
    result = await db.execute(
        select(models.Property)
        .where(
            and_(
                models.Property.id == property_id,
                models.Property.user_id == user_id
            )
        )
    )
    return result.scalar_one_or_none()


# Booking CRUD
async def create_booking(db: AsyncSession, booking: schemas.BookingCreate, user_id: int) -> models.Booking:
    # Проверяем, что даты не пересекаются с существующими бронированиями
    existing_bookings = await db.execute(
        select(models.Booking)
        .where(
            and_(
                models.Booking.property_id == booking.property_id,
                models.Booking.status == "confirmed",
                or_(
                    and_(
                        models.Booking.check_in <= booking.check_out,
                        models.Booking.check_out >= booking.check_in
                    )
                )
            )
        )
    )

    if existing_bookings.scalar_one_or_none():
        raise ValueError("Даты пересекаются с существующим бронированием")

    db_booking = models.Booking(
        **booking.model_dump(),
        user_id=user_id
    )
    db.add(db_booking)
    await db.commit()
    await db.refresh(db_booking)
    return db_booking


async def get_property_bookings(
        db: AsyncSession,
        property_id: int,
        user_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
) -> List[models.Booking]:
    query = select(models.Booking).where(
        and_(
            models.Booking.property_id == property_id,
            models.Booking.user_id == user_id
        )
    )

    if start_date:
        query = query.where(models.Booking.check_in >= start_date)
    if end_date:
        query = query.where(models.Booking.check_out <= end_date)

    query = query.order_by(models.Booking.check_in)

    result = await db.execute(query)
    return result.scalars().all()


# Transaction CRUD
async def create_transaction(
        db: AsyncSession,
        transaction: schemas.TransactionCreate,
        user_id: int
) -> models.Transaction:
    db_transaction = models.Transaction(
        **transaction.model_dump(),
        user_id=user_id
    )
    db.add(db_transaction)
    await db.commit()
    await db.refresh(db_transaction)
    return db_transaction


async def get_user_transactions(
        db: AsyncSession,
        user_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        transaction_type: Optional[schemas.TransactionType] = None
) -> List[models.Transaction]:
    query = select(models.Transaction).where(models.Transaction.user_id == user_id)

    if start_date:
        query = query.where(models.Transaction.date >= start_date)
    if end_date:
        query = query.where(models.Transaction.date <= end_date)
    if transaction_type:
        query = query.where(models.Transaction.transaction_type == transaction_type)

    query = query.order_by(models.Transaction.date.desc())

    result = await db.execute(query)
    return result.scalars().all()


# Финансовая аналитика
async def get_financial_summary(
        db: AsyncSession,
        user_id: int,
        start_date: date,
        end_date: date
) -> dict:
    # Доходы из бронирований
    booking_income = await db.execute(
        select(
            func.sum(models.Booking.total_amount).label("total_income"),
            func.sum(models.Booking.official_amount).label("official_income")
        )
        .where(
            and_(
                models.Booking.user_id == user_id,
                models.Booking.check_in >= start_date,
                models.Booking.check_in <= end_date,
                models.Booking.status == "confirmed"
            )
        )
    )

    # Транзакции доходов
    transaction_income = await db.execute(
        select(
            func.sum(models.Transaction.amount).label("total_income"),
            func.sum(models.Transaction.official_amount).label("official_income")
        )
        .where(
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
            func.sum(models.Transaction.amount).label("total_expenses"),
            func.sum(
                models.Transaction.official_amount
            ).label("official_expenses"),
            func.sum(
                case(
                    (models.Transaction.is_tax_deductible == True, models.Transaction.amount),
                    else_=0
                )
            ).label("deductible_expenses")
        )
        .where(
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

    total_income = (booking_result.total_income or Decimal('0')) + (transaction_result.total_income or Decimal('0'))
    official_income = (booking_result.official_income or Decimal('0')) + (
                transaction_result.official_income or Decimal('0'))

    return {
        "total_income": total_income,
        "official_income": official_income,
        "unofficial_income": total_income - official_income,
        "total_expenses": expenses_result.total_expenses or Decimal('0'),
        "official_expenses": expenses_result.official_expenses or Decimal('0'),
        "deductible_expenses": expenses_result.deductible_expenses or Decimal('0'),
        "profit": total_income - (expenses_result.total_expenses or Decimal('0'))
    }