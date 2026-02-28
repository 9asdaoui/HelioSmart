from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models import Inverter
from app.schemas.inverter import InverterCreate, InverterUpdate, InverterResponse

router = APIRouter(prefix="/inverters", tags=["Inverters"])


@router.post("/", response_model=InverterResponse, status_code=201)
def create_inverter(inverter_data: InverterCreate, db: Session = Depends(get_db)):
    """Create a new inverter"""
    inverter = Inverter(**inverter_data.model_dump())
    db.add(inverter)
    db.commit()
    db.refresh(inverter)
    return inverter


@router.get("/", response_model=List[InverterResponse])
def list_inverters(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    status: Optional[str] = None,
    brand: Optional[str] = None,
    min_power: Optional[float] = None,
    max_power: Optional[float] = None,
    db: Session = Depends(get_db)
):
    """List all inverters with optional filtering"""
    query = db.query(Inverter)
    
    if status:
        query = query.filter(Inverter.status == status)
    
    if brand:
        query = query.filter(Inverter.brand.ilike(f"%{brand}%"))
    
    if min_power is not None:
        query = query.filter(Inverter.nominal_ac_power_kw >= min_power)
    
    if max_power is not None:
        query = query.filter(Inverter.nominal_ac_power_kw <= max_power)
    
    inverters = query.order_by(Inverter.nominal_ac_power_kw).offset(skip).limit(limit).all()
    return inverters


@router.get("/{inverter_id}", response_model=InverterResponse)
def get_inverter(inverter_id: int, db: Session = Depends(get_db)):
    """Get a specific inverter by ID"""
    inverter = db.query(Inverter).filter(Inverter.id == inverter_id).first()
    
    if not inverter:
        raise HTTPException(status_code=404, detail="Inverter not found")
    
    return inverter


@router.put("/{inverter_id}", response_model=InverterResponse)
def update_inverter(
    inverter_id: int,
    inverter_data: InverterUpdate,
    db: Session = Depends(get_db)
):
    """Update an inverter"""
    inverter = db.query(Inverter).filter(Inverter.id == inverter_id).first()
    
    if not inverter:
        raise HTTPException(status_code=404, detail="Inverter not found")
    
    update_data = inverter_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(inverter, field, value)
    
    db.commit()
    db.refresh(inverter)
    return inverter


@router.delete("/{inverter_id}", status_code=204)
def delete_inverter(inverter_id: int, db: Session = Depends(get_db)):
    """Delete an inverter"""
    inverter = db.query(Inverter).filter(Inverter.id == inverter_id).first()
    
    if not inverter:
        raise HTTPException(status_code=404, detail="Inverter not found")
    
    db.delete(inverter)
    db.commit()
    
    return None
