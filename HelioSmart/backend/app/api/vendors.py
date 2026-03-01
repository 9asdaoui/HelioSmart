"""Vendor API Routes - Document uploads, products, and vendor listings"""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import Vendor, Product, ProductStatus, VendorDocument, DocumentStatus, User
from app.schemas.auth import (
    VendorResponse, ProductResponse, ProductListResponse,
    DocumentUploadResponse, DocumentExtractionResponse, VendorDocumentResponse,
    VendorApprovalRequest, VendorDashboardStats, VendorLiteResponse,
    PublicVendorListResponse, ProductCreate, ProductUpdate
)
from app.services.auth_service import require_vendor, require_admin, get_current_user_optional, user_to_response
from app.services.document_service import DocumentService

router = APIRouter(prefix="/vendors", tags=["Vendors"])


# ============== Public Vendor Listings ==============

@router.get("/public", response_model=PublicVendorListResponse)
def list_public_vendors(
    search: Optional[str] = Query(None, description="Search by business name"),
    vendor_type: Optional[str] = Query(None, description="Filter by vendor type"),
    country: Optional[str] = Query(None, description="Filter by country"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """List approved vendors for public viewing"""
    query = db.query(Vendor).filter(Vendor.is_approved == True)
    
    if search:
        query = query.filter(Vendor.business_name.ilike(f"%{search}%"))
    
    if vendor_type:
        query = query.filter(Vendor.vendor_type == vendor_type)
    
    # Note: Country filter would require joining with User table
    if country:
        query = query.join(User).filter(User.country == country)
    
    total = query.count()
    vendors = query.offset((page - 1) * page_size).limit(page_size).all()
    
    items = []
    for vendor in vendors:
        items.append(VendorLiteResponse(
            id=vendor.id,
            business_name=vendor.business_name,
            vendor_type=vendor.vendor_type,
            specializations=vendor.specializations or [],
            total_products=vendor.total_products,
            country=vendor.user.country if vendor.user else None
        ))
    
    return PublicVendorListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/{vendor_id}/public", response_model=VendorLiteResponse)
def get_public_vendor(
    vendor_id: int,
    db: Session = Depends(get_db)
):
    """Get public vendor details"""
    vendor = db.query(Vendor).filter(
        Vendor.id == vendor_id,
        Vendor.is_approved == True
    ).first()
    
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found"
        )
    
    return VendorLiteResponse(
        id=vendor.id,
        business_name=vendor.business_name,
        vendor_type=vendor.vendor_type,
        specializations=vendor.specializations or [],
        total_products=vendor.total_products,
        country=vendor.user.country if vendor.user else None
    )


@router.get("/{vendor_id}/products/public", response_model=ProductListResponse)
def get_public_vendor_products(
    vendor_id: int,
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get approved products from a vendor (public)"""
    # Verify vendor exists and is approved
    vendor = db.query(Vendor).filter(
        Vendor.id == vendor_id,
        Vendor.is_approved == True
    ).first()
    
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found"
        )
    
    query = db.query(Product).filter(
        Product.vendor_id == vendor_id,
        Product.status == ProductStatus.APPROVED,
        Product.is_active == True
    )
    
    if category:
        query = query.filter(Product.category == category)
    
    if search:
        query = query.filter(Product.name.ilike(f"%{search}%"))
    
    total = query.count()
    products = query.offset((page - 1) * page_size).limit(page_size).all()
    
    items = [_product_to_response(p) for p in products]
    
    return ProductListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size
    )


# ============== Vendor Document Management ==============

@router.post("/documents/upload", response_model=DocumentUploadResponse)
def upload_document(
    file: UploadFile = File(...),
    user_vendor: tuple = Depends(require_vendor),
    db: Session = Depends(get_db)
):
    """Upload a product catalog or price list document"""
    user, vendor = user_vendor
    
    doc_service = DocumentService(db)
    document = doc_service.upload_document(vendor, file, uploaded_by_id=user.id)
    
    return DocumentUploadResponse(
        id=document.id,
        filename=document.filename,
        original_filename=document.original_filename,
        file_size=document.file_size or 0,
        file_type=document.file_type or "",
        status=document.status,
        uploaded_at=document.uploaded_at
    )


@router.post("/documents/{document_id}/process", response_model=DocumentExtractionResponse)
def process_document(
    document_id: int,
    user_vendor: tuple = Depends(require_vendor),
    db: Session = Depends(get_db)
):
    """Process uploaded document with LLM to extract products"""
    user, vendor = user_vendor
    
    doc_service = DocumentService(db)
    
    # Get document and verify ownership
    document = doc_service.get_document_by_id(document_id, vendor_id=vendor.id)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Process document
    result = doc_service.process_document(document)
    
    return result


@router.get("/documents", response_model=List[VendorDocumentResponse])
def list_vendor_documents(
    status: Optional[DocumentStatus] = None,
    user_vendor: tuple = Depends(require_vendor),
    db: Session = Depends(get_db)
):
    """List all documents for the current vendor"""
    user, vendor = user_vendor
    
    query = db.query(VendorDocument).filter(VendorDocument.vendor_id == vendor.id)
    
    if status:
        query = query.filter(VendorDocument.status == status)
    
    documents = query.order_by(VendorDocument.uploaded_at.desc()).all()
    
    return [_document_to_response(d) for d in documents]


@router.get("/documents/{document_id}", response_model=VendorDocumentResponse)
def get_document(
    document_id: int,
    user_vendor: tuple = Depends(require_vendor),
    db: Session = Depends(get_db)
):
    """Get document details with extracted products"""
    user, vendor = user_vendor
    
    document = db.query(VendorDocument).filter(
        VendorDocument.id == document_id,
        VendorDocument.vendor_id == vendor.id
    ).first()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    return _document_to_response(document)


@router.post("/documents/{document_id}/approve", response_model=List[ProductResponse])
def approve_extracted_products(
    document_id: int,
    approval_data: VendorApprovalRequest,
    user_vendor: tuple = Depends(require_vendor),
    db: Session = Depends(get_db)
):
    """Approve or reject products extracted from a document"""
    user, vendor = user_vendor
    
    doc_service = DocumentService(db)
    
    # Get document
    document = doc_service.get_document_by_id(document_id, vendor_id=vendor.id)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Approve products
    approved = doc_service.approve_extracted_products(
        document=document,
        approved_product_ids=approval_data.approved_product_ids,
        rejected_product_ids=approval_data.rejected_product_ids,
        notes=approval_data.notes
    )
    
    return [_product_to_response(p) for p in approved]


@router.delete("/documents/{document_id}")
def delete_document(
    document_id: int,
    user_vendor: tuple = Depends(require_vendor),
    db: Session = Depends(get_db)
):
    """Delete a document and its extracted products"""
    user, vendor = user_vendor
    
    document = db.query(VendorDocument).filter(
        VendorDocument.id == document_id,
        VendorDocument.vendor_id == vendor.id
    ).first()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Delete associated products
    db.query(Product).filter(Product.source_document_id == document_id).delete()
    
    # Delete file from disk
    import os
    if os.path.exists(document.file_path):
        os.remove(document.file_path)
    
    # Update vendor document count
    vendor.total_documents -= 1
    
    # Delete document record
    db.delete(document)
    db.commit()
    
    return {"message": "Document deleted successfully"}


# ============== Vendor Product Management ==============

@router.get("/products", response_model=ProductListResponse)
def list_vendor_products(
    status: Optional[ProductStatus] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user_vendor: tuple = Depends(require_vendor),
    db: Session = Depends(get_db)
):
    """List all products for the current vendor"""
    user, vendor = user_vendor
    
    query = db.query(Product).filter(Product.vendor_id == vendor.id)
    
    if status:
        query = query.filter(Product.status == status)
    
    if category:
        query = query.filter(Product.category == category)
    
    if search:
        query = query.filter(Product.name.ilike(f"%{search}%"))
    
    total = query.count()
    products = query.order_by(Product.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    
    items = [_product_to_response(p) for p in products]
    
    return ProductListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size
    )


@router.post("/products", response_model=ProductResponse)
def create_product(
    product_data: ProductCreate,
    user_vendor: tuple = Depends(require_vendor),
    db: Session = Depends(get_db)
):
    """Create a new product manually"""
    user, vendor = user_vendor
    
    product = Product(
        vendor_id=vendor.id,
        name=product_data.name,
        sku=product_data.sku,
        description=product_data.description,
        category=product_data.category,
        subcategory=product_data.subcategory,
        price=product_data.price,
        currency=product_data.currency,
        unit=product_data.unit,
        specifications=product_data.specifications,
        status=ProductStatus.PENDING,  # Requires admin approval
        is_active=True
    )
    
    db.add(product)
    vendor.total_products += 1
    db.commit()
    db.refresh(product)
    
    return _product_to_response(product)


@router.get("/products/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    user_vendor: tuple = Depends(require_vendor),
    db: Session = Depends(get_db)
):
    """Get product details"""
    user, vendor = user_vendor
    
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.vendor_id == vendor.id
    ).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    return _product_to_response(product)


@router.put("/products/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    product_data: ProductUpdate,
    user_vendor: tuple = Depends(require_vendor),
    db: Session = Depends(get_db)
):
    """Update a product"""
    user, vendor = user_vendor
    
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.vendor_id == vendor.id
    ).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Update fields
    if product_data.name is not None:
        product.name = product_data.name
    if product_data.sku is not None:
        product.sku = product_data.sku
    if product_data.description is not None:
        product.description = product_data.description
    if product_data.category is not None:
        product.category = product_data.category
    if product_data.subcategory is not None:
        product.subcategory = product_data.subcategory
    if product_data.price is not None:
        product.price = product_data.price
    if product_data.specifications is not None:
        product.specifications = product_data.specifications
    if product_data.is_active is not None:
        product.is_active = product_data.is_active
    
    db.commit()
    db.refresh(product)
    
    return _product_to_response(product)


@router.delete("/products/{product_id}")
def delete_product(
    product_id: int,
    user_vendor: tuple = Depends(require_vendor),
    db: Session = Depends(get_db)
):
    """Delete a product"""
    user, vendor = user_vendor
    
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.vendor_id == vendor.id
    ).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    db.delete(product)
    vendor.total_products -= 1
    db.commit()
    
    return {"message": "Product deleted successfully"}


# ============== Vendor Dashboard ==============

@router.get("/dashboard/stats", response_model=VendorDashboardStats)
def get_dashboard_stats(
    user_vendor: tuple = Depends(require_vendor),
    db: Session = Depends(get_db)
):
    """Get vendor dashboard statistics"""
    user, vendor = user_vendor
    
    # Count products by status
    total_products = db.query(Product).filter(Product.vendor_id == vendor.id).count()
    approved_products = db.query(Product).filter(
        Product.vendor_id == vendor.id,
        Product.status == ProductStatus.APPROVED
    ).count()
    pending_products = db.query(Product).filter(
        Product.vendor_id == vendor.id,
        Product.status == ProductStatus.PENDING
    ).count()
    
    # Count documents by status
    total_documents = db.query(VendorDocument).filter(VendorDocument.vendor_id == vendor.id).count()
    documents_processing = db.query(VendorDocument).filter(
        VendorDocument.vendor_id == vendor.id,
        VendorDocument.status == DocumentStatus.PROCESSING
    ).count()
    documents_approved = db.query(VendorDocument).filter(
        VendorDocument.vendor_id == vendor.id,
        VendorDocument.status == DocumentStatus.APPROVED
    ).count()
    
    # Recent products
    recent_products = db.query(Product).filter(
        Product.vendor_id == vendor.id
    ).order_by(Product.created_at.desc()).limit(5).all()
    
    # Recent documents
    recent_documents = db.query(VendorDocument).filter(
        VendorDocument.vendor_id == vendor.id
    ).order_by(VendorDocument.uploaded_at.desc()).limit(5).all()
    
    return VendorDashboardStats(
        total_products=total_products,
        approved_products=approved_products,
        pending_products=pending_products,
        total_documents=total_documents,
        documents_processing=documents_processing,
        documents_approved=documents_approved,
        recent_products=[_product_to_response(p) for p in recent_products],
        recent_documents=[_document_to_response(d) for d in recent_documents]
    )


# ============== Admin Product Management ==============

@router.get("/admin/products", response_model=ProductListResponse)
def admin_list_all_products(
    status: Optional[ProductStatus] = None,
    category: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """List all products from all vendors (admin only)"""
    query = db.query(Product)
    
    if status:
        query = query.filter(Product.status == status)
    
    if category:
        query = query.filter(Product.category == category)
    
    total = query.count()
    products = query.order_by(Product.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    
    items = [_product_to_response(p) for p in products]
    
    return ProductListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size
    )


@router.post("/admin/products/{product_id}/approve", response_model=ProductResponse)
def admin_approve_product(
    product_id: int,
    is_approved: bool = True,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Approve or reject a product (admin only)"""
    from datetime import datetime
    
    product = db.query(Product).filter(Product.id == product_id).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    if is_approved:
        product.status = ProductStatus.APPROVED
        product.approved_at = datetime.utcnow()
    else:
        product.status = ProductStatus.REJECTED
    
    db.commit()
    db.refresh(product)
    
    return _product_to_response(product)


# ============== Helper Functions ==============

def _product_to_response(product: Product) -> ProductResponse:
    """Convert Product model to ProductResponse"""
    return ProductResponse(
        id=product.id,
        vendor_id=product.vendor_id,
        name=product.name,
        sku=product.sku,
        description=product.description,
        category=product.category,
        subcategory=product.subcategory,
        price=product.price,
        currency=product.currency,
        unit=product.unit,
        specifications=product.specifications or {},
        status=product.status,
        is_active=product.is_active,
        source_document_id=product.source_document_id,
        extracted_data=product.extracted_data,
        created_at=product.created_at,
        updated_at=product.updated_at,
        approved_at=product.approved_at,
        vendor=None  # Could be populated if needed
    )


def _document_to_response(document: VendorDocument) -> VendorDocumentResponse:
    """Convert VendorDocument model to VendorDocumentResponse"""
    return VendorDocumentResponse(
        id=document.id,
        vendor_id=document.vendor_id,
        filename=document.filename,
        original_filename=document.original_filename,
        file_size=document.file_size,
        file_type=document.file_type,
        status=document.status,
        extraction_confidence=document.extraction_confidence,
        is_vendor_approved=document.is_vendor_approved,
        vendor_approved_at=document.vendor_approved_at,
        vendor_notes=document.vendor_notes,
        uploaded_at=document.uploaded_at,
        processed_at=document.processed_at,
        extracted_products=[_product_to_response(p) for p in document.extracted_products]
    )
