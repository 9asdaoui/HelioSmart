import enum
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Float, Enum as SQLEnum, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class UserRole(str, enum.Enum):
    """User role enumeration"""
    GUEST = "guest"
    USER = "user"
    VENDOR = "vendor"
    ENGINEER = "engineer"
    ADMIN = "admin"


class UserStatus(str, enum.Enum):
    """User account status"""
    PENDING = "pending"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    DELETED = "deleted"


class User(Base):
    """User model with role-based authentication"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    
    # Role and status
    role = Column(SQLEnum(UserRole), default=UserRole.GUEST, nullable=False)
    status = Column(SQLEnum(UserStatus), default=UserStatus.PENDING, nullable=False)
    
    # Email verification
    is_verified = Column(Boolean, default=False, nullable=False)
    verification_token = Column(String(255), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    # Profile data
    company_name = Column(String(255), nullable=True)
    company_logo = Column(String(500), nullable=True)
    address = Column(String(500), nullable=True)
    city = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True)
    
    # Relations
    vendor_profile = relationship("Vendor", back_populates="user", uselist=False, foreign_keys="Vendor.user_id")
    documents = relationship("VendorDocument", back_populates="uploaded_by")


class Vendor(Base):
    """Vendor profile model - extends User for vendor-specific details"""
    __tablename__ = "vendors"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    # Business details
    business_name = Column(String(255), nullable=False)
    business_registration_number = Column(String(100), nullable=True)
    tax_id = Column(String(100), nullable=True)
    
    # Vendor type and specialties
    vendor_type = Column(String(100), nullable=True)  # installer, distributor, manufacturer, etc.
    specializations = Column(JSON, default=list, nullable=True)  # ["residential", "commercial", "utility-scale"]
    
    # Status
    is_approved = Column(Boolean, default=False, nullable=False)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    approved_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Metrics
    total_products = Column(Integer, default=0, nullable=False)
    total_documents = Column(Integer, default=0, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    
    # Relations
    user = relationship("User", back_populates="vendor_profile", foreign_keys=[user_id])
    approved_by_user = relationship("User", foreign_keys=[approved_by])
    products = relationship("Product", back_populates="vendor", cascade="all, delete-orphan")
    documents = relationship("VendorDocument", back_populates="vendor", cascade="all, delete-orphan")
    catalog_uploads = relationship("ProductCatalogUpload", back_populates="vendor", cascade="all, delete-orphan")
    staging_products = relationship("StagingProduct", back_populates="vendor", cascade="all, delete-orphan")


class ProductStatus(str, enum.Enum):
    """Product status enumeration"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    ARCHIVED = "archived"


class Product(Base):
    """Product model - vendors' inventory items"""
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Product details
    name = Column(String(255), nullable=False)
    sku = Column(String(100), nullable=True, index=True)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=False, index=True)  # panels, inverters, batteries, mounting, etc.
    subcategory = Column(String(100), nullable=True)
    
    # Pricing
    price = Column(String(50), nullable=True)  # Stored as string for flexibility
    currency = Column(String(10), default="MAD", nullable=False)
    unit = Column(String(50), nullable=True)  # per unit, per watt, etc.
    
    # Technical specifications (flexible JSON)
    specifications = Column(JSON, default=dict, nullable=True)
    
    # Status
    status = Column(SQLEnum(ProductStatus), default=ProductStatus.PENDING, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Source document tracking
    source_document_id = Column(Integer, ForeignKey("vendor_documents.id", ondelete="SET NULL"), nullable=True)
    extracted_data = Column(JSON, nullable=True)  # Raw data from LLM extraction
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relations
    vendor = relationship("Vendor", back_populates="products")
    source_document = relationship("VendorDocument", back_populates="extracted_products")


class DocumentStatus(str, enum.Enum):
    """Document processing status"""
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    EXTRACTED = "extracted"
    APPROVED = "approved"
    REJECTED = "rejected"
    ERROR = "error"


class VendorDocument(Base):
    """Vendor document model - stores uploaded catalogs and price lists"""
    __tablename__ = "vendor_documents"
    
    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False, index=True)
    uploaded_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # File details
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=True)  # in bytes
    file_type = Column(String(100), nullable=True)  # MIME type
    file_extension = Column(String(20), nullable=True)
    
    # Document content (for text-based files)
    extracted_text = Column(Text, nullable=True)
    
    # Processing
    status = Column(SQLEnum(DocumentStatus), default=DocumentStatus.UPLOADED, nullable=False)
    processing_error = Column(Text, nullable=True)
    
    # LLM extraction results
    extracted_data = Column(JSON, nullable=True)  # Structured data from LLM
    extraction_confidence = Column(Float, nullable=True)  # 0.0 to 1.0
    
    # Vendor approval
    is_vendor_approved = Column(Boolean, default=False, nullable=False)
    vendor_approved_at = Column(DateTime(timezone=True), nullable=True)
    vendor_notes = Column(Text, nullable=True)
    
    # Timestamps
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    processed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relations
    vendor = relationship("Vendor", back_populates="documents")
    uploaded_by = relationship("User", back_populates="documents")
    extracted_products = relationship("Product", back_populates="source_document")


