from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime


class SolarConfigurationBase(BaseModel):
    """Base solar configuration schema"""
    name: str
    key: str
    value: Optional[str] = None
    description: Optional[str] = None


class SolarConfigurationCreate(SolarConfigurationBase):
    """Schema for creating a solar configuration"""
    pass


class SolarConfigurationUpdate(BaseModel):
    """Schema for updating a solar configuration"""
    name: Optional[str] = None
    key: Optional[str] = None
    value: Optional[str] = None
    description: Optional[str] = None


class SolarConfigurationResponse(SolarConfigurationBase):
    """Schema for solar configuration response"""
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class SolarConfigurationBulkUpdate(BaseModel):
    """Schema for bulk updating solar configurations"""
    configurations: list[dict[str, Any]]
