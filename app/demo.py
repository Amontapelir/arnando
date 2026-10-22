"""
Демо-режим: аккаунт с готовыми данными, в который можно войти одной кнопкой.

Данные пересоздаются при каждом старте приложения, поэтому всё, что
посетитель поменяет в демо, исчезнет после перезапуска.
"""
import logging
import random
import secrets
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app import models
from app.auth import get_password_hash
from app.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

DEMO_EMAIL = "demo@arnando.app"

# (название, адрес, тип, цена за ночь)
DEMO_PROPERTIES = [
    ("Студия у метро", "Москва, ул. Профсоюзная, 12", "студия", 3500),
    ("Двушка в центре", "Москва, Покровский бульвар, 4", "квартира", 6500),
    ("Апартаменты с видом", "Санкт-Петербург, наб. Обводного канала, 74", "апартаменты", 5200),
]

GUESTS = [
    "Анна Смирнова", "Игорь Ковалёв", "Мария Белова", "Дмитрий Орлов",
    "Екатерина Лебедева", "Сергей Никитин", "Ольга Морозова", "Павел Соколов",
    "Алексей Волков", "Татьяна Зайцева", "Никита Фёдоров", "Юлия Павлова",
]


def is_demo_user(user) -> bool:
    return bool(user) and getattr(user, "email", None) == DEMO_EMAIL


async def get_demo_user(db: AsyncSession):
    result = await db.execute(select(models.User).where(models.User.email == DEMO_EMAIL))
    return result.scalar_one_or_none()


async def _clear_demo_data(db: AsyncSession) -> None:
    user = await get_demo_user(db)
    if not user:
        return
    for model in (models.Transaction, models.Booking, models.TaxPayment, models.Property):
        await db.execute(delete(model).where(model.user_id == user.id))
    await db.execute(delete(models.User).where(models.User.id == user.id))
    await db.flush()


def _money(value) -> Decimal:
    return Decimal(value).quantize(Decimal("0.01"))


async def seed_demo(db: AsyncSession) -> models.User:
    """Удаляет старый демо-аккаунт и создаёт его заново с данными за ~3 месяца."""
    await _clear_demo_data(db)

    rnd = random.Random(42)
    today = date.today()
    start = today - timedelta(days=80)
    end = today + timedelta(days=35)

    user = models.User(
        email=DEMO_EMAIL,
        # Пароль никому не сообщается: вход только через /demo
        hashed_password=get_password_hash(secrets.token_urlsafe(16)),
        full_name="Демо Пользователь",
        phone="+7 900 000-00-00",
        tax_mode=models.TaxMode.SELF_EMPLOYED,
    )
    db.add(user)
    await db.flush()

    properties = []
    for name, address, ptype, price in DEMO_PROPERTIES:
        prop = models.Property(
            user_id=user.id, name=name, address=address,
            property_type=ptype, base_price=_money(price),
        )
        db.add(prop)
        properties.append(prop)
    await db.flush()

    for prop in properties:
        price = int(prop.base_price)
        day = start + timedelta(days=rnd.randint(0, 3))
        while day < end:
            nights = rnd.randint(2, 6)
            check_out = day + timedelta(days=nights)
            total = price * nights
            # Часть гостей платит наличными без чека — это и есть «неофициальная» сумма
            official = total if rnd.random() < 0.7 else round(total * 0.6, -2)
            if check_out <= today:
                status = "completed"
            elif day <= today:
                status = "confirmed"
            else:
                status = rnd.choice(["confirmed", "confirmed", "pending"])

            db.add(models.Booking(
                property_id=prop.id, user_id=user.id,
                guest_name=rnd.choice(GUESTS),
                guest_contact=f"+7 9{rnd.randint(10, 99)} {rnd.randint(100, 999)}-{rnd.randint(10, 99)}-{rnd.randint(10, 99)}",
                check_in=day, check_out=check_out,
                total_amount=_money(total), official_amount=_money(official),
                status=status,
            ))

            # Доход и уборка — только по уже начавшимся заездам
            if day <= today:
                db.add(models.Transaction(
                    user_id=user.id, property_id=prop.id,
                    transaction_type=models.TransactionType.INCOME,
                    category="аренда", description=f"Оплата проживания, {nights} ноч.",
                    amount=_money(total), official_amount=_money(official),
                    date=day,
                ))
                db.add(models.Transaction(
                    user_id=user.id, property_id=prop.id,
                    transaction_type=models.TransactionType.EXPENSE,
                    category="уборка", description="Уборка после выезда",
                    amount=_money(1500), official_amount=_money(1500),
                    is_tax_deductible=True, date=min(check_out, today),
                ))

            day = check_out + timedelta(days=rnd.randint(0, 4))

        # Ежемесячная коммуналка за прошедшие месяцы
        month = date(start.year, start.month, 1)
        while month < date(today.year, today.month, 1):
            amount = rnd.randint(4000, 7500)
            db.add(models.Transaction(
                user_id=user.id, property_id=prop.id,
                transaction_type=models.TransactionType.EXPENSE,
                category="коммуналка", description="Коммунальные платежи",
                amount=_money(amount), official_amount=_money(amount),
                is_tax_deductible=True, date=month + timedelta(days=9),
            ))
            month = (month + timedelta(days=32)).replace(day=1)

    db.add(models.Transaction(
        user_id=user.id, property_id=properties[1].id,
        transaction_type=models.TransactionType.EXPENSE,
        category="ремонт", description="Замена смесителя на кухне",
        amount=_money(8900), official_amount=_money(8900),
        is_tax_deductible=True, date=today - timedelta(days=40),
    ))
    db.add(models.Transaction(
        user_id=user.id, property_id=properties[0].id,
        transaction_type=models.TransactionType.EXPENSE,
        category="закупки", description="Постельное бельё и полотенца",
        amount=_money(12400), official_amount=_money(12400),
        is_tax_deductible=True, date=today - timedelta(days=25),
    ))

    await db.commit()
    await db.refresh(user)
    return user


async def reset_demo_on_startup() -> None:
    """Вызывается из lifespan. Ошибка в демо не должна ронять приложение."""
    try:
        async with AsyncSessionLocal() as db:
            await seed_demo(db)
        logger.info("Демо-аккаунт %s пересоздан", DEMO_EMAIL)
    except Exception:
        logger.exception("Не удалось пересоздать демо-данные")
