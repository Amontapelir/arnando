from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import List
from datetime import datetime

import os
import sys
import locale

"""
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
cd frontend
python -m http.server 3000
backend/app/auth.py
"""

# Установка кодировки UTF-8 для Windows
if sys.platform == "win32":
    os.environ['PYTHONUTF8'] = '1'
    os.environ['NLS_LANG'] = 'RUSSIAN_RUSSIA.UTF8'
    if hasattr(sys, 'setdefaultencoding'):
        sys.setdefaultencoding('utf-8')

    # Принудительная установка локали
    locale.setlocale(locale.LC_ALL, 'ru_RU.UTF-8')

from . import crud, models, schemas, auth
from .database import SessionLocal, engine
from .config import settings

print("🔄 Инициализация приложения...")

# models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Rent Tax API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080"
        "https://amontapelir.github.io/arnando/",
    ],


    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
async def root():
    return {"message": "Rent Tax API is running!", "status": "healthy"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.post("/token", response_model=schemas.Token)
async def login_for_access_token(form_data: auth.OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    try:
        user = auth.authenticate_user(db, form_data.username, form_data.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = auth.create_access_token(
            data={"sub": user.email}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer"}
    except Exception as e:
        print(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during login"
        )

@app.post("/users/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    try:
        db_user = crud.get_user_by_email(db, email=user.email)
        if db_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        return crud.create_user(db=db, user=user)
    except HTTPException:
        raise
    except Exception as e:
        print(f"User creation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating user"
        )

@app.get("/users/me/", response_model=schemas.User)
async def read_users_me(current_user: schemas.User = Depends(auth.get_current_user)):
    return current_user

# Property endpoints
@app.get("/properties/", response_model=List[schemas.Property])
def read_properties(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: schemas.User = Depends(auth.get_current_user)):
    properties = crud.get_properties(db, user_id=current_user.id, skip=skip, limit=limit)
    return properties

@app.post("/properties/", response_model=schemas.Property)
def create_property(property: schemas.PropertyCreate, db: Session = Depends(get_db), current_user: schemas.User = Depends(auth.get_current_user)):
    return crud.create_property(db=db, property=property, user_id=current_user.id)

@app.get("/properties/{property_id}", response_model=schemas.Property)
def read_property(property_id: int, db: Session = Depends(get_db), current_user: schemas.User = Depends(auth.get_current_user)):
    property = crud.get_property(db, property_id=property_id, user_id=current_user.id)
    if property is None:
        raise HTTPException(status_code=404, detail="Property not found")
    return property

@app.put("/properties/{property_id}", response_model=schemas.Property)
def update_property(property_id: int, property: schemas.PropertyUpdate, db: Session = Depends(get_db), current_user: schemas.User = Depends(auth.get_current_user)):
    return crud.update_property(db, property_id=property_id, property=property, user_id=current_user.id)

@app.delete("/properties/{property_id}")
def delete_property(property_id: int, db: Session = Depends(get_db), current_user: schemas.User = Depends(auth.get_current_user)):
    return crud.delete_property(db, property_id=property_id, user_id=current_user.id)

# Contract endpoints
@app.get("/contracts/", response_model=List[schemas.Contract])
def read_contracts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: schemas.User = Depends(auth.get_current_user)):
    contracts = crud.get_contracts(db, user_id=current_user.id, skip=skip, limit=limit)
    return contracts

@app.post("/contracts/", response_model=schemas.Contract)
def create_contract(contract: schemas.ContractCreate, db: Session = Depends(get_db), current_user: schemas.User = Depends(auth.get_current_user)):
    return crud.create_contract(db=db, contract=contract, user_id=current_user.id)

@app.get("/contracts/{contract_id}", response_model=schemas.Contract)
def read_contract(contract_id: int, db: Session = Depends(get_db), current_user: schemas.User = Depends(auth.get_current_user)):
    contract = crud.get_contract(db, contract_id=contract_id, user_id=current_user.id)
    if contract is None:
        raise HTTPException(status_code=404, detail="Contract not found")
    return contract

@app.put("/contracts/{contract_id}", response_model=schemas.Contract)
def update_contract(contract_id: int, contract: schemas.ContractUpdate, db: Session = Depends(get_db), current_user: schemas.User = Depends(auth.get_current_user)):
    return crud.update_contract(db, contract_id=contract_id, contract=contract, user_id=current_user.id)

@app.delete("/contracts/{contract_id}")
def delete_contract(contract_id: int, db: Session = Depends(get_db), current_user: schemas.User = Depends(auth.get_current_user)):
    return crud.delete_contract(db, contract_id=contract_id, user_id=current_user.id)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
