from sqlalchemy.orm import Session
from . import models, schemas
from .auth import get_password_hash

# User CRUD
def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.User).offset(skip).limit(limit).all()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        hashed_password=hashed_password,
        full_name=user.full_name,
        landlord_type=user.landlord_type
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(db: Session, user_id: int, user: schemas.UserUpdate):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user:
        update_data = user.dict(exclude_unset=True)
        if 'password' in update_data:
            hashed_password = get_password_hash(update_data['password'])
            update_data['hashed_password'] = hashed_password
            del update_data['password']
        for field, value in update_data.items():
            setattr(db_user, field, value)
        db.commit()
        db.refresh(db_user)
    return db_user

# Property CRUD
def get_properties(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Property).filter(models.Property.user_id == user_id).offset(skip).limit(limit).all()

def get_property(db: Session, property_id: int, user_id: int):
    return db.query(models.Property).filter(models.Property.id == property_id, models.Property.user_id == user_id).first()

def create_property(db: Session, property: schemas.PropertyCreate, user_id: int):
    db_property = models.Property(**property.dict(), user_id=user_id)
    db.add(db_property)
    db.commit()
    db.refresh(db_property)
    return db_property

def update_property(db: Session, property_id: int, property: schemas.PropertyUpdate, user_id: int):
    db_property = db.query(models.Property).filter(models.Property.id == property_id, models.Property.user_id == user_id).first()
    if db_property:
        for field, value in property.dict(exclude_unset=True).items():
            setattr(db_property, field, value)
        db.commit()
        db.refresh(db_property)
    return db_property

def delete_property(db: Session, property_id: int, user_id: int):
    db_property = db.query(models.Property).filter(models.Property.id == property_id, models.Property.user_id == user_id).first()
    if db_property:
        db.delete(db_property)
        db.commit()
    return db_property

# Contract CRUD
def get_contracts(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Contract).filter(models.Contract.user_id == user_id).offset(skip).limit(limit).all()

def get_contract(db: Session, contract_id: int, user_id: int):
    return db.query(models.Contract).filter(models.Contract.id == contract_id, models.Contract.user_id == user_id).first()

def create_contract(db: Session, contract: schemas.ContractCreate, user_id: int):
    db_contract = models.Contract(**contract.dict(), user_id=user_id)
    db.add(db_contract)
    db.commit()
    db.refresh(db_contract)
    return db_contract

def update_contract(db: Session, contract_id: int, contract: schemas.ContractUpdate, user_id: int):
    db_contract = db.query(models.Contract).filter(models.Contract.id == contract_id, models.Contract.user_id == user_id).first()
    if db_contract:
        for field, value in contract.dict(exclude_unset=True).items():
            setattr(db_contract, field, value)
        db.commit()
        db.refresh(db_contract)
    return db_contract

def delete_contract(db: Session, contract_id: int, user_id: int):
    db_contract = db.query(models.Contract).filter(models.Contract.id == contract_id, models.Contract.user_id == user_id).first()
    if db_contract:
        db.delete(db_contract)
        db.commit()
    return db_contract