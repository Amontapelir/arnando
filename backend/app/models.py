from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Boolean, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    passport_series = Column(String(4), nullable=True)
    passport_number = Column(String(6), nullable=True)
    passport_issued_by = Column(Text, nullable=True)
    passport_issue_date = Column(Date, nullable=True)
    registration_address = Column(Text, nullable=True)
    inn = Column(String(12), nullable=True)
    snils = Column(String(14), nullable=True)
    phone = Column(String(20), nullable=True)
    bank_name = Column(String, nullable=True)
    bank_account = Column(String(20), nullable=True)
    bik = Column(String(9), nullable=True)
    landlord_type = Column(String, nullable=False, default='self_employed')
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    properties = relationship("Property", back_populates="owner")
    contracts = relationship("Contract", back_populates="user")
    payments = relationship("Payment", back_populates="user")
    expenses = relationship("Expense", back_populates="user")
    notifications = relationship("Notification", back_populates="user")

class Property(Base):
    __tablename__ = "properties"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    address = Column(Text, nullable=False)
    type = Column(String, nullable=False, default='apartment')
    base_rent_rate = Column(Float, nullable=False, default=0.0)
    area = Column(Float, nullable=True)
    rooms = Column(Integer, nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User", back_populates="properties")
    contracts = relationship("Contract", back_populates="property")
    expenses = relationship("Expense", back_populates="property")

class Contract(Base):
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False)
    tenant_name = Column(String, nullable=False)
    tenant_type = Column(String, nullable=False, default='physical')
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    rent_amount = Column(Float, nullable=False, default=0.0)
    payment_schedule = Column(String, nullable=False, default='monthly')
    is_active = Column(Boolean, default=True)
    tenant_info = Column(JSON, nullable=True)
    additional_terms = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="contracts")
    property = relationship("Property", back_populates="contracts")
    payments = relationship("Payment", back_populates="contract")

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    contract_id = Column(Integer, ForeignKey("contracts.id"), nullable=False)
    amount = Column(Float, nullable=False, default=0.0)
    date = Column(Date, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="payments")
    contract = relationship("Contract", back_populates="payments")

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False)
    amount = Column(Float, nullable=False, default=0.0)
    description = Column(Text, nullable=True)
    date = Column(Date, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="expenses")
    property = relationship("Property", back_populates="expenses")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    priority = Column(String, nullable=False, default='medium')
    action = Column(JSON, nullable=True)
    read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="notifications")