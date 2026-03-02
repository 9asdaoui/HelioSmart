from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class InverterBase(BaseModel):
    """Base inverter schema"""
    name: str
    product_id: Optional[str] = None
    price: Optional[float] = None
    brand: Optional[str] = None
    warranty: Optional[int] = None
    nominal_ac_power_kw: float
    max_dc_input_power: Optional[float] = None
    mppt_min_voltage: Optional[float] = None
    mppt_max_voltage: Optional[float] = None
    max_dc_voltage: Optional[float] = None
    max_dc_current_mppt: Optional[float] = None
    no_of_mppt_ports: Optional[int] = None
    max_strings_per_mppt: Optional[int] = None
    efficiency_max: Optional[float] = None
    ac_output_voltage: Optional[str] = None
    phase_type: Optional[str] = None
    spd_included: bool = False
    ip_rating: Optional[str] = None
    status: str = "active"


class InverterCreate(InverterBase):
    """Schema for creating an inverter"""
    pass


class InverterUpdate(BaseModel):
    """Schema for updating an inverter"""
    name: Optional[str] = None
    product_id: Optional[str] = None
    price: Optional[float] = None
    brand: Optional[str] = None
    warranty: Optional[int] = None
    nominal_ac_power_kw: Optional[float] = None
    max_dc_input_power: Optional[float] = None
    mppt_min_voltage: Optional[float] = None
    mppt_max_voltage: Optional[float] = None
    max_dc_voltage: Optional[float] = None
    max_dc_current_mppt: Optional[float] = None
    no_of_mppt_ports: Optional[int] = None
    max_strings_per_mppt: Optional[int] = None
    efficiency_max: Optional[float] = None
    ac_output_voltage: Optional[str] = None
    phase_type: Optional[str] = None
    spd_included: Optional[bool] = None
    ip_rating: Optional[str] = None
    status: Optional[str] = None


class InverterResponse(InverterBase):
    """Schema for inverter response"""
    id: int
    vendor_id: Optional[int] = None
    vendor_company_name: Optional[str] = None  # populated by marketplace endpoint
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
