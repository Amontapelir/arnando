from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal
from enum import Enum


# Enums
class TaxMode(str, Enum):
    SELF_EMPLOYED = "self_employed"
    USN_INCOME = "usn_income"
    USN_INCOME_EXPENSE = "usn_income_expense"


class TransactionType(str, Enum):
    INCOME = "income"
    EXPENSE = "expense"


# Base schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    phone: Optional[str] = None
    tax_mode: TaxMode = TaxMode.SELF_EMPLOYED


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=72)  # 🔥 Ограничение 72 символа!


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None


class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class PropertyBase(BaseModel):
    name: str
    address: Optional[str] = None
    property_type: Optional[str] = None
    base_price: Decimal = Field(gt=0, decimal_places=2)


class PropertyCreate(PropertyBase):
    pass


class Property(PropertyBase):
    id: int
    user_id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class BookingBase(BaseModel):
    property_id: int
    guest_name: str
    guest_contact: Optional[str] = None
    check_in: date
    check_out: date
    total_amount: Decimal = Field(gt=0, decimal_places=2)
    official_amount: Decimal = Field(ge=0, decimal_places=2)
    notes: Optional[str] = None

    @validator('official_amount')
    def validate_official_amount(cls, v, values):
        if 'total_amount' in values and v > values['total_amount']:
            raise ValueError('Официальная сумма не может превышать общую сумму')
        return v

    @validator('check_out')
    def validate_dates(cls, v, values):
        if 'check_in' in values and v <= values['check_in']:
            raise ValueError('Дата выезда должна быть позже даты заезда')
        return v


class BookingCreate(BookingBase):
    pass


class Booking(BookingBase):
    id: int
    user_id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class TransactionBase(BaseModel):
    property_id: Optional[int] = None
    transaction_type: TransactionType
    category: str
    description: Optional[str] = None
    amount: Decimal = Field(gt=0, decimal_places=2)
    official_amount: Decimal = Field(ge=0, decimal_places=2)
    is_tax_deductible: bool = False
    date: date

    @validator('official_amount')
    def validate_official_amount(cls, v, values):
        if 'amount' in values and v > values['amount']:
            raise ValueError('Официальная сумма не может превышать общую сумму')
        return v


class TransactionCreate(TransactionBase):
    pass


class Transaction(TransactionBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class TaxCalculation(BaseModel):
    tax_mode: TaxMode
    period_start: date
    period_end: date
    official_income: Decimal
    deductible_expenses: Decimal = Decimal('0')
    tax_amount: Decimal
    details: dict


# Auth
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    user_id: Optional[int] = None