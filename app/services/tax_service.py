from decimal import Decimal
from datetime import date
from app.schemas import TaxMode, TaxCalculation


class TaxService:
    @staticmethod
    def calculate_tax(
            tax_mode: TaxMode,
            official_income: Decimal,
            deductible_expenses: Decimal = Decimal('0'),
            year: int = None
    ) -> TaxCalculation:
        """Расчёт налога для разных режимов"""

        if year is None:
            year = date.today().year

        if tax_mode == TaxMode.SELF_EMPLOYED:
            # Самозанятый: 4% для физлиц, 6% для ИП
            rate = Decimal('0.04')  # Упрощённо, без учёта ИП
            tax_amount = official_income * rate

            # Проверка лимита (2.4 млн в год)
            annual_limit = Decimal('2400000')
            if official_income > annual_limit:
                tax_amount = annual_limit * rate

            return TaxCalculation(
                tax_mode=tax_mode,
                period_start=date(year, 1, 1),
                period_end=date(year, 12, 31),
                official_income=official_income,
                deductible_expenses=Decimal('0'),
                tax_amount=tax_amount,
                details={
                    "rate": "4%",
                    "limit_used": min(official_income, annual_limit),
                    "annual_limit": annual_limit
                }
            )

        elif tax_mode == TaxMode.USN_INCOME:
            # УСН "Доходы": 6%
            rate = Decimal('0.06')
            tax_amount = official_income * rate

            return TaxCalculation(
                tax_mode=tax_mode,
                period_start=date(year, 1, 1),
                period_end=date(year, 12, 31),
                official_income=official_income,
                deductible_expenses=Decimal('0'),
                tax_amount=tax_amount,
                details={"rate": "6%"}
            )

        elif tax_mode == TaxMode.USN_INCOME_EXPENSE:
            # УСН "Доходы-расходы": 15%
            rate = Decimal('0.15')
            tax_base = max(official_income - deductible_expenses, Decimal('0'))
            tax_amount = tax_base * rate

            # Минимальный налог 1% от доходов
            min_tax = official_income * Decimal('0.01')
            if tax_amount < min_tax:
                tax_amount = min_tax

            return TaxCalculation(
                tax_mode=tax_mode,
                period_start=date(year, 1, 1),
                period_end=date(year, 12, 31),
                official_income=official_income,
                deductible_expenses=deductible_expenses,
                tax_amount=tax_amount,
                details={
                    "rate": "15%",
                    "tax_base": tax_base,
                    "min_tax": min_tax
                }
            )

        else:
            raise ValueError(f"Unknown tax mode: {tax_mode}")

    @staticmethod
    def get_tax_deadlines(year: int, month: int):
        """Возвращает сроки уплаты налогов"""
        deadlines = []

        if month == 1:
            # За январь: до 28 февраля
            deadlines.append({
                "tax": "Налог на профдоход (самозанятые)",
                "deadline": date(year, 2, 28),
                "amount": None
            })

        # УСН авансовые платежи (упрощённо)
        if month in [4, 7, 10]:
            deadlines.append({
                "tax": "Авансовый платёж УСН",
                "deadline": date(year, month, 28),
                "amount": None
            })

        return deadlines