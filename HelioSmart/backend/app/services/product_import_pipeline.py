"""Product Import Pipeline - Orchestrates document parsing and LLM extraction"""
import os
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.user import (
    Vendor, ProductCatalogUpload, ExtractionStatus,
    StagingProduct, StagingProductStatus, Product, ProductStatus
)
from app.services.document_parser import get_document_parser
from app.services.llm_product_extractor import get_product_extractor


class ProductImportPipeline:
    """Pipeline for importing products from catalog documents"""
    
    def __init__(self, db: Session, model: str = "deepseek-coder:6.7b-instruct"):
        self.db = db
        self.parser = get_document_parser()
        self.extractor = get_product_extractor(model)
    
    def process_upload(self, upload_id: int) -> Dict[str, Any]:
        """Process a catalog upload through the full pipeline"""
        import asyncio
        
        upload = self.db.query(ProductCatalogUpload).filter(
            ProductCatalogUpload.id == upload_id
        ).first()
        
        if not upload:
            return {"success": False, "error": "Upload not found"}
        
        try:
            # Step 1: Parse document
            self._update_progress(upload, 10, "parsing", "Parsing document...")
            parsed_doc = self.parser.parse(upload.file_path)
            
            # Step 2: Extract text
            self._update_progress(upload, 30, "extracting", "Extracting text from document...")
            catalog_text = self.parser.extract_structured_text(upload.file_path)
            
            # Step 3: LLM extraction
            self._update_progress(upload, 50, "extracting", "AI extracting products...")
            extracted_products = asyncio.run(self.extractor.extract_products(catalog_text))
            
            if not extracted_products:
                upload.status = ExtractionStatus.FAILED.value
                upload.error_message = "No products could be extracted from the document"
                self.db.commit()
                return {"success": False, "error": "No products extracted"}
            
            # Step 4: Store in staging
            self._update_progress(upload, 80, "storing", "Storing products for review...")
            staged_count = self._store_staging_products(upload, extracted_products)
            
            # Step 5: Complete
            upload.status = ExtractionStatus.REVIEW.value
            upload.progress_percentage = 100
            upload.extracted_products_count = staged_count
            upload.processed_at = func.now()
            upload.current_step = "Extraction complete - awaiting vendor review"
            self.db.commit()
            
            return {
                "success": True,
                "upload_id": upload_id,
                "products_extracted": staged_count,
                "status": "review"
            }
            
        except Exception as e:
            upload.status = ExtractionStatus.FAILED.value
            upload.error_message = str(e)
            upload.progress_percentage = 0
            self.db.commit()
            return {"success": False, "error": str(e)}
    
    def _update_progress(self, upload: ProductCatalogUpload, percentage: int, 
                         status: str, step_description: str):
        """Update upload progress"""
        upload.progress_percentage = percentage
        upload.current_step = step_description
        
        if status == "parsing":
            upload.status = ExtractionStatus.PROCESSING.value
        elif status == "extracting":
            upload.status = ExtractionStatus.EXTRACTING.value
        
        self.db.commit()
    
    def _store_staging_products(self, upload: ProductCatalogUpload, 
                                products: List[Any]) -> int:
        """Store extracted products in staging table"""
        count = 0
        
        for product in products:
            try:
                staging_product = StagingProduct(
                    upload_id=upload.id,
                    vendor_id=upload.vendor_id,
                    name=product.name,
                    sku=getattr(product, 'sku', None),
                    brand=product.brand,
                    model=product.model,
                    category=product.category or 'other',
                    subcategory=product.subcategory,
                    description=product.description,
                    specifications=product.specifications or {},
                    price=product.price,
                    currency=product.currency,
                    unit=product.unit,
                    stock_quantity=product.stock_quantity,
                    availability_status=product.availability_status,
                    warranty_years=product.warranty_years,
                    warranty_description=product.warranty_description,
                    image_urls=product.image_urls or [],
                    datasheet_url=product.datasheet_url,
                    extraction_confidence=product.confidence,
                    source_page=product.source_page,
                    raw_extraction_data=product.to_dict(),
                    status=StagingProductStatus.PENDING.value
                )
                
                self.db.add(staging_product)
                count += 1
            except Exception as e:
                print(f"Error storing product {getattr(product, 'name', 'unknown')}: {e}")
                continue
        
        self.db.commit()
        return count
    
    def get_staging_products(self, upload_id: int, 
                            status: Optional[str] = None) -> List[StagingProduct]:
        """Get staging products for an upload"""
        query = self.db.query(StagingProduct).filter(
            StagingProduct.upload_id == upload_id
        )
        
        if status:
            query = query.filter(StagingProduct.status == status)
        
        return query.all()
    
    def update_staging_product(self, staging_id: int, 
                               updates: Dict[str, Any]) -> Optional[StagingProduct]:
        """Update a staging product"""
        product = self.db.query(StagingProduct).filter(
            StagingProduct.id == staging_id
        ).first()
        
        if not product:
            return None
        
        # Update allowed fields
        allowed_fields = [
            'name', 'sku', 'brand', 'model', 'category', 'subcategory',
            'description', 'specifications', 'price', 'currency', 'unit',
            'stock_quantity', 'availability_status', 'warranty_years',
            'warranty_description', 'image_urls', 'datasheet_url', 'vendor_notes'
        ]
        
        for field in allowed_fields:
            if field in updates:
                setattr(product, field, updates[field])
        
        product.status = StagingProductStatus.MODIFIED
        self.db.commit()
        self.db.refresh(product)
        
        return product
    
    def validate_staging_products(self, staging_ids: List[int], 
                                  action: str) -> Dict[str, int]:
        """Validate (approve/reject) staging products"""
        products = self.db.query(StagingProduct).filter(
            StagingProduct.id.in_(staging_ids)
        ).all()
        
        updated = 0
        for product in products:
            if action == "approve":
                product.status = StagingProductStatus.APPROVED.value
            elif action == "reject":
                product.status = StagingProductStatus.REJECTED.value
            updated += 1
        
        self.db.commit()
        
        # Update upload counts
        if products:
            upload_id = products[0].upload_id
            upload = self.db.query(ProductCatalogUpload).filter(
                ProductCatalogUpload.id == upload_id
            ).first()
            if upload:
                approved_count = self.db.query(StagingProduct).filter(
                    StagingProduct.upload_id == upload_id,
                    StagingProduct.status == StagingProductStatus.APPROVED.value
                ).count()
                upload.validated_products_count = approved_count
                self.db.commit()
        
        return {"updated": updated, "total": len(staging_ids)}
    
    def import_to_products(self, staging_ids: List[int]) -> Dict[str, Any]:
        """Import approved staging products to products table"""
        staging_products = self.db.query(StagingProduct).filter(
            StagingProduct.id.in_(staging_ids),
            StagingProduct.status == StagingProductStatus.APPROVED.value
        ).all()
        
        imported = []
        failed = []
        
        for staging in staging_products:
            try:
                # Check if product already exists (by SKU or name)
                existing = self.db.query(Product).filter(
                    Product.vendor_id == staging.vendor_id,
                    (Product.sku == staging.sku) | (Product.name == staging.name)
                ).first()
                
                if existing:
                    # Update existing product
                    existing.name = staging.name
                    existing.sku = staging.sku
                    existing.description = staging.description
                    existing.category = staging.category
                    existing.subcategory = staging.subcategory
                    existing.price = staging.price
                    existing.currency = staging.currency
                    existing.unit = staging.unit
                    existing.specifications = staging.specifications
                    existing.status = ProductStatus.APPROVED
                    existing.extracted_data = staging.raw_extraction_data
                    
                    product = existing
                else:
                    # Create new product
                    product = Product(
                        vendor_id=staging.vendor_id,
                        name=staging.name,
                        sku=staging.sku,
                        description=staging.description,
                        category=staging.category,
                        subcategory=staging.subcategory,
                        price=staging.price,
                        currency=staging.currency,
                        unit=staging.unit,
                        specifications=staging.specifications,
                        status=ProductStatus.APPROVED,
                        is_active=True,
                        extracted_data=staging.raw_extraction_data
                    )
                    self.db.add(product)
                
                self.db.flush()  # Get product ID
                
                # Update staging product
                staging.imported_product_id = product.id
                staging.status = StagingProductStatus.APPROVED.value
                imported.append(staging.id)
                
            except Exception as e:
                failed.append({"id": staging.id, "error": str(e)})
        
        self.db.commit()
        
        # Update upload import count
        if staging_products:
            upload_id = staging_products[0].upload_id
            upload = self.db.query(ProductCatalogUpload).filter(
                ProductCatalogUpload.id == upload_id
            ).first()
            if upload:
                imported_count = self.db.query(StagingProduct).filter(
                    StagingProduct.upload_id == upload_id,
                    StagingProduct.imported_product_id.isnot(None)
                ).count()
                upload.imported_products_count = imported_count
                upload.completed_at = func.now()
                upload.status = ExtractionStatus.COMPLETED.value
                self.db.commit()
        
        return {
            "success": True,
            "imported": len(imported),
            "failed": len(failed),
            "failed_details": failed
        }
    
    def get_upload_status(self, upload_id: int) -> Optional[Dict[str, Any]]:
        """Get current status of an upload"""
        upload = self.db.query(ProductCatalogUpload).filter(
            ProductCatalogUpload.id == upload_id
        ).first()
        
        if not upload:
            return None
        
        # Get product counts by status
        status_counts = self.db.query(
            StagingProduct.status,
            func.count(StagingProduct.id)
        ).filter(
            StagingProduct.upload_id == upload_id
        ).group_by(StagingProduct.status).all()
        
        return {
            "upload_id": upload.id,
            "status": upload.status.value,
            "progress": upload.progress_percentage,
            "current_step": upload.current_step,
            "document_name": upload.document_name,
            "extracted_count": upload.extracted_products_count,
            "validated_count": upload.validated_products_count,
            "imported_count": upload.imported_products_count,
            "product_status_breakdown": {s.value: c for s, c in status_counts},
            "created_at": upload.created_at,
            "error": upload.error_message
        }
