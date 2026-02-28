from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Utility(Base):
    """Utility company model"""
    __tablename__ = "utilities"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    image_url = Column(String(500), nullable=True)
    state = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    estimations = relationship("Estimation", back_populates="utility")
    rate_ranges = relationship("UtilityRateRange", back_populates="utility", cascade="all, delete-orphan")
