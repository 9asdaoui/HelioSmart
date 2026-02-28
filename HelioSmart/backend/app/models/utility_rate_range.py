from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class UtilityRateRange(Base):
    """Utility rate range model for tiered pricing"""
    __tablename__ = "utility_rate_ranges"
    
    id = Column(Integer, primary_key=True, index=True)
    utility_id = Column(Integer, ForeignKey("utilities.id", ondelete="CASCADE"), nullable=False)
    
    # Rate range details
    range_name = Column(String(100), nullable=True)  # e.g., "Tier 1", "Off-Peak"
    min_usage = Column(Float, nullable=False)  # kWh minimum
    max_usage = Column(Float, nullable=True)  # kWh maximum (null for unlimited)
    rate_per_kwh = Column(Float, nullable=False)  # Price per kWh
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    utility = relationship("Utility", back_populates="rate_ranges")
