from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class User(Base):
    """User model — supports vendor, user, and admin roles"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default="user", nullable=False)  # "vendor" | "user" | "admin"
    is_active = Column(Boolean, default=True)
    company_name = Column(String(255), nullable=True)  # useful for vendor profiles

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships (back-references from Panel/Inverter)
    panels = relationship("Panel", back_populates="vendor", foreign_keys="Panel.vendor_id")
    inverters = relationship("Inverter", back_populates="vendor", foreign_keys="Inverter.vendor_id")
