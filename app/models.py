from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, Numeric, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class TaxMode(str, enum.Enum):
    SELF_EMPLOYED = "self_employed"  # Самозанятый
    USN_INCOME = "usn_income"  # УСН "Доходы"
    USN_INCOME_EXPENSE = "usn_income_expense"  # УСН "Доходы-расходы"


class TransactionType(str, enum.Enum):
    INCOME = "income"
    EXPENSE = "expense"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    phone = Column(String)
    tax_mode = Column(Enum(TaxMode), default=TaxMode.SELF_EMPLOYED)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    properties = relationship("Property", back_populates="owner")
    transactions = relationship("Transaction", back_populates="user")
    bookings = relationship("Booking", back_populates="user")


class Property(Base):
    __tablename__ = "properties"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String, nullable=False)
    address = Column(String)
    property_type = Column(String)  # квартира, дом, комната
    base_price = Column(Numeric(10, 2), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    owner = relationship("User", back_populates="properties")
    bookings = relationship("Booking", back_populates="property")
    transactions = relationship("Transaction", back_populates="property")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    guest_name = Column(String, nullable=False)
    guest_contact = Column(String)
    check_in = Column(Date, nullable=False)
    check_out = Column(Date, nullable=False)
    total_amount = Column(Numeric(10, 2), nullable=False)
    official_amount = Column(Numeric(10, 2), nullable=False)  # Для налогов
    notes = Column(String)
    status = Column(String, default="confirmed")  # confirmed, cancelled, completed
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    property = relationship("Property", back_populates="bookings")
    user = relationship("User", back_populates="bookings")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=True)
    transaction_type = Column(Enum(TransactionType), nullable=False)
    category = Column(String, nullable=False)  # уборка, коммуналка, ремонт и т.д.
    description = Column(String)
    amount = Column(Numeric(10, 2), nullable=False)
    official_amount = Column(Numeric(10, 2), nullable=False)  # Для налогов
    is_tax_deductible = Column(Boolean, default=False)  # Для расходов при УСН "Доходы-расходы"
    date = Column(Date, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="transactions")
    property = relationship("Property", back_populates="transactions")


class TaxPayment(Base):
    __tablename__ = "tax_payments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    tax_mode = Column(Enum(TaxMode), nullable=False)
    period = Column(String)  # ГГГГ-ММ
    official_income = Column(Numeric(10, 2))
    deductible_expenses = Column(Numeric(10, 2))
    tax_amount = Column(Numeric(10, 2))
    paid = Column(Boolean, default=False)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())