class ExtractionStatus(str, enum.Enum):
    """Product catalog extraction status"""
    PENDING = "pending"
    PROCESSING = "processing"
    EXTRACTING = "extracting"
    REVIEW = "review"
    COMPLETED = "completed"
    FAILED = "failed"


class StagingProductStatus(str, enum.Enum):
    """Staging product validation status"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    MODIFIED = "modified"


class ProductCatalogUpload(Base):
    """Tracks catalog document uploads and extraction progress"""
    __tablename__ = "product_catalog_uploads"
    
    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Document info
    document_name = Column(String(255), nullable=False)
    document_type = Column(String(50), nullable=False)  # pdf, csv, xlsx
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=True)
    
    # Processing status - using String instead of native enum to avoid case-sensitivity issues
    status = Column(String(20), default=ExtractionStatus.PENDING.value, nullable=False)
    progress_percentage = Column(Integer, default=0, nullable=False)  # 0-100
    current_step = Column(String(100), nullable=True)  # Current processing step description
    
    # Counters
    extracted_products_count = Column(Integer, default=0, nullable=False)
    validated_products_count = Column(Integer, default=0, nullable=False)
    imported_products_count = Column(Integer, default=0, nullable=False)
    
    # Error tracking
    error_message = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    processed_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relations
    vendor = relationship("Vendor", back_populates="catalog_uploads")
    staged_products = relationship("StagingProduct", back_populates="upload", cascade="all, delete-orphan")


class StagingProduct(Base):
    """Temporary storage for extracted products awaiting vendor validation"""
    __tablename__ = "staging_products"
    
    id = Column(Integer, primary_key=True, index=True)
    upload_id = Column(Integer, ForeignKey("product_catalog_uploads.id", ondelete="CASCADE"), nullable=False, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Product fields (matches Product model)
    name = Column(String(255), nullable=False)
    sku = Column(String(100), nullable=True)
    brand = Column(String(100), nullable=True)
    model = Column(String(100), nullable=True)
    category = Column(String(100), nullable=False)  # panels, inverters, batteries, mounting, etc.
    subcategory = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    
    # Technical specifications (JSONB for flexibility)
    specifications = Column(JSON, default=dict, nullable=True)
    
    # Pricing
    price = Column(String(50), nullable=True)
    currency = Column(String(10), default="MAD", nullable=False)
    unit = Column(String(50), nullable=True)
    
    # Availability
    stock_quantity = Column(Integer, nullable=True)
    availability_status = Column(String(50), nullable=True)  # in_stock, out_of_stock, pre_order
    
    # Warranty
    warranty_years = Column(Integer, nullable=True)
    warranty_description = Column(Text, nullable=True)
    
    # Images
    image_urls = Column(JSON, default=list, nullable=True)  # Array of image URLs
    datasheet_url = Column(String(500), nullable=True)
    
    # Extraction metadata
    extraction_confidence = Column(Float, nullable=True)  # 0.0 to 1.0
    source_page = Column(Integer, nullable=True)  # For PDFs
    raw_extraction_data = Column(JSON, nullable=True)  # Store original LLM output
    
    # Validation status - using String instead of native enum to avoid case-sensitivity issues
    status = Column(String(20), default=StagingProductStatus.PENDING.value, nullable=False)
    vendor_notes = Column(Text, nullable=True)
    
    # Import tracking
    imported_product_id = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    
    # Relations
    upload = relationship("ProductCatalogUpload", back_populates="staged_products")
    vendor = relationship("Vendor", back_populates="staging_products")
    imported_product = relationship("Product")
