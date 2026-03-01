"""Authentication API Routes"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User, UserRole, Vendor
from app.schemas.auth import (
    UserCreate, UserResponse, UserUpdate,
    LoginRequest, TokenResponse,
    VendorCreate, VendorResponse, VendorUpdate,
    PasswordChangeRequest, PasswordResetRequest
)
from app.services.auth_service import (
    AuthService, get_current_user, get_current_user_optional,
    require_role, require_vendor, require_admin,
    user_to_response, generate_user_token
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ============== Public Routes ==============

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user account"""
    auth_service = AuthService(db)
    
    user = auth_service.register_user(
        email=user_data.email,
        password=user_data.password,
        full_name=user_data.full_name,
        phone=user_data.phone,
        role=user_data.role
    )
    
    # Generate token
    token = generate_user_token(user)
    
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=60 * 24 * 60,  # 24 hours in seconds
        user=user_to_response(user)
    )


@router.post("/login", response_model=TokenResponse)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """Login and get access token"""
    auth_service = AuthService(db)
    
    user, token = auth_service.login(
        email=login_data.email,
        password=login_data.password
    )
    
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=60 * 24 * 60,  # 24 hours in seconds
        user=user_to_response(user)
    )


@router.post("/guest", response_model=TokenResponse)
def create_guest(session_id: Optional[str] = None, db: Session = Depends(get_db)):
    """Create a guest user session"""
    import uuid
    
    session_id = session_id or str(uuid.uuid4())
    auth_service = AuthService(db)
    
    user = auth_service.get_or_create_guest_user(session_id)
    token = generate_user_token(user)
    
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=60 * 60,  # 1 hour for guests
        user=user_to_response(user)
    )


# ============== Protected User Routes ==============

@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user profile"""
    return user_to_response(current_user)


@router.put("/me", response_model=UserResponse)
def update_user_profile(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user profile"""
    # Update fields
    if user_data.full_name:
        current_user.full_name = user_data.full_name
    if user_data.phone is not None:
        current_user.phone = user_data.phone
    if user_data.company_name is not None:
        current_user.company_name = user_data.company_name
    if user_data.company_logo is not None:
        current_user.company_logo = user_data.company_logo
    if user_data.address is not None:
        current_user.address = user_data.address
    if user_data.city is not None:
        current_user.city = user_data.city
    if user_data.country is not None:
        current_user.country = user_data.country
    
    db.commit()
    db.refresh(current_user)
    
    return user_to_response(current_user)


@router.post("/change-password")
def change_password(
    password_data: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change user password"""
    from app.services.auth_service import verify_password, get_password_hash
    
    # Verify current password
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Update password
    current_user.hashed_password = get_password_hash(password_data.new_password)
    db.commit()
    
    return {"message": "Password updated successfully"}


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    """Logout user (token invalidation would be handled client-side)"""
    # In a more advanced setup, you could blacklist the token
    return {"message": "Logged out successfully"}


# ============== Vendor Routes ==============

@router.post("/vendor/register", response_model=VendorResponse)
def register_as_vendor(
    vendor_data: VendorCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Register current user as a vendor"""
    # Check if already a vendor
    if current_user.vendor_profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already registered as a vendor"
        )
    
    auth_service = AuthService(db)
    
    vendor = auth_service.create_vendor_profile(
        user_id=current_user.id,
        business_name=vendor_data.business_name,
        business_registration_number=vendor_data.business_registration_number,
        tax_id=vendor_data.tax_id,
        vendor_type=vendor_data.vendor_type,
        specializations=vendor_data.specializations
    )
    
    # Refresh to get relationships
    db.refresh(vendor)
    
    return VendorResponse(
        id=vendor.id,
        user_id=vendor.user_id,
        business_name=vendor.business_name,
        business_registration_number=vendor.business_registration_number,
        tax_id=vendor.tax_id,
        vendor_type=vendor.vendor_type,
        specializations=vendor.specializations,
        is_approved=vendor.is_approved,
        approved_at=vendor.approved_at,
        approved_by=vendor.approved_by,
        total_products=vendor.total_products,
        total_documents=vendor.total_documents,
        created_at=vendor.created_at,
        updated_at=vendor.updated_at,
        user=user_to_response(vendor.user) if vendor.user else None
    )


