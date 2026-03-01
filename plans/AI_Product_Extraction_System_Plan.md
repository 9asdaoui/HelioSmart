# AI Product Extraction System - Implementation Plan

## Overview
Build an AI-powered document processing system that extracts solar product information from vendor catalogs (PDF, CSV, Excel) using local LLM (deepseek-coder:6.7b-instruct) and converts them into structured database entries.

---

## Phase 1: Database Schema Updates

### Step 1.1: Create Product Catalog Upload Tracking Table
**Purpose:** Track document uploads and extraction status

```sql
CREATE TABLE product_catalog_uploads (
    id SERIAL PRIMARY KEY,
    vendor_id INTEGER REFERENCES vendors(id),
    document_name VARCHAR(255),
    document_type VARCHAR(50), -- pdf, csv, xlsx
    file_path VARCHAR(500),
    extraction_status VARCHAR(50), -- pending, processing, completed, failed
    extracted_products_count INTEGER DEFAULT 0,
    validated_products_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    error_message TEXT
);
```

### Step 1.2: Create Staging Products Table
**Purpose:** Temporary storage for extracted products awaiting vendor validation

```sql
CREATE TABLE staging_products (
    id SERIAL PRIMARY KEY,
    upload_id INTEGER REFERENCES product_catalog_uploads(id),
    vendor_id INTEGER REFERENCES vendors(id),
    
    -- Product fields (matches Product model)
    name VARCHAR(255),
    brand VARCHAR(100),
    model VARCHAR(100),
    category VARCHAR(100), -- panel, inverter, battery, mounting, etc.
    description TEXT,
    
    -- Technical specifications (JSONB for flexibility)
    specifications JSONB,
    
    -- Pricing
    unit_price DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    min_order_quantity INTEGER DEFAULT 1,
    
    -- Availability
    stock_quantity INTEGER,
    availability_status VARCHAR(50), -- in_stock, out_of_stock, pre_order
    
    -- Warranty
    warranty_years INTEGER,
    warranty_description TEXT,
    
    -- Images
    image_urls TEXT[],
    datasheet_url VARCHAR(500),
    
    -- Extraction metadata
    extraction_confidence DECIMAL(3,2), -- 0.00 to 1.00
    source_page INTEGER, -- for PDFs
    raw_extraction_data JSONB, -- store original LLM output
    
    -- Validation status
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, modified
    vendor_notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Step 1.3: Update Existing Product Model
**Changes needed:**
- Add `vendor_id` foreign key link
- Add `catalog_upload_id` optional link
- Add `is_from_catalog` boolean flag
- Add `extraction_confidence` field

---

## Phase 2: Backend Services

### Step 2.1: Document Parser Service
**File:** `app/services/document_parser.py`

**Responsibilities:**
- Extract text from PDF files (using PyPDF2 or pdfplumber)
- Parse CSV files (using pandas)
- Parse Excel files (using openpyxl/pandas)
- Convert tables to structured text format
- Handle multi-page documents
- Extract text with layout preservation

**Key Functions:**
```python
class DocumentParser:
    def parse_pdf(self, file_path: str) -> List[PageContent]
    def parse_csv(self, file_path: str) -> List[Dict]
    def parse_excel(self, file_path: str) -> List[Dict]
    def extract_tables(self, file_path: str) -> List[TableData]
```

### Step 2.2: LLM Product Extractor Service
**File:** `app/services/llm_product_extractor.py`

**Responsibilities:**
- Connect to Ollama local instance
- Create optimized prompts for product extraction
- Parse LLM responses into structured JSON
- Handle extraction errors and retries
- Validate extracted data structure

**Prompt Engineering Strategy:**
```
You are a solar product data extraction specialist. 
Extract product information from the following catalog content.

Input: {catalog_text}

Extract each product with these fields:
- name: Product name
- brand: Manufacturer brand
- model: Model number
- category: One of [solar_panel, inverter, battery, mounting_system, cable, connector, monitoring_system, other]
- description: Brief product description
- specifications: Technical specs as key-value pairs (power, voltage, dimensions, etc.)
- unit_price: Price per unit (number only)
- currency: Currency code (USD, EUR, MAD, etc.)
- warranty_years: Warranty period in years
- availability_status: in_stock, out_of_stock, or pre_order

Return ONLY a valid JSON array of products. No markdown, no explanations.
```

**Key Functions:**
```python
class LLMProductExtractor:
    def __init__(self, model: str = "deepseek-coder:6.7b-instruct")
    def extract_products(self, catalog_text: str) -> List[ProductData]
    def validate_extraction(self, products: List[Dict]) -> bool
    def batch_extract(self, pages: List[str]) -> List[ProductData]
```

### Step 2.3: Product Import Pipeline Service
**File:** `app/services/product_import_pipeline.py`

**Responsibilities:**
- Orchestrate the full import workflow
- Track extraction progress
- Handle staging to production
- Manage errors and retries

**Workflow:**
1. Receive upload notification
2. Parse document → Extract text/tables
3. Send to LLM → Get structured products
4. Store in staging_products table
5. Notify vendor (via dashboard or email)
6. Wait for vendor validation
7. Move approved products to products table

### Step 2.4: API Endpoints
**File:** `app/api/vendor_products.py`

**New Endpoints:**

```python
# Upload catalog document
POST /api/v1/vendors/products/catalog-upload
- Accepts: multipart/form-data (pdf, csv, xlsx)
- Returns: upload_id, status

