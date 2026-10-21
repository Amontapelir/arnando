# app/__init__.py
from .config import settings
from .database import Base, engine, get_db
from .models import User, Property, Booking, Transaction, TaxPayment
from .schemas import *
from .auth import *
from .crud import *
from .dependencies import *

# Можно также добавить для удобства
__all__ = [
    'settings',
    'Base', 'engine', 'get_db',
    'User', 'Property', 'Booking', 'Transaction', 'TaxPayment',
]