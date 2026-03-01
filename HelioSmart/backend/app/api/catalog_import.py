"""Catalog Import API - Handles product catalog upload and AI extraction"""
import os
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import (
    Vendor, ProductCatalogUpload, ExtractionStatus, 
    StagingProduct, StagingProductStatus
)
from app.services.auth_service import require_vendor
from app.services.product_import_pipeline import ProductImportPipeline
from app.services.llm_product_extractor import get_product_extractor

router = APIRouter(prefix="/catalog", tags=["Catalog Import"])

# Upload directory
UPLOAD_DIR = "uploads/product_catalogs"
os.makedirs(UPLOAD_DIR, exist_ok=True)


ALLOWED_EXTENSIONS = {'.pdf', '.csv', '.xlsx', '.xls'}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


@router.post("/upload")
async def upload_catalog(
    file: UploadFile = File(...),
    vendor_data: tuple = Depends(require_vendor),
    db: Session = Depends(get_db)
):
    """Upload a product catalog document for AI extraction"""
    current_user, vendor = vendor_data
    
    # Validate file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Read file content
    content = await file.read()
    
    # Validate file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE / 1024 / 1024}MB"
        )
    
    # Generate unique filename
    safe_filename = f"{vendor.id}_{int(os.path.getmtime(UPLOAD_DIR) if os.path.exists(UPLOAD_DIR) else 0)}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    
    # Save file
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Create upload record
    upload = ProductCatalogUpload(
        vendor_id=vendor.id,
        document_name=file.filename,
        document_type=file_ext[1:],  # Remove dot
        file_path=file_path,
        file_size=len(content),
        status=ExtractionStatus.PENDING.value,
        progress_percentage=0
    )
    
    db.add(upload)
    db.commit()
    db.refresh(upload)
    
    return {
        "success": True,
        "upload_id": upload.id,
        "document_name": file.filename,
        "status": "pending",
        "message": "File uploaded successfully. Starting AI extraction..."
    }


@router.post("/{upload_id}/extract")
def extract_products(
    upload_id: int,
    vendor_data: tuple = Depends(require_vendor),
    db: Session = Depends(get_db)
):
    """Start AI extraction process for uploaded catalog"""
    current_user, vendor = vendor_data
    
    # Get upload
    upload = db.query(ProductCatalogUpload).filter(
        ProductCatalogUpload.id == upload_id,
        ProductCatalogUpload.vendor_id == vendor.id
    ).first()
    
    if not upload:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Upload not found"
        )
    
    if upload.status not in [ExtractionStatus.PENDING.value, ExtractionStatus.FAILED.value]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot extract - current status: {upload.status}"
        )
    
    # Start extraction pipeline
    pipeline = ProductImportPipeline(db)
    result = pipeline.process_upload(upload_id)
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result["error"]
        )
    
    return {
        "success": True,
        "upload_id": upload_id,
        "products_extracted": result["products_extracted"],
        "status": "review",
        "message": f"Extracted {result['products_extracted']} products. Please review and validate."
    }


@router.get("/{upload_id}/status")
async def get_extraction_status(
    upload_id: int,
    vendor_data: tuple = Depends(require_vendor),
    db: Session = Depends(get_db)
):
    """Get extraction status and progress"""
    current_user, vendor = vendor_data
    
    pipeline = ProductImportPipeline(db)
    status = pipeline.get_upload_status(upload_id)
    
    if not status:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Upload not found"
        )
    
    # Verify ownership
    upload = db.query(ProductCatalogUpload).filter(
        ProductCatalogUpload.id == upload_id
    ).first()
    
    if upload.vendor_id != vendor.id and current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    return status


@router.get("/{upload_id}/products")
async def get_staging_products(
    upload_id: int,
    status: Optional[str] = None,
    vendor_data: tuple = Depends(require_vendor),
    db: Session = Depends(get_db)
):
    """Get extracted products awaiting validation"""
    current_user, vendor = vendor_data
    
    # Verify ownership
    upload = db.query(ProductCatalogUpload).filter(
        ProductCatalogUpload.id == upload_id
    ).first()
    
    if not upload:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Upload not found"
        )
    
    if upload.vendor_id != vendor.id and current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Get products
    pipeline = ProductImportPipeline(db)
    products = pipeline.get_staging_products(upload_id, status)
    
    return {
        "upload_id": upload_id,
        "total_products": len(products),
        "products": [
            {
                "id": p.id,
                "name": p.name,
                "sku": p.sku,
                "brand": p.brand,
                "model": p.model,
                "category": p.category,
                "subcategory": p.subcategory,
                "description": p.description,
                "specifications": p.specifications,
                "price": p.price,
                "currency": p.currency,
                "unit": p.unit,
                "stock_quantity": p.stock_quantity,
                "availability_status": p.availability_status,
                "warranty_years": p.warranty_years,
                "extraction_confidence": p.extraction_confidence,
                "status": p.status,
                "vendor_notes": p.vendor_notes,
                "created_at": p.created_at
            }
            for p in products
        ]
    }


