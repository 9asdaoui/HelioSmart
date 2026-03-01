"""Authentication and User Schemas"""
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    """User role enumeration"""
    GUEST = "guest"
    USER = "user"
    VENDOR = "vendor"
    ENGINEER = "engineer"
    ADMIN = "admin"


class UserStatus(str, Enum):
    """User account status"""
    PENDING = "pending"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    DELETED = "deleted"


class ProductStatus(str, Enum):
    """Product status enumeration"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    ARCHIVED = "archived"


class DocumentStatus(str, Enum):
    """Document processing status"""
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    EXTRACTED = "extracted"
    APPROVED = "approved"
    REJECTED = "rejected"
    ERROR = "error"


# ============== User Schemas ==============

class UserBase(BaseModel):
    """Base user schema"""
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    company_name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None


class UserCreate(BaseModel):
    """User registration schema"""
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    full_name: str = Field(..., min_length=2, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    role: UserRole = UserRole.GUEST


class UserUpdate(BaseModel):
    """User update schema"""
    full_name: Optional[str] = Field(None, min_length=2, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    company_name: Optional[str] = None
    company_logo: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None


class UserResponse(UserBase):
    """User response schema"""
    id: int
    role: UserRole
    status: UserStatus
    is_verified: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserInToken(BaseModel):
    """User data embedded in JWT token"""
    id: int
    email: str
    role: UserRole


# ============== Authentication Schemas ==============

class LoginRequest(BaseModel):
    """Login request schema"""
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Token response schema"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds
    user: UserResponse


class TokenPayload(BaseModel):
    """JWT token payload"""
    sub: str  # user id
    exp: int  # expiration timestamp
    type: str = "access"
    role: Optional[str] = None


class PasswordChangeRequest(BaseModel):
    """Password change request"""
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=100)


class PasswordResetRequest(BaseModel):
    """Password reset request"""
    email: EmailStr


# ============== Vendor Schemas ==============

class VendorBase(BaseModel):
    """Base vendor schema"""
    business_name: str = Field(..., min_length=2, max_length=255)
    business_registration_number: Optional[str] = None
    tax_id: Optional[str] = None
    vendor_type: Optional[str] = None
    specializations: List[str] = []


class VendorCreate(VendorBase):
    """Vendor creation schema"""
    user_id: int


class VendorUpdate(BaseModel):
    """Vendor update schema"""
    business_name: Optional[str] = Field(None, min_length=2, max_length=255)
    business_registration_number: Optional[str] = None
    tax_id: Optional[str] = None
    vendor_type: Optional[str] = None
    specializations: Optional[List[str]] = None


class VendorResponse(VendorBase):
    """Vendor response schema"""
    id: int
    user_id: int
    is_approved: bool
    approved_at: Optional[datetime] = None
    approved_by: Optional[int] = None
    total_products: int
    total_documents: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    user: Optional[UserResponse] = None

    class Config:
        from_attributes = True


class VendorWithUser(BaseModel):
    """Vendor with embedded user data"""
    id: int
    business_name: str
    user: UserResponse
    is_approved: bool
    total_products: int
    created_at: datetime

    class Config:
        from_attributes = True


# ============== Product Schemas ==============

class ProductBase(BaseModel):
    """Base product schema"""
    name: str = Field(..., min_length=1, max_length=255)
    sku: Optional[str] = None
    description: Optional[str] = None
    category: str  # panels, inverters, batteries, mounting, etc.
    subcategory: Optional[str] = None
    price: Optional[str] = None
    currency: str = "MAD"
    unit: Optional[str] = None
    specifications: Dict[str, Any] = {}


class ProductCreate(ProductBase):
    """Product creation schema"""
    vendor_id: int
    source_document_id: Optional[int] = None
    extracted_data: Optional[Dict[str, Any]] = None


class ProductUpdate(BaseModel):
    """Product update schema"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    sku: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    price: Optional[str] = None
    specifications: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class ProductApproveRequest(BaseModel):
    """Product approval request"""
    is_approved: bool
    rejection_reason: Optional[str] = None


class ProductResponse(ProductBase):
    """Product response schema"""
    id: int
    vendor_id: int
    status: ProductStatus
    is_active: bool
    source_document_id: Optional[int] = None
    extracted_data: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    vendor: Optional[VendorResponse] = None

    class Config:
        from_attributes = True


class ProductListResponse(BaseModel):
    """Product list response with pagination"""
    items: List[ProductResponse]
    total: int
    page: int
    page_size: int


# ============== Document Schemas ==============

class DocumentUploadResponse(BaseModel):
    """Document upload response"""
    id: int
    filename: str
    original_filename: str
    file_size: int
    file_type: str
    status: DocumentStatus
    uploaded_at: datetime


class DocumentExtractionResponse(BaseModel):
    """Document extraction result"""
    document_id: int
    status: DocumentStatus
    extracted_data: Optional[Dict[str, Any]] = None
    extraction_confidence: Optional[float] = None
    extracted_product_count: int = 0
    processing_error: Optional[str] = None


class VendorApprovalRequest(BaseModel):
    """Vendor approval of extracted products"""
    approved_product_ids: List[int] = []
    rejected_product_ids: List[int] = []
    notes: Optional[str] = None


class VendorDocumentResponse(BaseModel):
    """Vendor document response"""
    id: int
    vendor_id: int
    filename: str
    original_filename: str
    file_size: Optional[int]
    file_type: Optional[str]
    status: DocumentStatus
    extraction_confidence: Optional[float]
    is_vendor_approved: bool
    vendor_approved_at: Optional[datetime]
    vendor_notes: Optional[str]
    uploaded_at: datetime
    processed_at: Optional[datetime]
    extracted_products: List[ProductResponse] = []

    class Config:
        from_attributes = True


# ============== Dashboard Schemas ==============

class VendorDashboardStats(BaseModel):
    """Vendor dashboard statistics"""
    total_products: int
    approved_products: int
    pending_products: int
    total_documents: int
    documents_processing: int
    documents_approved: int
    recent_products: List[ProductResponse]
    recent_documents: List[VendorDocumentResponse]


class VendorLiteResponse(BaseModel):
    """Light vendor response for public listings"""
    id: int
    business_name: str
    vendor_type: Optional[str]
    specializations: List[str]
    total_products: int
    country: Optional[str]

    class Config:
        from_attributes = True


class PublicVendorListResponse(BaseModel):
    """Public vendor list response"""
    items: List[VendorLiteResponse]
    total: int
    page: int
    page_size: int


# ============== Admin Schemas ==============

class UserStatusUpdate(BaseModel):
    """User status update request"""
    status: str  # pending, active, suspended, deleted
    
    @validator('status')
    def validate_status(cls, v):
        allowed = ['pending', 'active', 'suspended', 'deleted']
        if v not in allowed:
            raise ValueError(f"Status must be one of: {', '.join(allowed)}")
        return v


class AdminStatsResponse(BaseModel):
    """Admin dashboard statistics response"""
    users: dict
    vendors: dict
    products: dict
    documents: dict
    estimations: dict


class DataOverviewResponse(BaseModel):
    """System data overview response"""
    panels: dict
    inverters: dict
    utilities: dict
    estimations: dict
