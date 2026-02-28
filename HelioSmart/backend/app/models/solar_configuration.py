from sqlalchemy import Column, Integer, String, Text, DateTime, Index
from sqlalchemy.sql import func
from app.core.database import Base
import json


class SolarConfiguration(Base):
    """Solar configuration model for system settings"""
    __tablename__ = "solar_configs"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    key = Column(String(255), nullable=False, unique=True, index=True)
    value = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        Index('idx_solar_configs_key', 'key'),
    )
    
    @property
    def parsed_value(self):
        """Parse value as JSON if possible"""
        if not self.value:
            return None
        
        try:
            return json.loads(self.value)
        except (json.JSONDecodeError, TypeError):
            # Handle boolean strings
            if self.value.lower() in ['true', 'false']:
                return self.value.lower() == 'true'
            
            # Handle numeric strings
            try:
                if '.' in self.value:
                    return float(self.value)
                return int(self.value)
            except ValueError:
                return self.value
