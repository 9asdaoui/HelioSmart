"""Admin API - System management endpoints for administrators"""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta

from app.core.database import get_db
from app.services.auth_service import require_role, get_current_user
from app.models.user import User, UserRole, UserStatus, Vendor, Product, VendorDocument
from app.models.estimation import Estimation
from app.models.panel import Panel
from app.models.inverter import Inverter
from app.models.utility import Utility
from app.schemas.auth import (
    UserResponse, VendorResponse, ProductResponse, 
    VendorDocumentResponse, UserStatusUpdate
)

router = APIRouter(prefix="/api/v1/admin", tags=["Admin"])


# ============================================================================
# Dashboard Statistics
# ============================================================================

@router.get("/stats", response_model=dict)
def get_admin_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Get comprehensive system statistics for admin dashboard"""
    
    # User statistics
    total_users = db.query(func.count(User.id)).scalar()
    users_by_role = db.query(User.role, func.count(User.id)).group_by(User.role).all()
    users_by_status = db.query(User.status, func.count(User.id)).group_by(User.status).all()
    
    # Vendor statistics
    total_vendors = db.query(func.count(Vendor.id)).scalar()
    approved_vendors = db.query(func.count(Vendor.id)).filter(Vendor.is_approved == True).scalar()
    pending_vendors = total_vendors - approved_vendors
    
    # Product statistics
    total_products = db.query(func.count(Product.id)).scalar()
    approved_products = db.query(func.count(Product.id)).filter(Product.status == "approved").scalar()
    pending_products = db.query(func.count(Product.id)).filter(Product.status == "pending").scalar()
    
    # Document statistics
    total_documents = db.query(func.count(VendorDocument.id)).scalar()
    processed_documents = db.query(func.count(VendorDocument.id)).filter(
        VendorDocument.status.in_(["extracted", "approved"])
    ).scalar()
    
    # Estimation statistics
    total_estimations = db.query(func.count(Estimation.id)).scalar()
    estimations_this_month = db.query(func.count(Estimation.id)).filter(
        Estimation.created_at >= datetime.utcnow() - timedelta(days=30)
    ).scalar()
    
    # Recent activity
    recent_users = db.query(User).order_by(desc(User.created_at)).limit(5).all()
    recent_vendors = db.query(Vendor).order_by(desc(Vendor.created_at)).limit(5).all()
    recent_estimations = db.query(Estimation).order_by(desc(Estimation.created_at)).limit(5).all()
    
    return {
        "users": {
            "total": total_users,
            "by_role": {role.value: count for role, count in users_by_role},
            "by_status": {status.value: count for status, count in users_by_status},
            "recent": [UserResponse.model_validate(u) for u in recent_users]
        },
        "vendors": {
            "total": total_vendors,
            "approved": approved_vendors,
            "pending": pending_vendors,
            "recent": [VendorResponse.model_validate(v) for v in recent_vendors]
        },
        "products": {
            "total": total_products,
            "approved": approved_products,
            "pending": pending_products
        },
        "documents": {
            "total": total_documents,
            "processed": processed_documents
        },
        "estimations": {
            "total": total_estimations,
            "this_month": estimations_this_month,
            "recent": [
                {
                    "id": e.id,
                    "customer_name": e.customer_name,
                    "address": e.address,
                    "system_capacity": e.system_capacity,
                    "status": e.status,
                    "created_at": e.created_at
                }
                for e in recent_estimations
            ]
        }
    }


# ============================================================================
# User Management
# ============================================================================

@router.get("/users", response_model=dict)
def list_all_users(
    role: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """List all users with filtering options"""
    query = db.query(User)
    
    if role:
        query = query.filter(User.role == role)
    if status:
        query = query.filter(User.status == status)
    
    total = query.count()
    users = query.order_by(desc(User.created_at)).offset(skip).limit(limit).all()
    
    return {
        "items": [UserResponse.model_validate(u) for u in users],
        "total": total,
        "page": skip // limit + 1 if limit > 0 else 1,
        "page_size": limit
    }


@router.get("/users/{user_id}", response_model=UserResponse)
def get_user_details(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Get detailed information about a specific user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse.model_validate(user)


@router.put("/users/{user_id}/status", response_model=UserResponse)
def update_user_status(
    user_id: int,
    status_update: UserStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Update user status (active, suspended, deleted)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot change your own status")
    
    user.status = UserStatus(status_update.status)
    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    
    return UserResponse.model_validate(user)


@router.put("/users/{user_id}/role", response_model=UserResponse)
def update_user_role(
    user_id: int,
    role: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Update user role"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")
    
    try:
        user.role = UserRole(role)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid role: {role}")
    
    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    
    return UserResponse.model_validate(user)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Soft delete a user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    user.status = UserStatus.DELETED
    user.updated_at = datetime.utcnow()
    db.commit()
    
    return None


# ============================================================================
# Vendor Management
# ============================================================================

@router.get("/vendors", response_model=dict)
def list_all_vendors(
    is_approved: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """List all vendors with approval filtering"""
    query = db.query(Vendor)
    
    if is_approved is not None:
        query = query.filter(Vendor.is_approved == is_approved)
    
    total = query.count()
    vendors = query.order_by(desc(Vendor.created_at)).offset(skip).limit(limit).all()
    
    return {
        "items": [VendorResponse.model_validate(v) for v in vendors],
        "total": total,
        "page": skip // limit + 1 if limit > 0 else 1,
        "page_size": limit
    }


@router.post("/vendors/{vendor_id}/approve", response_model=VendorResponse)
def approve_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Approve a vendor"""
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    if vendor.is_approved:
        raise HTTPException(status_code=400, detail="Vendor is already approved")
    
    vendor.is_approved = True
    vendor.approved_at = datetime.utcnow()
    vendor.approved_by = current_user.id
    vendor.updated_at = datetime.utcnow()
    
    # Also update the user's role to VENDOR
    user = db.query(User).filter(User.id == vendor.user_id).first()
    if user:
        user.role = UserRole.VENDOR
        user.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(vendor)
    
    return VendorResponse.model_validate(vendor)


