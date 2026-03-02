"""
Vendor Portal — protected endpoints for vendors to manage their own products.

All routes require a valid JWT with role='vendor' or 'admin'.
Prefix: /api/v1/vendor
"""
from fastapi import APIRouter, Body, Depends, HTTPException, Query, UploadFile, File, Form, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Any, Dict, List, Optional

from app.core.database import get_db
from app.core.security import get_current_vendor, get_current_user
from app.models import Panel, Inverter
from app.models.user import User
from app.schemas.panel import PanelCreate, PanelUpdate, PanelResponse
from app.schemas.inverter import InverterCreate, InverterUpdate, InverterResponse
from app.schemas.user import UserResponse
from app.services.llm_inventory_service import LLMInventoryService

router = APIRouter(prefix="/vendor", tags=["vendor"])


# ─────────────────────────────────────────────────────────────────────────────
# Vendor profile
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/profile", response_model=UserResponse)
def get_vendor_profile(current_vendor: User = Depends(get_current_vendor)):
    """Return the authenticated vendor's profile."""
    return current_vendor


@router.patch("/profile", response_model=UserResponse)
def update_vendor_profile(
    company_name: Optional[str] = None,
    db: Session = Depends(get_db),
    current_vendor: User = Depends(get_current_vendor),
):
    """Update vendor company name."""
    if company_name is not None:
        current_vendor.company_name = company_name
        db.commit()
        db.refresh(current_vendor)
    return current_vendor


# ─────────────────────────────────────────────────────────────────────────────
# Vendor — Panels
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/panels", response_model=PanelResponse, status_code=status.HTTP_201_CREATED)
def vendor_create_panel(
    panel_data: PanelCreate,
    db: Session = Depends(get_db),
    current_vendor: User = Depends(get_current_vendor),
):
    """Submit a new panel to the marketplace (pending admin approval optional)."""
    data = panel_data.model_dump()
    data["vendor_id"] = current_vendor.id
    data["status"] = "pending"   # admin approves before it becomes "active"
    panel = Panel(**data)
    db.add(panel)
    db.commit()
    db.refresh(panel)
    return panel


