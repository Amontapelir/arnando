# app/templates/__init__.py
import os
from fastapi.templating import Jinja2Templates

template_dir = os.path.join(os.path.dirname(__file__))
templates = Jinja2Templates(directory=template_dir)

# Добавляем фильтры (если есть)
try:
    from . import filters
    templates.env.filters["month_name"] = filters.month_name
    templates.env.filters["tax_mode_display"] = filters.tax_mode_display
    templates.env.filters["format_currency"] = filters.format_currency
    templates.env.filters["days_in_month"] = filters.days_in_month
except ImportError:
    pass

# Убираем get_flashed_messages - это функция Flask, в FastAPI её нет
templates.env.globals["get_flashed_messages"] = lambda: []