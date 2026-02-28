from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import json
from app.core.database import get_db
from app.models import Estimation
from app.schemas.estimation import (
    EstimationCreate,
    EstimationUpdate,
    EstimationResponse,
    EstimationListResponse,
)

router = APIRouter(prefix="/estimations", tags=["Estimations"])


@router.post("/", response_model=EstimationResponse, status_code=201)
def create_estimation(
    estimation_data: EstimationCreate,
    db: Session = Depends(get_db)
):
    """Create a new solar estimation"""
    estimation = Estimation(**estimation_data.model_dump())
    db.add(estimation)
    db.commit()
    db.refresh(estimation)
    return estimation


@router.get("/", response_model=EstimationListResponse)
def list_estimations(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List all estimations with optional filtering"""
    query = db.query(Estimation).filter(Estimation.deleted_at.is_(None))
    
    if status:
        query = query.filter(Estimation.status == status)
    
    total = query.count()
    estimations = query.order_by(Estimation.created_at.desc()).offset(skip).limit(limit).all()
    
    return {
        "total": total,
        "estimations": estimations
    }


@router.get("/{estimation_id}", response_model=EstimationResponse)
def get_estimation(estimation_id: int, db: Session = Depends(get_db)):
    """Get a specific estimation by ID"""
    estimation = db.query(Estimation).filter(
        Estimation.id == estimation_id,
        Estimation.deleted_at.is_(None)
    ).first()
    
    if not estimation:
        raise HTTPException(status_code=404, detail="Estimation not found")
    
    # Parse JSON string fields into dictionaries
    json_fields = ['monthly_usage', 'monthly_cost', 'dc_monthly', 'poa_monthly', 
                   'solrad_monthly', 'ac_monthly', 'roof_polygon', 'usable_polygon',
                   'sam_masks', 'panel_grid', 'panel_positions', 'inverter_design',
                   'inverter_combos', 'stringing_details']
    
    for field in json_fields:
        value = getattr(estimation, field, None)
        if value and isinstance(value, str):
            try:
                setattr(estimation, field, json.loads(value))
            except (json.JSONDecodeError, TypeError):
                pass
    
    return estimation


@router.put("/{estimation_id}", response_model=EstimationResponse)
def update_estimation(
    estimation_id: int,
    estimation_data: EstimationUpdate,
    db: Session = Depends(get_db)
):
    """Update an estimation"""
    estimation = db.query(Estimation).filter(
        Estimation.id == estimation_id,
        Estimation.deleted_at.is_(None)
    ).first()
    
    if not estimation:
        raise HTTPException(status_code=404, detail="Estimation not found")
    
    # Update only provided fields
    update_data = estimation_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(estimation, field, value)
    
    db.commit()
    db.refresh(estimation)
    return estimation


@router.delete("/{estimation_id}", status_code=204)
def delete_estimation(estimation_id: int, db: Session = Depends(get_db)):
    """Soft delete an estimation"""
    estimation = db.query(Estimation).filter(
        Estimation.id == estimation_id,
        Estimation.deleted_at.is_(None)
    ).first()
    
    if not estimation:
        raise HTTPException(status_code=404, detail="Estimation not found")
    
    from datetime import datetime
    estimation.deleted_at = datetime.now()
    db.commit()
    
    return None
