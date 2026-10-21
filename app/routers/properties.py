from fastapi import APIRouter, Depends, HTTPException, Request, Form
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import date

from app.database import get_db
from app.dependencies import get_current_active_user
from app import crud, schemas, models
from app.templates import templates

router = APIRouter(prefix="/properties", tags=["properties"])


@router.get("", response_class=HTMLResponse)
async def list_properties(
        request: Request,
        current_user: models.User = Depends(get_current_active_user),
        db: AsyncSession = Depends(get_db)
):
    properties = await crud.get_user_properties(db, current_user.id)
    return templates.TemplateResponse(
        "properties/list.html",
        {
            "request": request,
            "user": current_user,
            "properties": properties
        }
    )


@router.get("/new", response_class=HTMLResponse)
async def new_property_form(
        request: Request,
        current_user: models.User = Depends(get_current_active_user)
):
    return templates.TemplateResponse(
        "properties/new.html",
        {
            "request": request,
            "user": current_user
        }
    )


@router.post("", response_class=HTMLResponse)
async def create_property(
        request: Request,
        name: str = Form(...),
        address: str = Form(None),
        property_type: str = Form("квартира"),
        base_price: float = Form(...),
        current_user: models.User = Depends(get_current_active_user),
        db: AsyncSession = Depends(get_db)
):
    property_create = schemas.PropertyCreate(
        name=name,
        address=address,
        property_type=property_type,
        base_price=base_price
    )

    await crud.create_property(db, property_create, current_user.id)
    return RedirectResponse(url="/properties", status_code=303)


@router.get("/{property_id}", response_class=HTMLResponse)
async def get_property_detail(
        request: Request,
        property_id: int,
        current_user: models.User = Depends(get_current_active_user),
        db: AsyncSession = Depends(get_db)
):
    property = await crud.get_property(db, property_id, current_user.id)
    if not property:
        raise HTTPException(status_code=404, detail="Объект не найден")

    # Получаем бронирования для этого объекта
    bookings = await crud.get_property_bookings(db, property_id, current_user.id)

    return templates.TemplateResponse(
        "properties/detail.html",
        {
            "request": request,
            "user": current_user,
            "property": property,
            "bookings": bookings
        }
    )