# Get extraction status
GET /api/v1/vendors/products/catalog-upload/{upload_id}/status
- Returns: extraction progress, product count

# Get staged products for review
GET /api/v1/vendors/products/staging
- Query params: upload_id, status
- Returns: List of staged products

# Update staged product (vendor editing)
PUT /api/v1/vendors/products/staging/{staging_id}
- Body: product fields
- Returns: updated product

# Validate/approve staged products
POST /api/v1/vendors/products/staging/validate
- Body: {staging_ids: [], action: "approve" | "reject"}
- Returns: success count, failure count

# Bulk import approved products
POST /api/v1/vendors/products/staging/import
- Body: {staging_ids: []}
- Returns: imported products, errors
```

---

## Phase 3: Frontend Implementation

### Step 3.1: Document Upload Component
**File:** `frontend/src/components/ProductCatalogUpload.jsx`

**Features:**
- Drag-and-drop file upload
- File type validation (PDF, CSV, XLSX)
- Size limit (e.g., 50MB)
- Upload progress indicator
- Extraction status polling

### Step 3.2: Product Review Interface
**File:** `frontend/src/components/ProductStagingReview.jsx`

**Features:**
- Table/grid view of extracted products
- Inline editing for corrections
- Confidence score indicators (color-coded)
- Bulk approve/reject actions
- Side-by-side raw data view
- Image preview if URLs extracted

**Columns:**
- Checkbox (for bulk actions)
- Product Name (editable)
- Brand (editable)
- Category (dropdown)
- Price (editable)
- Confidence Score (badge)
- Status (badge)
- Actions (edit, approve, reject)

### Step 3.3: Integration with Vendor Dashboard
**Update:** `frontend/src/pages/VendorDashboard.jsx`

**New Tab: "Catalog Import"**
- Upload section
- Recent uploads list with status
- Click to review extracted products
- Import history

---

## Phase 4: AI Agent Enhancements (Future)

### Step 4.1: Multi-Agent System (Optional Enhancement)
Instead of single LLM call, use specialized agents:

1. **Document Understanding Agent**
   - Analyzes document structure
   - Identifies product sections
   - Detects tables vs text

2. **Extraction Agent**
   - Extracts raw product data
   - Handles different formats

3. **Validation Agent**
   - Validates data completeness
   - Flags suspicious values
   - Suggests corrections

4. **Classification Agent**
   - Categorizes products
   - Matches to standard categories

### Step 4.2: Learning from Corrections
- Track vendor corrections
- Fine-tune prompts based on patterns
- Build product name/brand dictionary

---

## Phase 5: Testing & Validation

### Step 5.1: Test Cases
1. **PDF Catalog Test**
   - Multi-page solar panel catalog
   - Tables with specifications
   - Mixed text and images

2. **CSV Export Test**
   - Clean structured data
   - Various column formats

3. **Excel Workbook Test**
   - Multiple sheets
   - Different product categories per sheet

4. **Edge Cases**
   - Poor scan quality PDF
   - Incomplete data
   - Foreign language catalogs
   - Mixed currencies

### Step 5.2: Performance Optimization
- Chunk large documents for LLM processing
- Parallel processing for multiple files
- Caching for repeated extractions
- Queue system for background processing

---

## Implementation Timeline

| Phase | Steps | Estimated Duration |
|-------|-------|-------------------|
| Phase 1 | Database schema updates | 2 hours |
| Phase 2 | Backend services | 6 hours |
| Phase 3 | Frontend components | 4 hours |
| Phase 4 | Testing & refinement | 2 hours |
| **Total** | | **14 hours** |

---

## Technical Stack

| Component | Technology |
|-----------|------------|
| PDF Parsing | pdfplumber / PyMuPDF |
| Excel/CSV | pandas, openpyxl |
| LLM | Ollama + deepseek-coder:6.7b-instruct |
| API | FastAPI |
| Frontend | React + Tailwind |
| Database | PostgreSQL |
| Background Tasks | Celery (optional) or async |

---

## Alternative Approaches Considered

### Option A: RAG-based Extraction (Rejected)
- Store documents in vector DB
- Retrieve similar examples
- More complex, unnecessary for structured extraction

### Option B: OCR + Template Matching (Rejected)
- Requires predefined templates
- Not flexible for different vendor formats

### Option C: Cloud LLM API (Rejected per requirements)
- GPT-4/Claude would be more accurate
- But user specifically wants local LLM for privacy/cost

**Selected Approach:** Direct LLM extraction with local model - best balance of accuracy, privacy, and cost.

---

## Success Criteria

1. ✅ Successfully extract 80%+ of products from standard catalogs
2. ✅ Extraction confidence score > 0.7 for 90% of products
3. ✅ Vendor can review and edit before import
4. ✅ Process 50-page catalog in < 2 minutes
5. ✅ Support PDF, CSV, and Excel formats
6. ✅ All data stored locally (no cloud dependencies)
