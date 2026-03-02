from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Panel(Base):
    """Solar panel model"""
    __tablename__ = "panels"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    product_id = Column(String(100), nullable=True)
    price = Column(Float, nullable=True)
    weight_kg = Column(Float, nullable=True)
    width_mm = Column(Float, nullable=True)
    height_mm = Column(Float, nullable=True)
    brand = Column(String(100), nullable=True)
    warranty_years = Column(Integer, nullable=True)
    type = Column(String(50), nullable=True)
    
    # Electrical specifications
    panel_rated_power = Column(Float, nullable=False)  # Watts
    maximum_operating_voltage_vmpp = Column(Float, nullable=True)
    maximum_operating_current_impp = Column(Float, nullable=True)
    open_circuit_voltage = Column(Float, nullable=True)
    short_circuit_current = Column(Float, nullable=True)
    module_efficiency = Column(Float, nullable=True)
    maximum_system_voltage = Column(Float, nullable=True)
    maximum_series_fuse_rating = Column(Float, nullable=True)
    num_of_cells = Column(Integer, nullable=True)
    
    # Load ratings
    wind_load_kg_per_m2 = Column(Float, nullable=True)
    snow_load_kg_per_m2 = Column(Float, nullable=True)
    
    # Temperature coefficients
    operating_temperature_from = Column(Float, nullable=True)
    operating_temperature_to = Column(Float, nullable=True)
    temp_coefficient_of_pmax = Column(Float, nullable=True)
    temp_coefficient_of_voc = Column(Float, nullable=True)
    temp_coefficient_of_isc = Column(Float, nullable=True)
    nom_operating_cell_temp_noct = Column(Float, nullable=True)
    
    # Other
    connector_type = Column(String(100), nullable=True)
    score = Column(Float, default=0.0)
    status = Column(String(20), default="active")

    # Vendor ownership (nullable — pre-existing panels have no vendor)
    vendor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    estimations = relationship("Estimation", back_populates="panel")
    vendor = relationship("User", back_populates="panels", foreign_keys=[vendor_id])
