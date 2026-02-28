from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum


class EstimationStatus(str, Enum):
    """Estimation status"""
    DRAFT = "draft"
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"


class EstimationBase(BaseModel):
    """Base estimation schema"""
    panel_id: Optional[int] = None
    utility_id: Optional[int] = None
    customer_name: Optional[str] = None
    email: Optional[EmailStr] = None
    latitude: float
    longitude: float
    address: Optional[str] = None
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None
    roof_image_path: Optional[str] = None
    roof_polygon: Optional[Dict[str, Any]] = None
    roof_area: Optional[float] = None
    building_floors: int = 1
    scale_meters_per_pixel: Optional[float] = None
    annual_usage_kwh: Optional[float] = None
    annual_cost: Optional[float] = None
    monthly_usage: Optional[Dict[str, Any]] = None
    monthly_cost: Optional[Dict[str, Any]] = None
    utility_company: Optional[str] = None
    coverage_percentage: int = 80
    energy_usage_type: str = "annual_usage"
    panel_count: Optional[int] = None
    system_capacity: float
    tilt: float
    azimuth: float
    losses: float = 14.0
    energy_annual: float
    status: EstimationStatus = EstimationStatus.DRAFT


class EstimationCreate(EstimationBase):
    """Schema for creating an estimation"""
    pass


class EstimationUpdate(BaseModel):
    """Schema for updating an estimation"""
    panel_id: Optional[int] = None
    utility_id: Optional[int] = None
    customer_name: Optional[str] = None
    email: Optional[EmailStr] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None
    roof_image_path: Optional[str] = None
    roof_polygon: Optional[Dict[str, Any]] = None
    roof_area: Optional[float] = None
    building_floors: Optional[int] = None
    scale_meters_per_pixel: Optional[float] = None
    annual_usage_kwh: Optional[float] = None
    annual_cost: Optional[float] = None
    monthly_usage: Optional[Dict[str, Any]] = None
    monthly_cost: Optional[Dict[str, Any]] = None
    utility_company: Optional[str] = None
    coverage_percentage: Optional[int] = None
    energy_usage_type: Optional[str] = None
    panel_count: Optional[int] = None
    system_capacity: Optional[float] = None
    tilt: Optional[float] = None
    azimuth: Optional[float] = None
    losses: Optional[float] = None
    energy_annual: Optional[float] = None
    status: Optional[EstimationStatus] = None
    usable_polygon: Optional[Dict[str, Any]] = None
    usable_area: Optional[float] = None
    usable_area_m2: Optional[float] = None
    roof_type_detected: Optional[str] = None
    inverter_design: Optional[Dict[str, Any]] = None
    inverter_combos: Optional[List[Dict[str, Any]]] = None


class EstimationResponse(EstimationBase):
    """Schema for estimation response"""
    id: int
    usable_polygon: Optional[Dict[str, Any]] = None
    usable_area: Optional[float] = None
    usable_area_m2: Optional[float] = None
    roof_mask_image: Optional[str] = None
    overlay_image: Optional[str] = None
    sam_masks: Optional[List[str]] = None
    roof_mask_index: Optional[int] = None
    facade_reduction_ratio: Optional[float] = None
    roof_type_detected: Optional[str] = None
    facade_filtering_applied: bool = False
    meters_per_pixel: Optional[float] = None
    panel_grid_image: Optional[str] = None
    visualization_image: Optional[str] = None
    panel_grid: Optional[Dict[str, Any]] = None
    panel_positions: Optional[List[Dict[str, Any]]] = None
    dc_monthly: Optional[Dict[str, Any]] = None
    poa_monthly: Optional[Dict[str, Any]] = None
    solrad_monthly: Optional[Dict[str, Any]] = None
    ac_monthly: Optional[Dict[str, Any]] = None
    capacity_factor: Optional[float] = None
    solrad_annual: Optional[float] = None
    optimum_tilt: Optional[float] = None
    optimum_azimuth: Optional[float] = None
    total_losses_percent: Optional[float] = None
    roof_type: Optional[str] = None
    roof_tilt: Optional[float] = None
    roof_net_tilt: Optional[float] = None
    annual_production_per_kw: Optional[float] = None
    solar_irradiance_avg: Optional[float] = None
    performance_ratio: Optional[float] = None
    solar_production_factor: Optional[float] = None
    mounting_structure_cost: Optional[float] = None
    installation_type: Optional[str] = None
    panel_orientation: Optional[str] = None
    inverter_design: Optional[Dict[str, Any]] = None
    inverter_combos: Optional[List[Dict[str, Any]]] = None
    stringing_details: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class EstimationListResponse(BaseModel):
    """Schema for listing estimations"""
    total: int
    estimations: List[EstimationResponse]
