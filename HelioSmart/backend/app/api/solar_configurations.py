from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models import SolarConfiguration
from app.schemas.solar_configuration import (
    SolarConfigurationCreate,
    SolarConfigurationUpdate,
    SolarConfigurationResponse,
    SolarConfigurationBulkUpdate,
)

router = APIRouter(prefix="/solar-configurations", tags=["Solar Configurations"])


@router.post("/", response_model=SolarConfigurationResponse, status_code=201)
def create_configuration(
    config_data: SolarConfigurationCreate,
    db: Session = Depends(get_db)
):
    """Create a new solar configuration"""
    # Check if key already exists
    existing = db.query(SolarConfiguration).filter(
        SolarConfiguration.key == config_data.key
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Configuration key already exists")
    
    config = SolarConfiguration(**config_data.model_dump())
    db.add(config)
    db.commit()
    db.refresh(config)
    return config


@router.get("/", response_model=List[SolarConfigurationResponse])
def list_configurations(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """List all solar configurations"""
    configs = db.query(SolarConfiguration).order_by(
        SolarConfiguration.name
    ).offset(skip).limit(limit).all()
    return configs


@router.get("/key/{key}", response_model=SolarConfigurationResponse)
def get_configuration_by_key(key: str, db: Session = Depends(get_db)):
    """Get a configuration by key"""
    config = db.query(SolarConfiguration).filter(
        SolarConfiguration.key == key
    ).first()
    
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")
    
    return config


@router.get("/{config_id}", response_model=SolarConfigurationResponse)
def get_configuration(config_id: int, db: Session = Depends(get_db)):
    """Get a specific configuration by ID"""
    config = db.query(SolarConfiguration).filter(
        SolarConfiguration.id == config_id
    ).first()
    
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")
    
    return config


@router.put("/bulk", response_model=List[SolarConfigurationResponse])
def bulk_update_configurations(
    bulk_data: SolarConfigurationBulkUpdate,
    db: Session = Depends(get_db)
):
    """Bulk update solar configurations"""
    updated_configs = []
    
    for config_data in bulk_data.configurations:
        key = config_data.get("key")
        if not key:
            continue
        
        config = db.query(SolarConfiguration).filter(
            SolarConfiguration.key == key
        ).first()
        
        if config:
            for field, value in config_data.items():
                if field != "key" and hasattr(config, field):
                    setattr(config, field, value)
            updated_configs.append(config)
    
    db.commit()
    
    for config in updated_configs:
        db.refresh(config)
    
    return updated_configs


@router.put("/{config_id}", response_model=SolarConfigurationResponse)
def update_configuration(
    config_id: int,
    config_data: SolarConfigurationUpdate,
    db: Session = Depends(get_db)
):
    """Update a configuration"""
    config = db.query(SolarConfiguration).filter(
        SolarConfiguration.id == config_id
    ).first()
    
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")
    
    update_data = config_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(config, field, value)
    
    db.commit()
    db.refresh(config)
    return config


@router.delete("/{config_id}", status_code=204)
def delete_configuration(config_id: int, db: Session = Depends(get_db)):
    """Delete a configuration"""
    config = db.query(SolarConfiguration).filter(
        SolarConfiguration.id == config_id
    ).first()
    
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")
    
    db.delete(config)
    db.commit()
    
    return None
