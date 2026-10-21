from datetime import date
import calendar

def month_name(month_num):
    """Возвращает название месяца на русском"""
    months = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ]
    return months[month_num - 1] if 1 <= month_num <= 12 else ''

def tax_mode_display(mode):
    """Отображает режим налогообложения на русском"""
    modes = {
        'self_employed': 'Самозанятый (4%/6%)',
        'usn_income': 'УСН "Доходы" (6%)',
        'usn_income_expense': 'УСН "Доходы-расходы" (15%)'
    }
    return modes.get(mode, mode)

def format_currency(value):
    """Форматирует число как валюту"""
    if value is None:
        return "0.00"
    return f"{float(value):,.2f}".replace(',', ' ').replace('.', ',')

def days_in_month(year, month):
    """Возвращает количество дней в месяце"""
    return calendar.monthrange(year, month)[1]