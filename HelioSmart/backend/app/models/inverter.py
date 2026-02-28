from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Inverter(Base):
    """Inverter model"""
    __tablename__ = "inverters"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    product_id = Column(String(100), nullable=True)
    price = Column(Float, nullable=True)
    brand = Column(String(100), nullable=True)
    warranty = Column(Integer, nullable=True)  # years
    
    # Technical specifications
    nominal_ac_power_kw = Column(Float, nullable=False)
    max_dc_input_power = Column(Float, nullable=True)
    mppt_min_voltage = Column(Float, nullable=True)
    mppt_max_voltage = Column(Float, nullable=True)
    max_dc_voltage = Column(Float, nullable=True)
    max_dc_current_mppt = Column(Float, nullable=True)
    no_of_mppt_ports = Column(Integer, nullable=True)
    max_strings_per_mppt = Column(Integer, nullable=True)
    efficiency_max = Column(Float, nullable=True)
    
    # AC specifications
    ac_output_voltage = Column(String(50), nullable=True)
    phase_type = Column(String(20), nullable=True)  # single, three
    
    # Protection
    spd_included = Column(Boolean, default=False)
    ip_rating = Column(String(10), nullable=True)
    
    # Status
    status = Column(String(20), default="active")
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
