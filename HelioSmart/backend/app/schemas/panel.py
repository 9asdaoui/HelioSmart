from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class PanelBase(BaseModel):
    """Base panel schema"""
    name: str
    product_id: Optional[str] = None
    price: Optional[float] = None
    weight_kg: Optional[float] = None
    width_mm: Optional[float] = None
    height_mm: Optional[float] = None
    brand: Optional[str] = None
    warranty_years: Optional[int] = None
    type: Optional[str] = None
    panel_rated_power: float
    maximum_operating_voltage_vmpp: Optional[float] = None
    maximum_operating_current_impp: Optional[float] = None
    open_circuit_voltage: Optional[float] = None
    short_circuit_current: Optional[float] = None
    module_efficiency: Optional[float] = None
    maximum_system_voltage: Optional[float] = None
    maximum_series_fuse_rating: Optional[float] = None
    num_of_cells: Optional[int] = None
    wind_load_kg_per_m2: Optional[float] = None
    snow_load_kg_per_m2: Optional[float] = None
    operating_temperature_from: Optional[float] = None
    operating_temperature_to: Optional[float] = None
    temp_coefficient_of_pmax: Optional[float] = None
    temp_coefficient_of_voc: Optional[float] = None
    temp_coefficient_of_isc: Optional[float] = None
    nom_operating_cell_temp_noct: Optional[float] = None
    connector_type: Optional[str] = None
    score: float = 0.0
    status: str = "active"


class PanelCreate(PanelBase):
    """Schema for creating a panel"""
    pass


class PanelUpdate(BaseModel):
    """Schema for updating a panel"""
    name: Optional[str] = None
    product_id: Optional[str] = None
    price: Optional[float] = None
    weight_kg: Optional[float] = None
    width_mm: Optional[float] = None
    height_mm: Optional[float] = None
    brand: Optional[str] = None
    warranty_years: Optional[int] = None
    type: Optional[str] = None
    panel_rated_power: Optional[float] = None
    maximum_operating_voltage_vmpp: Optional[float] = None
    maximum_operating_current_impp: Optional[float] = None
    open_circuit_voltage: Optional[float] = None
    short_circuit_current: Optional[float] = None
    module_efficiency: Optional[float] = None
    maximum_system_voltage: Optional[float] = None
    maximum_series_fuse_rating: Optional[float] = None
    num_of_cells: Optional[int] = None
    wind_load_kg_per_m2: Optional[float] = None
    snow_load_kg_per_m2: Optional[float] = None
    operating_temperature_from: Optional[float] = None
    operating_temperature_to: Optional[float] = None
    temp_coefficient_of_pmax: Optional[float] = None
    temp_coefficient_of_voc: Optional[float] = None
    temp_coefficient_of_isc: Optional[float] = None
    nom_operating_cell_temp_noct: Optional[float] = None
    connector_type: Optional[str] = None
    score: Optional[float] = None
    status: Optional[str] = None


class PanelResponse(PanelBase):
    """Schema for panel response"""
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
