from datetime import date, timedelta
from decimal import Decimal
from typing import List, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func

from app import models, schemas


class BookingService:

    @staticmethod
    async def check_date_conflicts(
            db: AsyncSession,
            property_id: int,
            check_in: date,
            check_out: date,
            exclude_booking_id: Optional[int] = None
    ) -> bool:
        """Проверяет, есть ли конфликты с существующими бронированиями"""
        query = select(models.Booking).where(
            and_(
                models.Booking.property_id == property_id,
                models.Booking.status == "confirmed",
                or_(
                    and_(
                        models.Booking.check_in < check_out,
                        models.Booking.check_out > check_in
                    )
                )
            )
        )

        if exclude_booking_id:
            query = query.where(models.Booking.id != exclude_booking_id)

        result = await db.execute(query)
        return result.scalar_one_or_none() is not None

    @staticmethod
    async def calculate_booking_amount(
            base_price: Decimal,
            check_in: date,
            check_out: date
    ) -> Decimal:
        """Рассчитывает стоимость бронирования"""
        days = (check_out - check_in).days
        if days < 1:
            days = 1
        return base_price * Decimal(days)

    @staticmethod
    async def get_calendar_events(
            db: AsyncSession,
            user_id: int,
            start_date: date,
            end_date: date,
            property_id: Optional[int] = None
    ) -> List[Dict]:
        """Возвращает события для календаря"""
        query = select(
            models.Booking,
            models.Property.name.label("property_name")
        ).join(
            models.Property,
            models.Booking.property_id == models.Property.id
        ).where(
            and_(
                models.Booking.user_id == user_id,
                models.Booking.status == "confirmed",
                models.Booking.check_in <= end_date,
                models.Booking.check_out >= start_date
            )
        )

        if property_id:
            query = query.where(models.Booking.property_id == property_id)

        query = query.order_by(models.Booking.check_in)

        result = await db.execute(query)
        bookings = result.all()

        events = []
        for booking, property_name in bookings:
            events.append({
                "id": booking.id,
                "title": f"{booking.guest_name} - {property_name}",
                "start": booking.check_in.isoformat(),
                "end": booking.check_out.isoformat(),
                "allDay": True,
                "color": "#28a745" if booking.official_amount == booking.total_amount else "#6c757d",
                "textColor": "white",
                "extendedProps": {
                    "guest_name": booking.guest_name,
                    "property_name": property_name,
                    "total_amount": float(booking.total_amount),
                    "official_amount": float(booking.official_amount),
                    "unofficial_amount": float(booking.total_amount - booking.official_amount),
                    "status": booking.status
                }
            })

        return events

    @staticmethod
    async def get_booking_statistics(
            db: AsyncSession,
            user_id: int,
            start_date: date,
            end_date: date
    ) -> Dict:
        """Статистика по бронированиям"""
        # Общая статистика
        total_stats = await db.execute(
            select(
                func.count(models.Booking.id).label("total_count"),
                func.sum(models.Booking.total_amount).label("total_income"),
                func.sum(models.Booking.official_amount).label("official_income"),
                func.avg(models.Booking.total_amount).label("avg_amount")
            ).where(
                and_(
                    models.Booking.user_id == user_id,
                    models.Booking.status == "confirmed",
                    models.Booking.check_in >= start_date,
                    models.Booking.check_in <= end_date
                )
            )
        )

        # Статистика по объектам
        property_stats = await db.execute(
            select(
                models.Property.name,
                func.count(models.Booking.id).label("booking_count"),
                func.sum(models.Booking.total_amount).label("total_income"),
                func.sum(models.Booking.official_amount).label("official_income")
            ).join(
                models.Booking,
                models.Booking.property_id == models.Property.id
            ).where(
                and_(
                    models.Booking.user_id == user_id,
                    models.Booking.status == "confirmed",
                    models.Booking.check_in >= start_date,
                    models.Booking.check_in <= end_date
                )
            ).group_by(models.Property.id, models.Property.name)
        )

        total_result = total_stats.first()
        property_results = property_stats.all()

        return {
            "total_bookings": total_result.total_count or 0,
            "total_income": float(total_result.total_income or 0),
            "official_income": float(total_result.official_income or 0),
            "unofficial_income": float((total_result.total_income or 0) - (total_result.official_income or 0)),
            "avg_booking_amount": float(total_result.avg_amount or 0),
            "by_property": [
                {
                    "property_name": name,
                    "booking_count": count,
                    "total_income": float(total_inc),
                    "official_income": float(official_inc)
                }
                for name, count, total_inc, official_inc in property_results
            ]
        }