@router.post("/vendors/{vendor_id}/reject", response_model=VendorResponse)
def reject_vendor(
    vendor_id: int,
    reason: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Reject a vendor application"""
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    vendor.is_approved = False
    vendor.approved_at = None
    vendor.approved_by = None
    vendor.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(vendor)
    
    return VendorResponse.model_validate(vendor)


# ============================================================================
# Product Management
# ============================================================================

@router.get("/products", response_model=dict)
def list_all_products(
    status: Optional[str] = None,
    vendor_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """List all products with filtering"""
    query = db.query(Product)
    
    if status:
        query = query.filter(Product.status == status)
    if vendor_id:
        query = query.filter(Product.vendor_id == vendor_id)
    
    total = query.count()
    products = query.order_by(desc(Product.created_at)).offset(skip).limit(limit).all()
    
    return {
        "items": [ProductResponse.model_validate(p) for p in products],
        "total": total,
        "page": skip // limit + 1 if limit > 0 else 1,
        "page_size": limit
    }


@router.post("/products/{product_id}/approve", response_model=ProductResponse)
def approve_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Approve a product"""
    from app.models.user import ProductStatus
    
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    product.status = ProductStatus.APPROVED
    product.approved_at = datetime.utcnow()
    product.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(product)
    
    return ProductResponse.model_validate(product)


@router.post("/products/{product_id}/reject", response_model=ProductResponse)
def reject_product(
    product_id: int,
    reason: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Reject a product"""
    from app.models.user import ProductStatus
    
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    product.status = ProductStatus.REJECTED
    product.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(product)
    
    return ProductResponse.model_validate(product)


# ============================================================================
# Document Management
# ============================================================================

@router.get("/documents", response_model=dict)
def list_all_documents(
    status: Optional[str] = None,
    vendor_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """List all vendor documents"""
    query = db.query(VendorDocument)
    
    if status:
        query = query.filter(VendorDocument.status == status)
    if vendor_id:
        query = query.filter(VendorDocument.vendor_id == vendor_id)
    
    total = query.count()
    documents = query.order_by(desc(VendorDocument.uploaded_at)).offset(skip).limit(limit).all()
    
    return {
        "items": [VendorDocumentResponse.model_validate(d) for d in documents],
        "total": total,
        "page": skip // limit + 1 if limit > 0 else 1,
        "page_size": limit
    }


# ============================================================================
# System Data Overview
# ============================================================================

@router.get("/data-overview", response_model=dict)
def get_data_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Get overview of all system data"""
    
    return {
        "panels": {
            "total": db.query(func.count(Panel.id)).scalar(),
            "active": db.query(func.count(Panel.id)).filter(Panel.status == "active").scalar()
        },
        "inverters": {
            "total": db.query(func.count(Inverter.id)).scalar(),
            "active": db.query(func.count(Inverter.id)).filter(Inverter.status == "active").scalar()
        },
        "utilities": {
            "total": db.query(func.count(Utility.id)).scalar()
        },
        "estimations": {
            "total": db.query(func.count(Estimation.id)).scalar(),
            "completed": db.query(func.count(Estimation.id)).filter(Estimation.status == "completed").scalar(),
            "draft": db.query(func.count(Estimation.id)).filter(Estimation.status == "draft").scalar(),
            "pending": db.query(func.count(Estimation.id)).filter(Estimation.status == "pending").scalar()
        }
    }
