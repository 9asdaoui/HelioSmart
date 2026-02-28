from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class UtilityRateRangeBase(BaseModel):
    """Base utility rate range schema"""
    range_name: Optional[str] = None
    min_usage: float
    max_usage: Optional[float] = None
    rate_per_kwh: float


class UtilityRateRangeCreate(UtilityRateRangeBase):
    """Schema for creating a utility rate range"""
    pass


class UtilityRateRangeUpdate(BaseModel):
    """Schema for updating a utility rate range"""
    range_name: Optional[str] = None
    min_usage: Optional[float] = None
    max_usage: Optional[float] = None
    rate_per_kwh: Optional[float] = None


class UtilityRateRangeResponse(UtilityRateRangeBase):
    """Schema for utility rate range response"""
    id: int
    utility_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class UtilityBase(BaseModel):
    """Base utility schema"""
    name: str
    image_url: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None


class UtilityCreate(UtilityBase):
    """Schema for creating a utility"""
    rate_ranges: Optional[List[UtilityRateRangeCreate]] = None


class UtilityUpdate(BaseModel):
    """Schema for updating a utility"""
    name: Optional[str] = None
    image_url: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None


class UtilityResponse(UtilityBase):
    """Schema for utility response"""
    id: int
    rate_ranges: List[UtilityRateRangeResponse] = []
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
