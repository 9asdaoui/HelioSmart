"""
Public Marketplace API — no authentication required.

Exposes vendor-approved products (status='active') enriched with vendor info.
Prefix: /api/v1/marketplace
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.models import Panel, Inverter
from app.models.user import User

router = APIRouter(prefix="/marketplace", tags=["marketplace"])


# ─────────────────────────────────────────────────────────────────────────────
# Response schemas (augmented with vendor info inline)
# ─────────────────────────────────────────────────────────────────────────────

class VendorPublicProfile(BaseModel):
    id: int
    company_name: Optional[str] = None
    email: str

    model_config = {"from_attributes": True}


class MarketplacePanelResponse(BaseModel):
    id: int
    name: str
    product_id: Optional[str] = None
    price: Optional[float] = None
    brand: Optional[str] = None
    panel_rated_power: float
    module_efficiency: Optional[float] = None
    warranty_years: Optional[int] = None
    type: Optional[str] = None
    status: str
    score: float
    vendor: Optional[VendorPublicProfile] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class MarketplaceInverterResponse(BaseModel):
    id: int
    name: str
    product_id: Optional[str] = None
    price: Optional[float] = None
    brand: Optional[str] = None
    nominal_ac_power_kw: float
    efficiency_max: Optional[float] = None
    phase_type: Optional[str] = None
    warranty: Optional[int] = None
    status: str
    vendor: Optional[VendorPublicProfile] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class VendorListingResponse(BaseModel):
    id: int
    company_name: Optional[str] = None
    email: str
    panel_count: int
    inverter_count: int

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────────────────────────────────────
# Panels
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/panels", response_model=List[MarketplacePanelResponse])
def marketplace_panels(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    brand: Optional[str] = None,
    min_power: Optional[float] = None,
    max_power: Optional[float] = None,
    min_efficiency: Optional[float] = None,
    vendor_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """
    Browse active panels in the marketplace.
    Only shows panels with status='active' to the public.
    """
    query = (
        db.query(Panel)
        .options(joinedload(Panel.vendor))
        .filter(Panel.status == "active")
    )

    if brand:
        query = query.filter(Panel.brand.ilike(f"%{brand}%"))
    if min_power is not None:
        query = query.filter(Panel.panel_rated_power >= min_power)
    if max_power is not None:
        query = query.filter(Panel.panel_rated_power <= max_power)
    if min_efficiency is not None:
        query = query.filter(Panel.module_efficiency >= min_efficiency)
    if vendor_id is not None:
        query = query.filter(Panel.vendor_id == vendor_id)

    panels = query.order_by(Panel.score.desc()).offset(skip).limit(limit).all()

    result = []
    for p in panels:
        item = MarketplacePanelResponse.model_validate(p)
        if p.vendor:
            item.vendor = VendorPublicProfile.model_validate(p.vendor)
        result.append(item)
    return result


@router.get("/panels/{panel_id}", response_model=MarketplacePanelResponse)
def marketplace_get_panel(panel_id: int, db: Session = Depends(get_db)):
    panel = (
        db.query(Panel)
        .options(joinedload(Panel.vendor))
        .filter(Panel.id == panel_id, Panel.status == "active")
        .first()
    )
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
    item = MarketplacePanelResponse.model_validate(panel)
    if panel.vendor:
        item.vendor = VendorPublicProfile.model_validate(panel.vendor)
    return item


# ─────────────────────────────────────────────────────────────────────────────
# Inverters
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/inverters", response_model=List[MarketplaceInverterResponse])
def marketplace_inverters(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    brand: Optional[str] = None,
    min_power: Optional[float] = None,
    max_power: Optional[float] = None,
    phase_type: Optional[str] = None,
    vendor_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Browse active inverters in the marketplace."""
    query = (
        db.query(Inverter)
        .options(joinedload(Inverter.vendor))
        .filter(Inverter.status == "active")
    )

    if brand:
        query = query.filter(Inverter.brand.ilike(f"%{brand}%"))
    if min_power is not None:
        query = query.filter(Inverter.nominal_ac_power_kw >= min_power)
    if max_power is not None:
        query = query.filter(Inverter.nominal_ac_power_kw <= max_power)
    if phase_type:
        query = query.filter(Inverter.phase_type == phase_type)
    if vendor_id is not None:
        query = query.filter(Inverter.vendor_id == vendor_id)

    inverters = query.order_by(Inverter.nominal_ac_power_kw.asc()).offset(skip).limit(limit).all()

    result = []
    for inv in inverters:
        item = MarketplaceInverterResponse.model_validate(inv)
        if inv.vendor:
            item.vendor = VendorPublicProfile.model_validate(inv.vendor)
        result.append(item)
    return result


@router.get("/inverters/{inverter_id}", response_model=MarketplaceInverterResponse)
def marketplace_get_inverter(inverter_id: int, db: Session = Depends(get_db)):
    inverter = (
        db.query(Inverter)
        .options(joinedload(Inverter.vendor))
        .filter(Inverter.id == inverter_id, Inverter.status == "active")
        .first()
    )
    if not inverter:
        raise HTTPException(status_code=404, detail="Inverter not found")
    item = MarketplaceInverterResponse.model_validate(inverter)
    if inverter.vendor:
        item.vendor = VendorPublicProfile.model_validate(inverter.vendor)
    return item


# ─────────────────────────────────────────────────────────────────────────────
# Vendors (public directory)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/vendors", response_model=List[VendorListingResponse])
def marketplace_vendors(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """List all active vendors with their public product counts."""
    vendors = (
        db.query(User)
        .filter(User.role == "vendor", User.is_active == True)
        .offset(skip)
        .limit(limit)
        .all()
    )
    result = []
    for v in vendors:
        panel_count = db.query(Panel).filter(
            Panel.vendor_id == v.id, Panel.status == "active"
        ).count()
        inverter_count = db.query(Inverter).filter(
            Inverter.vendor_id == v.id, Inverter.status == "active"
        ).count()
        result.append(VendorListingResponse(
            id=v.id,
            company_name=v.company_name,
            email=v.email,
            panel_count=panel_count,
            inverter_count=inverter_count,
        ))
    return result


@router.get("/vendors/{vendor_id}")
def marketplace_vendor_profile(vendor_id: int, db: Session = Depends(get_db)):
    """Get a vendor's public profile + their active products."""
    vendor = db.query(User).filter(
        User.id == vendor_id, User.role == "vendor", User.is_active == True
    ).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    panels = (
        db.query(Panel)
        .filter(Panel.vendor_id == vendor_id, Panel.status == "active")
        .all()
    )
    inverters = (
        db.query(Inverter)
        .filter(Inverter.vendor_id == vendor_id, Inverter.status == "active")
        .all()
    )

    return {
        "id": vendor.id,
        "company_name": vendor.company_name,
        "email": vendor.email,
        "panels": [MarketplacePanelResponse.model_validate(p) for p in panels],
        "inverters": [MarketplaceInverterResponse.model_validate(inv) for inv in inverters],
    }