@router.get("/vendor/profile", response_model=VendorResponse)
def get_vendor_profile(
    user_vendor: tuple = Depends(require_vendor)
):
    """Get current vendor profile"""
    user, vendor = user_vendor
    
    return VendorResponse(
        id=vendor.id,
        user_id=vendor.user_id,
        business_name=vendor.business_name,
        business_registration_number=vendor.business_registration_number,
        tax_id=vendor.tax_id,
        vendor_type=vendor.vendor_type,
        specializations=vendor.specializations,
        is_approved=vendor.is_approved,
        approved_at=vendor.approved_at,
        approved_by=vendor.approved_by,
        total_products=vendor.total_products,
        total_documents=vendor.total_documents,
        created_at=vendor.created_at,
        updated_at=vendor.updated_at,
        user=user_to_response(vendor.user) if vendor.user else None
    )


@router.put("/vendor/profile", response_model=VendorResponse)
def update_vendor_profile(
    vendor_data: VendorUpdate,
    user_vendor: tuple = Depends(require_vendor),
    db: Session = Depends(get_db)
):
    """Update vendor profile"""
    user, vendor = user_vendor
    
    # Update fields
    if vendor_data.business_name:
        vendor.business_name = vendor_data.business_name
    if vendor_data.business_registration_number is not None:
        vendor.business_registration_number = vendor_data.business_registration_number
    if vendor_data.tax_id is not None:
        vendor.tax_id = vendor_data.tax_id
    if vendor_data.vendor_type is not None:
        vendor.vendor_type = vendor_data.vendor_type
    if vendor_data.specializations is not None:
        vendor.specializations = vendor_data.specializations
    
    db.commit()
    db.refresh(vendor)
    
    return VendorResponse(
        id=vendor.id,
        user_id=vendor.user_id,
        business_name=vendor.business_name,
        business_registration_number=vendor.business_registration_number,
        tax_id=vendor.tax_id,
        vendor_type=vendor.vendor_type,
        specializations=vendor.specializations,
        is_approved=vendor.is_approved,
        approved_at=vendor.approved_at,
        approved_by=vendor.approved_by,
        total_products=vendor.total_products,
        total_documents=vendor.total_documents,
        created_at=vendor.created_at,
        updated_at=vendor.updated_at,
        user=user_to_response(vendor.user) if vendor.user else None
    )


# ============== Admin Routes ==============

@router.get("/users", response_model=list[UserResponse])
def list_users(
    role: Optional[UserRole] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """List all users (admin only)"""
    query = db.query(User)
    
    if role:
        query = query.filter(User.role == role)
    
    users = query.offset(skip).limit(limit).all()
    return [user_to_response(u) for u in users]


@router.get("/vendors/pending", response_model=list[VendorResponse])
def list_pending_vendors(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """List pending vendor approvals (admin only)"""
    vendors = db.query(Vendor).filter(Vendor.is_approved == False).all()
    
    return [
        VendorResponse(
            id=v.id,
            user_id=v.user_id,
            business_name=v.business_name,
            business_registration_number=v.business_registration_number,
            tax_id=v.tax_id,
            vendor_type=v.vendor_type,
            specializations=v.specializations,
            is_approved=v.is_approved,
            approved_at=v.approved_at,
            approved_by=v.approved_by,
            total_products=v.total_products,
            total_documents=v.total_documents,
            created_at=v.created_at,
            updated_at=v.updated_at,
            user=user_to_response(v.user) if v.user else None
        )
        for v in vendors
    ]


@router.post("/vendors/{vendor_id}/approve", response_model=VendorResponse)
def approve_vendor(
    vendor_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Approve a vendor (admin only)"""
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found"
        )
    
    vendor.is_approved = True
    vendor.approved_at = datetime.utcnow()
    vendor.approved_by = current_user.id
    
    db.commit()
    db.refresh(vendor)
    
    return VendorResponse(
        id=vendor.id,
        user_id=vendor.user_id,
        business_name=vendor.business_name,
        business_registration_number=vendor.business_registration_number,
        tax_id=vendor.tax_id,
        vendor_type=vendor.vendor_type,
        specializations=vendor.specializations,
        is_approved=vendor.is_approved,
        approved_at=vendor.approved_at,
        approved_by=vendor.approved_by,
        total_products=vendor.total_products,
        total_documents=vendor.total_documents,
        created_at=vendor.created_at,
        updated_at=vendor.updated_at,
        user=user_to_response(vendor.user) if vendor.user else None
    )


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Delete a user (admin only)"""
    # Prevent self-deletion
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    db.delete(user)
    db.commit()
    
    return {"message": "User deleted successfully"}


from datetime import datetime
