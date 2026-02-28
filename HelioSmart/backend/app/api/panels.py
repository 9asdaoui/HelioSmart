from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models import Panel
from app.schemas.panel import PanelCreate, PanelUpdate, PanelResponse

router = APIRouter(prefix="/panels", tags=["Panels"])


@router.post("/", response_model=PanelResponse, status_code=201)
def create_panel(panel_data: PanelCreate, db: Session = Depends(get_db)):
    """Create a new solar panel"""
    panel = Panel(**panel_data.model_dump())
    db.add(panel)
    db.commit()
    db.refresh(panel)
    return panel


@router.get("/", response_model=List[PanelResponse])
def list_panels(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    status: Optional[str] = None,
    brand: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List all solar panels with optional filtering"""
    query = db.query(Panel)
    
    if status:
        query = query.filter(Panel.status == status)
    
    if brand:
        query = query.filter(Panel.brand.ilike(f"%{brand}%"))
    
    panels = query.order_by(Panel.score.desc()).offset(skip).limit(limit).all()
    return panels


@router.get("/{panel_id}", response_model=PanelResponse)
def get_panel(panel_id: int, db: Session = Depends(get_db)):
    """Get a specific panel by ID"""
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
    
    return panel


@router.put("/{panel_id}", response_model=PanelResponse)
def update_panel(
    panel_id: int,
    panel_data: PanelUpdate,
    db: Session = Depends(get_db)
):
    """Update a panel"""
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
    
    update_data = panel_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(panel, field, value)
    
    db.commit()
    db.refresh(panel)
    return panel


@router.delete("/{panel_id}", status_code=204)
def delete_panel(panel_id: int, db: Session = Depends(get_db)):
    """Delete a panel"""
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
    
    db.delete(panel)
    db.commit()
    
    return None
