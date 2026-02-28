from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models import Utility, UtilityRateRange
from app.schemas.utility import UtilityCreate, UtilityUpdate, UtilityResponse

router = APIRouter(prefix="/utilities", tags=["Utilities"])


@router.post("/", response_model=UtilityResponse, status_code=201)
def create_utility(utility_data: UtilityCreate, db: Session = Depends(get_db)):
    """Create a new utility company"""
    # Create utility
    utility_dict = utility_data.model_dump(exclude={"rate_ranges"})
    utility = Utility(**utility_dict)
    db.add(utility)
    db.flush()
    
    # Create rate ranges if provided
    if utility_data.rate_ranges:
        for rate_range_data in utility_data.rate_ranges:
            rate_range = UtilityRateRange(
                **rate_range_data.model_dump(),
                utility_id=utility.id
            )
            db.add(rate_range)
    
    db.commit()
    db.refresh(utility)
    return utility


@router.get("/", response_model=List[UtilityResponse])
def list_utilities(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    state: Optional[str] = None,
    city: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List all utility companies with optional filtering"""
    query = db.query(Utility)
    
    if state:
        query = query.filter(Utility.state.ilike(f"%{state}%"))
    
    if city:
        query = query.filter(Utility.city.ilike(f"%{city}%"))
    
    utilities = query.order_by(Utility.name).offset(skip).limit(limit).all()
    return utilities


@router.get("/{utility_id}", response_model=UtilityResponse)
def get_utility(utility_id: int, db: Session = Depends(get_db)):
    """Get a specific utility by ID"""
    utility = db.query(Utility).filter(Utility.id == utility_id).first()
    
    if not utility:
        raise HTTPException(status_code=404, detail="Utility not found")
    
    return utility


@router.put("/{utility_id}", response_model=UtilityResponse)
def update_utility(
    utility_id: int,
    utility_data: UtilityUpdate,
    db: Session = Depends(get_db)
):
    """Update a utility"""
    utility = db.query(Utility).filter(Utility.id == utility_id).first()
    
    if not utility:
        raise HTTPException(status_code=404, detail="Utility not found")
    
    update_data = utility_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(utility, field, value)
    
    db.commit()
    db.refresh(utility)
    return utility


@router.delete("/{utility_id}", status_code=204)
def delete_utility(utility_id: int, db: Session = Depends(get_db)):
    """Delete a utility"""
    utility = db.query(Utility).filter(Utility.id == utility_id).first()
    
    if not utility:
        raise HTTPException(status_code=404, detail="Utility not found")
    
    db.delete(utility)
    db.commit()
    
    return None
