from pydantic import BaseModel, EmailStr, validator
from datetime import date, datetime
from typing import Optional, Dict, Any, List
import re


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    landlord_type: str = 'self_employed'


class UserCreate(UserBase):
    password: str

    @validator('password')
    def password_strength(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
        return v


class UserUpdate(UserBase):
    password: Optional[str] = None


class User(UserBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class PropertyBase(BaseModel):
    name: str
    address: str
    type: str = 'apartment'
    base_rent_rate: float
    area: Optional[float] = None
    rooms: Optional[int] = None
    description: Optional[str] = None

class PropertyCreate(PropertyBase):
    pass

class PropertyUpdate(PropertyBase):
    pass

class Property(PropertyBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ContractBase(BaseModel):
    property_id: int
    tenant_name: str
    tenant_type: str = 'physical'
    start_date: date
    end_date: date
    rent_amount: float
    payment_schedule: str = 'monthly'
    is_active: bool = True
    tenant_info: Optional[Dict[str, Any]] = None
    additional_terms: Optional[Dict[str, Any]] = None

class ContractCreate(ContractBase):
    pass

class ContractUpdate(ContractBase):
    pass

class Contract(ContractBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class PaymentBase(BaseModel):
    contract_id: int
    amount: float
    date: date

class PaymentCreate(PaymentBase):
    pass

class PaymentUpdate(PaymentBase):
    pass

class Payment(PaymentBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class ExpenseBase(BaseModel):
    property_id: int
    amount: float
    description: Optional[str] = None
    date: date

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseUpdate(ExpenseBase):
    pass

class Expense(ExpenseBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationBase(BaseModel):
    type: str
    title: str
    message: str
    priority: str = 'medium'
    action: Optional[Dict[str, Any]] = None
    read: bool = False

class NotificationCreate(NotificationBase):
    pass

class NotificationUpdate(NotificationBase):
    pass

class Notification(NotificationBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None