@router.get("/panels", response_model=List[PanelResponse])
def vendor_list_panels(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    current_vendor: User = Depends(get_current_vendor),
):
    """List all panels belonging to this vendor (any status)."""
    panels = (
        db.query(Panel)
        .filter(Panel.vendor_id == current_vendor.id)
        .order_by(Panel.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return panels


@router.get("/panels/{panel_id}", response_model=PanelResponse)
def vendor_get_panel(
    panel_id: int,
    db: Session = Depends(get_db),
    current_vendor: User = Depends(get_current_vendor),
):
    panel = db.query(Panel).filter(
        Panel.id == panel_id, Panel.vendor_id == current_vendor.id
    ).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
    return panel


@router.put("/panels/{panel_id}", response_model=PanelResponse)
def vendor_update_panel(
    panel_id: int,
    panel_data: PanelUpdate,
    db: Session = Depends(get_db),
    current_vendor: User = Depends(get_current_vendor),
):
    """Update a panel. Resets status to 'pending' so admin re-approves."""
    panel = db.query(Panel).filter(
        Panel.id == panel_id, Panel.vendor_id == current_vendor.id
    ).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")

    update_data = panel_data.model_dump(exclude_unset=True)
    update_data.pop("vendor_id", None)     # vendor cannot re-assign ownership
    update_data["status"] = "pending"      # reset to pending after edit
    for field, value in update_data.items():
        setattr(panel, field, value)

    db.commit()
    db.refresh(panel)
    return panel


@router.delete("/panels/{panel_id}", status_code=status.HTTP_204_NO_CONTENT)
def vendor_delete_panel(
    panel_id: int,
    db: Session = Depends(get_db),
    current_vendor: User = Depends(get_current_vendor),
):
    panel = db.query(Panel).filter(
        Panel.id == panel_id, Panel.vendor_id == current_vendor.id
    ).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
    db.delete(panel)
    db.commit()


# ─────────────────────────────────────────────────────────────────────────────
# Vendor — Inverters
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/inverters", response_model=InverterResponse, status_code=status.HTTP_201_CREATED)
def vendor_create_inverter(
    inverter_data: InverterCreate,
    db: Session = Depends(get_db),
    current_vendor: User = Depends(get_current_vendor),
):
    """Submit a new inverter to the marketplace."""
    data = inverter_data.model_dump()
    data["vendor_id"] = current_vendor.id
    data["status"] = "pending"
    inverter = Inverter(**data)
    db.add(inverter)
    db.commit()
    db.refresh(inverter)
    return inverter


@router.get("/inverters", response_model=List[InverterResponse])
def vendor_list_inverters(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    current_vendor: User = Depends(get_current_vendor),
):
    """List all inverters belonging to this vendor."""
    inverters = (
        db.query(Inverter)
        .filter(Inverter.vendor_id == current_vendor.id)
        .order_by(Inverter.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return inverters


@router.get("/inverters/{inverter_id}", response_model=InverterResponse)
def vendor_get_inverter(
    inverter_id: int,
    db: Session = Depends(get_db),
    current_vendor: User = Depends(get_current_vendor),
):
    inverter = db.query(Inverter).filter(
        Inverter.id == inverter_id, Inverter.vendor_id == current_vendor.id
    ).first()
    if not inverter:
        raise HTTPException(status_code=404, detail="Inverter not found")
    return inverter


@router.put("/inverters/{inverter_id}", response_model=InverterResponse)
def vendor_update_inverter(
    inverter_id: int,
    inverter_data: InverterUpdate,
    db: Session = Depends(get_db),
    current_vendor: User = Depends(get_current_vendor),
):
    inverter = db.query(Inverter).filter(
        Inverter.id == inverter_id, Inverter.vendor_id == current_vendor.id
    ).first()
    if not inverter:
        raise HTTPException(status_code=404, detail="Inverter not found")

    update_data = inverter_data.model_dump(exclude_unset=True)
    update_data.pop("vendor_id", None)
    update_data["status"] = "pending"
    for field, value in update_data.items():
        setattr(inverter, field, value)

    db.commit()
    db.refresh(inverter)
    return inverter


@router.delete("/inverters/{inverter_id}", status_code=status.HTTP_204_NO_CONTENT)
def vendor_delete_inverter(
    inverter_id: int,
    db: Session = Depends(get_db),
    current_vendor: User = Depends(get_current_vendor),
):
    inverter = db.query(Inverter).filter(
        Inverter.id == inverter_id, Inverter.vendor_id == current_vendor.id
    ).first()
    if not inverter:
        raise HTTPException(status_code=404, detail="Inverter not found")
    db.delete(inverter)
    db.commit()


# ─────────────────────────────────────────────────────────────────────────────
# Admin — approve / reject vendor submissions
# ─────────────────────────────────────────────────────────────────────────────

@router.patch("/admin/panels/{panel_id}/approve", response_model=PanelResponse, tags=["admin"])
def admin_approve_panel(
    panel_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admin: set panel status to 'active'."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
    panel.status = "active"
    db.commit()
    db.refresh(panel)
    return panel


@router.patch("/admin/panels/{panel_id}/reject", response_model=PanelResponse, tags=["admin"])
def admin_reject_panel(
    panel_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admin: set panel status to 'rejected'."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
    panel.status = "rejected"
    db.commit()
    db.refresh(panel)
    return panel


@router.patch("/admin/inverters/{inverter_id}/approve", response_model=InverterResponse, tags=["admin"])
def admin_approve_inverter(
    inverter_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admin: set inverter status to 'active'."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    inverter = db.query(Inverter).filter(Inverter.id == inverter_id).first()
    if not inverter:
        raise HTTPException(status_code=404, detail="Inverter not found")
    inverter.status = "active"
    db.commit()
    db.refresh(inverter)
    return inverter


@router.patch("/admin/inverters/{inverter_id}/reject", response_model=InverterResponse, tags=["admin"])
def admin_reject_inverter(
    inverter_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admin: set inverter status to 'rejected'."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    inverter = db.query(Inverter).filter(Inverter.id == inverter_id).first()
    if not inverter:
        raise HTTPException(status_code=404, detail="Inverter not found")
    inverter.status = "rejected"
    db.commit()
    db.refresh(inverter)
    return inverter


# ─────────────────────────────────────────────────────────────────────────────
# AI Catalog Extraction
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/ai-extract")
async def ai_extract_catalog(
    text: Optional[str] = Form(None, description="Raw catalog text to extract products from"),
    file: Optional[UploadFile] = File(None, description="Catalog file (txt, csv, json)"),
    current_vendor: User = Depends(get_current_vendor),
):
    """
    Upload a vendor catalog (text or file) and use the LLM to extract
    Solar Panels and Inverters as structured JSON.

    Returns:
        { panels: [...], inverters: [...], raw_count: int, error: str|null }

    The returned objects match PanelCreate / InverterCreate schemas.
    Use POST /vendor/ai-bulk-import to persist them.
    """
    service = LLMInventoryService()

    file_bytes: Optional[bytes] = None
    file_name: Optional[str] = None
    if file:
        file_bytes = await file.read()
        file_name = file.filename

    if not text and not file_bytes:
        raise HTTPException(status_code=400, detail="Provide either 'text' or a file upload.")

    result = await service.extract(text=text, file_bytes=file_bytes, file_name=file_name)
    return result


# Map AI-extraction field names → actual Inverter model column names
_INV_FIELD_MAP = {
    "ac_rated_power":   "nominal_ac_power_kw",   # AI sends W; we store W in same float col
    "dc_max_power":     "max_dc_input_power",
    "max_input_voltage": "max_dc_voltage",
    "max_input_current": "max_dc_current_mppt",
    "no_of_mppt":       "no_of_mppt_ports",
    "max_efficiency":   "efficiency_max",
    "warranty_years":   "warranty",
}

# Columns that exist on the Inverter model (whitelist — ignore anything else)
_INV_VALID_COLS = {
    "name", "product_id", "price", "brand", "warranty",
    "nominal_ac_power_kw", "max_dc_input_power", "mppt_min_voltage", "mppt_max_voltage",
    "max_dc_voltage", "max_dc_current_mppt", "no_of_mppt_ports", "max_strings_per_mppt",
    "efficiency_max", "ac_output_voltage", "phase_type", "spd_included", "ip_rating",
    "status", "vendor_id",
}

# Columns that exist on the Panel model (whitelist)
_PANEL_VALID_COLS = {
    "name", "product_id", "price", "weight_kg", "width_mm", "height_mm", "brand",
    "warranty_years", "type", "panel_rated_power", "maximum_operating_voltage_vmpp",
    "maximum_operating_current_impp", "open_circuit_voltage", "short_circuit_current",
    "module_efficiency", "maximum_system_voltage", "maximum_series_fuse_rating",
    "num_of_cells", "wind_load_kg_per_m2", "snow_load_kg_per_m2",
    "operating_temperature_from", "operating_temperature_to",
    "temp_coefficient_of_pmax", "temp_coefficient_of_voc", "temp_coefficient_of_isc",
    "nom_operating_cell_temp_noct", "connector_type", "status", "vendor_id",
}


@router.post("/ai-bulk-import")
def ai_bulk_import(
    products: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_vendor: User = Depends(get_current_vendor),
):
    """
    Persist AI-extracted products in one shot.

    Body: { "panels": [...], "inverters": [...] }
    Returns: { panels_created: int, inverters_created: int }
    """
    panels_created = 0
    inverters_created = 0

    for raw in products.get("panels", []):
        if not raw.get("name") or not raw.get("panel_rated_power"):
            continue
        panel_data = {k: v for k, v in raw.items() if k in _PANEL_VALID_COLS}
        panel_data["vendor_id"] = current_vendor.id
        panel_data["status"] = "pending"
        db.add(Panel(**panel_data))
        panels_created += 1

    for raw in products.get("inverters", []):
        if not raw.get("name") or not raw.get("ac_rated_power"):
            continue
        # Rename AI fields to model column names
        mapped: Dict[str, Any] = {}
        for k, v in raw.items():
            col = _INV_FIELD_MAP.get(k, k)
            if col in _INV_VALID_COLS:
                mapped[col] = v
        # nominal_ac_power_kw stored as W (same float); divide if value looks like kW
        if "nominal_ac_power_kw" in mapped and mapped["nominal_ac_power_kw"] and mapped["nominal_ac_power_kw"] > 500:
            # AI sends Watts (e.g. 5000) but column is named _kw historically — store as-is
            pass
        mapped["vendor_id"] = current_vendor.id
        mapped["status"] = "pending"
        db.add(Inverter(**mapped))
        inverters_created += 1

    db.commit()
    return {"panels_created": panels_created, "inverters_created": inverters_created}
