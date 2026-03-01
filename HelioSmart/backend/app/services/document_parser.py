"""Document Parser Service - Extracts text and tables from PDF, CSV, and Excel files"""
import os
import csv
import io
from typing import List, Dict, Any, Optional, Union
from dataclasses import dataclass
from pathlib import Path

import pandas as pd

# PDF parsing
try:
    import pdfplumber
    PDFPLUMBER_AVAILABLE = True
except ImportError:
    PDFPLUMBER_AVAILABLE = False


@dataclass
class PageContent:
    """Represents content from a single page"""
    page_number: int
    text: str
    tables: List[List[List[str]]]


@dataclass
class ParsedDocument:
    """Represents a fully parsed document"""
    filename: str
    file_type: str
    pages: List[PageContent]
    metadata: Dict[str, Any]
    
    def get_all_text(self) -> str:
        """Get all text content concatenated"""
        return "\n\n".join(page.text for page in self.pages if page.text)
    
    def get_all_tables(self) -> List[List[List[str]]]:
        """Get all tables from all pages"""
        tables = []
        for page in self.pages:
            tables.extend(page.tables)
        return tables


class DocumentParser:
    """Parse various document formats and extract product information"""
    
    SUPPORTED_EXTENSIONS = {'.pdf', '.csv', '.xlsx', '.xls'}
    
    def __init__(self):
        self.errors = []
    
    def parse(self, file_path: str) -> ParsedDocument:
        """Parse a document based on its extension"""
        path = Path(file_path)
        extension = path.suffix.lower()
        
        if extension not in self.SUPPORTED_EXTENSIONS:
            raise ValueError(f"Unsupported file type: {extension}. Supported: {self.SUPPORTED_EXTENSIONS}")
        
        if extension == '.pdf':
            return self.parse_pdf(file_path)
        elif extension == '.csv':
            return self.parse_csv(file_path)
        elif extension in ['.xlsx', '.xls']:
            return self.parse_excel(file_path)
        else:
            raise ValueError(f"Unsupported file type: {extension}")
    
    def parse_pdf(self, file_path: str) -> ParsedDocument:
        """Parse PDF and extract text and tables"""
        if not PDFPLUMBER_AVAILABLE:
            raise ImportError("pdfplumber is required for PDF parsing. Install with: pip install pdfplumber")
        
        pages = []
        metadata = {}
        
        try:
            with pdfplumber.open(file_path) as pdf:
                metadata = {
                    'total_pages': len(pdf.pages),
                    'file_size': os.path.getsize(file_path)
                }
                
                for i, page in enumerate(pdf.pages, 1):
                    # Extract text
                    text = page.extract_text() or ""
                    
                    # Extract tables
                    tables = page.extract_tables() or []
                    
                    pages.append(PageContent(
                        page_number=i,
                        text=text,
                        tables=tables
                    ))
        except Exception as e:
            raise ValueError(f"Failed to parse PDF: {str(e)}")
        
        return ParsedDocument(
            filename=os.path.basename(file_path),
            file_type='pdf',
            pages=pages,
            metadata=metadata
        )
    
    def parse_csv(self, file_path: str) -> ParsedDocument:
        """Parse CSV file"""
        try:
            # Read CSV with pandas for better handling
            df = pd.read_csv(file_path)
            
            # Convert to string representation
            text = df.to_string(index=False)
            
            # Convert to table format
            table = [df.columns.tolist()] + df.values.tolist()
            
            metadata = {
                'rows': len(df),
                'columns': len(df.columns),
                'column_names': df.columns.tolist()
            }
            
            return ParsedDocument(
                filename=os.path.basename(file_path),
                file_type='csv',
                pages=[PageContent(
                    page_number=1,
                    text=text,
                    tables=[table]
                )],
                metadata=metadata
            )
        except Exception as e:
            raise ValueError(f"Failed to parse CSV: {str(e)}")
    
    def parse_excel(self, file_path: str) -> ParsedDocument:
        """Parse Excel file (xlsx, xls)"""
        try:
            # Read all sheets
            xls = pd.ExcelFile(file_path)
            
            pages = []
            all_sheets_data = []
            
            for sheet_name in xls.sheet_names:
                df = pd.read_excel(file_path, sheet_name=sheet_name)
                
                # Skip empty sheets
                if df.empty:
                    continue
                
                # Convert to string
                text = f"Sheet: {sheet_name}\n{df.to_string(index=False)}"
                
                # Convert to table format
                table = [df.columns.tolist()] + df.fillna('').values.tolist()
                
                all_sheets_data.append({
                    'sheet_name': sheet_name,
                    'rows': len(df),
                    'columns': len(df.columns)
                })
                
                pages.append(PageContent(
                    page_number=len(pages) + 1,
                    text=text,
                    tables=[table]
                ))
            
            metadata = {
                'total_sheets': len(xls.sheet_names),
                'sheets': all_sheets_data
            }
            
            return ParsedDocument(
                filename=os.path.basename(file_path),
                file_type='excel',
                pages=pages,
                metadata=metadata
            )
        except Exception as e:
            raise ValueError(f"Failed to parse Excel: {str(e)}")
    
    def extract_structured_text(self, file_path: str) -> str:
        """Extract text in a format suitable for LLM processing"""
        document = self.parse(file_path)
        
        sections = []
        
        for page in document.pages:
            page_header = f"\n{'='*50}\nPAGE {page.page_number}\n{'='*50}\n"
            sections.append(page_header)
            
            # Add text content
            if page.text.strip():
                sections.append("TEXT CONTENT:")
                sections.append(page.text)
            
            # Add tables in a formatted way
            for i, table in enumerate(page.tables, 1):
                if table and len(table) > 0:
                    sections.append(f"\nTABLE {i}:")
                    # Format table as markdown-style
                    for row_idx, row in enumerate(table):
                        row_str = " | ".join(str(cell) if cell is not None else "" for cell in row)
                        sections.append(row_str)
                        # Add separator after header
                        if row_idx == 0:
                            sections.append("-" * len(row_str))
        
        return "\n".join(sections)
    
    def detect_product_tables(self, file_path: str) -> List[Dict[str, Any]]:
        """Detect and extract tables that likely contain product data"""
        document = self.parse(file_path)
        
        product_tables = []
        
        for page in document.pages:
            for table in page.tables:
                if self._is_likely_product_table(table):
                    product_tables.append({
                        'page': page.page_number,
                        'headers': table[0] if table else [],
                        'rows': table[1:] if len(table) > 1 else [],
                        'row_count': len(table) - 1 if len(table) > 1 else 0
                    })
        
        return product_tables
    
    def _is_likely_product_table(self, table: List[List[str]]) -> bool:
        """Heuristic to determine if a table likely contains product data"""
        if not table or len(table) < 2:  # Need at least header + 1 row
            return False
        
        headers = [str(h).lower() for h in table[0] if h]
        
        # Common product-related keywords
        product_keywords = [
            'product', 'name', 'model', 'sku', 'price', 'cost',
            'panel', 'inverter', 'battery', 'watt', 'warranty',
            'brand', 'manufacturer', 'description', 'power', 'voltage'
        ]
        
        # Count how many headers match product keywords
        matches = sum(1 for keyword in product_keywords 
                     if any(keyword in header for header in headers))
        
        # If at least 2 product-related headers found, likely a product table
        return matches >= 2


# Singleton instance
_document_parser = None

def get_document_parser() -> DocumentParser:
    """Get or create document parser singleton"""
    global _document_parser
    if _document_parser is None:
        _document_parser = DocumentParser()
    return _document_parser