@router.put("/products/{staging_id}")
async def update_staging_product(
    staging_id: int,
    updates: dict,
    vendor_data: tuple = Depends(require_vendor),
    db: Session = Depends(get_db)
):
    """Update a staging product before validation"""
    current_user, vendor = vendor_data
    
    # Get product
    product = db.query(StagingProduct).filter(
        StagingProduct.id == staging_id
    ).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    if product.vendor_id != vendor.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Update
    pipeline = ProductImportPipeline(db)
    updated = pipeline.update_staging_product(staging_id, updates)
    
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update product"
        )
    
    return {
        "success": True,
        "message": "Product updated successfully",
        "product_id": staging_id
    }


@router.post("/products/validate")
async def validate_products(
    request: dict,
    vendor_data: tuple = Depends(require_vendor),
    db: Session = Depends(get_db)
):
    """Validate (approve/reject) staging products"""
    current_user, vendor = vendor_data
    
    staging_ids = request.get("staging_ids", [])
    action = request.get("action")  # "approve" or "reject"
    
    if not staging_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No products specified"
        )
    
    if action not in ["approve", "reject"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid action. Must be 'approve' or 'reject'"
        )
    
    # Verify all products belong to this vendor
    products = db.query(StagingProduct).filter(
        StagingProduct.id.in_(staging_ids)
    ).all()
    
    for p in products:
        if p.vendor_id != vendor.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied for product {p.id}"
            )
    
    # Validate
    pipeline = ProductImportPipeline(db)
    result = pipeline.validate_staging_products(staging_ids, action)
    
    return {
        "success": True,
        "action": action,
        "updated": result["updated"],
        "total": result["total"]
    }


@router.post("/products/import")
async def import_products(
    request: dict,
    vendor_data: tuple = Depends(require_vendor),
    db: Session = Depends(get_db)
):
    """Import approved staging products to products table"""
    current_user, vendor = vendor_data
    
    staging_ids = request.get("staging_ids", [])
    
    if not staging_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No products specified"
        )
    
    # Verify all products belong to this vendor and are approved
    products = db.query(StagingProduct).filter(
        StagingProduct.id.in_(staging_ids),
        StagingProduct.vendor_id == vendor.id,
        StagingProduct.status == StagingProductStatus.APPROVED.value
    ).all()
    
    approved_ids = [p.id for p in products]
    
    if len(approved_ids) != len(staging_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Some products not found or not approved"
        )
    
    # Import
    pipeline = ProductImportPipeline(db)
    result = pipeline.import_to_products(approved_ids)
    
    return {
        "success": result["success"],
        "imported": result["imported"],
        "failed": result["failed"],
        "failed_details": result.get("failed_details", [])
    }


@router.get("/uploads")
async def list_uploads(
    vendor_data: tuple = Depends(require_vendor),
    db: Session = Depends(get_db)
):
    """List all catalog uploads for the vendor"""
    current_user, vendor = vendor_data
    
    uploads = db.query(ProductCatalogUpload).filter(
        ProductCatalogUpload.vendor_id == vendor.id
    ).order_by(ProductCatalogUpload.created_at.desc()).all()
    
    return {
        "uploads": [
            {
                "id": u.id,
                "document_name": u.document_name,
                "document_type": u.document_type,
                "status": u.status,
                "progress": u.progress_percentage,
                "extracted_count": u.extracted_products_count,
                "validated_count": u.validated_products_count,
                "imported_count": u.imported_products_count,
                "created_at": u.created_at,
                "error": u.error_message
            }
            for u in uploads
        ]
    }


@router.get("/ollama/status")
async def check_ollama_status():
    """Check if Ollama is running and model is available (public endpoint)"""
    try:
        extractor = get_product_extractor()
        status = await extractor.check_ollama_status()
        return status
    except Exception as e:
        return {"available": False, "error": str(e)}
