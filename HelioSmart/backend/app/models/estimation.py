from sqlalchemy import Column, Integer, String, Float, Boolean, JSON, Text, DateTime, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class EstimationStatus(str, enum.Enum):
    """Estimation status enumeration"""
    DRAFT = "draft"
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"


class Estimation(Base):
    """Estimation model for solar panel installations"""
    __tablename__ = "estimations"
    
    id = Column(Integer, primary_key=True, index=True)
    panel_id = Column(Integer, ForeignKey("panels.id", ondelete="SET NULL"), nullable=True)
    utility_id = Column(Integer, ForeignKey("utilities.id", ondelete="SET NULL"), nullable=True)
    
    # Customer information
    customer_name = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    
    # Location data
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String(500), nullable=True)
    street = Column(String(255), nullable=True)
    city = Column(String(255), nullable=True)
    state = Column(String(255), nullable=True)
    zip_code = Column(String(20), nullable=True)
    country = Column(String(100), nullable=True)
    
    # Roof/Building information
    roof_image_path = Column(String(500), nullable=True)
    roof_polygon = Column(JSON, nullable=True)
    roof_area = Column(Float, nullable=True)
    building_floors = Column(Integer, default=1)
    scale_meters_per_pixel = Column(Float, nullable=True)
    
    # Usable area detection fields
    usable_polygon = Column(JSON, nullable=True)
    usable_area = Column(Float, nullable=True)
    usable_area_m2 = Column(Float, nullable=True)
    roof_mask_image = Column(Text, nullable=True)
    overlay_image = Column(Text, nullable=True)
    sam_masks = Column(JSON, nullable=True)
    roof_mask_index = Column(Integer, nullable=True)
    facade_reduction_ratio = Column(Float, nullable=True)
    roof_type_detected = Column(String(100), nullable=True)
    facade_filtering_applied = Column(Boolean, default=False)
    meters_per_pixel = Column(Float, nullable=True)
    
    # Panel placement API results
    panel_grid_image = Column(Text, nullable=True)
    visualization_image = Column(Text, nullable=True)
    panel_grid = Column(JSON, nullable=True)
    panel_positions = Column(JSON, nullable=True)
    
    # Energy usage
    annual_usage_kwh = Column(Float, nullable=True)
    annual_cost = Column(Float, nullable=True)
    monthly_usage = Column(JSON, nullable=True)
    monthly_cost = Column(JSON, nullable=True)
    utility_company = Column(String(255), nullable=True)
    coverage_percentage = Column(Integer, default=80)
    energy_usage_type = Column(String(50), default="annual_usage")
    
    # System specs
    panel_count = Column(Integer, nullable=True)
    system_capacity = Column(Float, nullable=False)
    tilt = Column(Float, nullable=False)
    azimuth = Column(Float, nullable=False)
    losses = Column(Float, default=14.0)
    
    # PVWatts/PVGIS output
    dc_monthly = Column(JSON, nullable=True)
    poa_monthly = Column(JSON, nullable=True)
    solrad_monthly = Column(JSON, nullable=True)
    ac_monthly = Column(JSON, nullable=True)
    energy_annual = Column(Float, nullable=False)
    capacity_factor = Column(Float, nullable=True)
    solrad_annual = Column(Float, nullable=True)
    
    # Optimum values
    optimum_tilt = Column(Float, nullable=True)
    optimum_azimuth = Column(Float, nullable=True)
    total_losses_percent = Column(Float, nullable=True)
    loss_breakdown = Column(JSON, nullable=True)  # Detailed loss breakdown for waterfall chart
    
    # Roof type
    roof_type = Column(String(100), nullable=True)
    roof_tilt = Column(Float, nullable=True)
    roof_net_tilt = Column(Float, nullable=True)
    annual_production_per_kw = Column(Float, nullable=True)
    
    # Enhanced Solar Calculation Data
    solar_irradiance_avg = Column(Float, nullable=True)
    performance_ratio = Column(Float, nullable=True)
    solar_production_factor = Column(Float, nullable=True)
    
    # Mounting Structure Cost Data
    mounting_structure_cost = Column(Float, nullable=True)
    installation_type = Column(String(100), nullable=True)
    panel_orientation = Column(String(100), nullable=True)
    
    # Inverter Design Data
    inverter_design = Column(JSON, nullable=True)
    inverter_combos = Column(JSON, nullable=True)
    stringing_details = Column(JSON, nullable=True)
    
    # Status
    status = Column(SQLEnum(EstimationStatus), default=EstimationStatus.DRAFT)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    panel = relationship("Panel", back_populates="estimations")
    utility = relationship("Utility", back_populates="estimations")
