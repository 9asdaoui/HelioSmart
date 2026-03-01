"""LLM Product Extractor Service - Extracts product data using local Ollama LLM"""
import json
import os
import re
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
import httpx
from app.core.config import settings


@dataclass
class ExtractedProduct:
    """Represents a product extracted from catalog"""
    name: str
    brand: Optional[str] = None
    model: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    description: Optional[str] = None
    specifications: Optional[Dict[str, Any]] = None
    price: Optional[str] = None
    currency: str = "MAD"
    unit: Optional[str] = None
    stock_quantity: Optional[int] = None
    availability_status: Optional[str] = None
    warranty_years: Optional[int] = None
    warranty_description: Optional[str] = None
    image_urls: Optional[List[str]] = None
    datasheet_url: Optional[str] = None
    confidence: float = 0.0
    source_page: Optional[int] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return asdict(self)


class LLMProductExtractor:
    """Extract product information using local Ollama LLM"""
    
    def __init__(self, model: str = "deepseek-coder:6.7b-instruct", base_url: str = None):
        self.model = model
        # Use host.docker.internal to access host machine from Docker container
        # Fallback to localhost for local development without Docker
        self.base_url = base_url or os.environ.get('OLLAMA_HOST', 'http://host.docker.internal:11434')
        self.api_url = f"{self.base_url}/api/generate"
    
    def _build_extraction_prompt(self, catalog_text: str) -> str:
        """Build the prompt for product extraction"""
        prompt = f"""You are a solar product data extraction specialist. Your task is to extract product information from vendor catalogs and return it as structured JSON.

Extract each product with these exact fields:
- name: Product name (required)
- brand: Manufacturer brand name
- model: Model number or code
- category: Product category. Must be one of: solar_panel, inverter, battery, mounting_system, cable, connector, monitoring_system, other
- subcategory: More specific category within the main category
- description: Brief product description
- specifications: Technical specifications as key-value pairs (e.g., {{"power": "400W", "voltage": "24V"}})
- price: Price as string (number only, e.g., "1250.50")
- currency: Currency code (USD, EUR, MAD, etc.)
- unit: Unit of measurement (per_unit, per_watt, per_panel, etc.)
- stock_quantity: Available stock as integer
- availability_status: One of: in_stock, out_of_stock, pre_order
- warranty_years: Warranty period in years
- warranty_description: Warranty details
- image_urls: Array of image URLs if present in catalog
- datasheet_url: URL to product datasheet if present

IMPORTANT RULES:
1. Return ONLY valid JSON array of products
2. Do not include markdown formatting (no ```json code blocks)
3. Do not include any explanatory text
4. If a field is not found, use null or omit it
5. Ensure all JSON is properly escaped
6. For specifications, use flat key-value pairs (not nested objects)

CATALOG CONTENT TO EXTRACT:
{catalog_text[:8000]}  # Limit text to avoid token limits

Return the products as a JSON array:
"""
        return prompt
    
    def _clean_json_response(self, response_text: str) -> str:
        """Clean and extract JSON from LLM response"""
        # Remove markdown code blocks if present
        response_text = re.sub(r'```json\s*', '', response_text)
        response_text = re.sub(r'```\s*', '', response_text)
        
        # Find JSON array
        match = re.search(r'\[.*\]', response_text, re.DOTALL)
        if match:
            return match.group(0)
        
        # If no array found, try to find JSON object
        match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if match:
            return f"[{match.group(0)}]"
        
        return response_text
    
    def _validate_and_clean_product(self, product_data: Dict[str, Any]) -> Optional[ExtractedProduct]:
        """Validate and clean extracted product data"""
        try:
            # Ensure required fields
            if not product_data.get('name'):
                return None
            
            # Clean category
            category = product_data.get('category', 'other')
            valid_categories = {
                'solar_panel', 'inverter', 'battery', 'mounting_system', 
                'cable', 'connector', 'monitoring_system', 'other'
            }
            if category not in valid_categories:
                # Try to normalize
                category_map = {
                    'panel': 'solar_panel',
                    'solar panel': 'solar_panel',
                    'solar': 'solar_panel',
                    'pv panel': 'solar_panel',
                    'modules': 'solar_panel',
                    'onduleur': 'inverter',
                    'onduleurs': 'inverter',
                    'batterie': 'battery',
                    'batteries': 'battery',
                }
                category = category_map.get(category.lower(), 'other')
            
            # Clean specifications
            specs = product_data.get('specifications', {}) or {}
            if isinstance(specs, str):
                specs = {"details": specs}
            elif not isinstance(specs, dict):
                specs = {}
            
            # Clean price
            price = product_data.get('price')
            if price:
                # Extract numeric value from price string
                price_match = re.search(r'[\d,]+\.?\d*', str(price))
                if price_match:
                    price = price_match.group(0).replace(',', '')
            
            # Calculate confidence (simple heuristic)
            confidence = 0.5  # Base confidence
            if product_data.get('brand'):
                confidence += 0.1
            if product_data.get('model'):
                confidence += 0.1
            if product_data.get('price'):
                confidence += 0.1
            if product_data.get('specifications'):
                confidence += 0.1
            if product_data.get('description'):
                confidence += 0.1
            
            return ExtractedProduct(
                name=product_data.get('name', '').strip(),
                brand=product_data.get('brand'),
                model=product_data.get('model'),
                category=category,
                subcategory=product_data.get('subcategory'),
                description=product_data.get('description'),
                specifications=specs,
                price=price,
                currency=product_data.get('currency', 'MAD'),
                unit=product_data.get('unit'),
                stock_quantity=product_data.get('stock_quantity'),
                availability_status=product_data.get('availability_status'),
                warranty_years=product_data.get('warranty_years'),
                warranty_description=product_data.get('warranty_description'),
                image_urls=product_data.get('image_urls'),
                datasheet_url=product_data.get('datasheet_url'),
                confidence=min(confidence, 1.0),
                source_page=product_data.get('source_page')
            )
        except Exception as e:
            print(f"Error validating product: {e}")
            return None
    
    async def extract_products(self, catalog_text: str) -> List[ExtractedProduct]:
        """Extract products from catalog text using Ollama"""
        prompt = self._build_extraction_prompt(catalog_text)
        
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    self.api_url,
                    json={
                        "model": self.model,
                        "prompt": prompt,
                        "stream": False,
                        "options": {
                            "temperature": 0.1,  # Low temperature for consistent output
                            "num_predict": 4000   # Allow long responses
                        }
                    }
                )
                
                if response.status_code != 200:
                    raise ValueError(f"Ollama API error: {response.status_code} - {response.text}")
                
                result = response.json()
                response_text = result.get('response', '')
                
                # Clean and parse JSON
                json_text = self._clean_json_response(response_text)
                
                try:
                    products_data = json.loads(json_text)
                except json.JSONDecodeError as e:
                    print(f"JSON parse error: {e}")
                    print(f"Raw response: {response_text[:500]}")
                    return []
                
                # Ensure it's a list
                if isinstance(products_data, dict):
                    products_data = [products_data]
                elif not isinstance(products_data, list):
                    return []
                
                # Validate and clean each product
                validated_products = []
                for product_data in products_data:
                    if isinstance(product_data, dict):
                        product = self._validate_and_clean_product(product_data)
                        if product:
                            validated_products.append(product)
                
                return validated_products
                
        except httpx.ConnectError:
            raise ConnectionError("Could not connect to Ollama. Is it running? (ollama serve)")
        except Exception as e:
            print(f"Extraction error: {e}")
            return []
    
    def extract_products_sync(self, catalog_text: str) -> List[ExtractedProduct]:
        """Synchronous version of extract_products"""
        import asyncio
        return asyncio.run(self.extract_products(catalog_text))
    
    async def check_ollama_status(self) -> Dict[str, Any]:
        """Check if Ollama is running and model is available"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                # Check if Ollama is running
                response = await client.get(f"{self.base_url}/api/tags")
                if response.status_code != 200:
                    return {
                        "available": False,
                        "error": "Ollama not responding"
                    }
                
                # Check if model is available
                models = response.json().get('models', [])
                model_names = [m.get('name') for m in models]
                
                if self.model in model_names:
                    return {
                        "available": True,
                        "model": self.model,
                        "all_models": model_names
                    }
                else:
                    return {
                        "available": False,
                        "error": f"Model '{self.model}' not found",
                        "available_models": model_names
                    }
                    
        except Exception as e:
            return {
                "available": False,
                "error": str(e)
            }


# Singleton instance
_extractor = None

def get_product_extractor(model: str = None) -> LLMProductExtractor:
    """Get or create product extractor singleton"""
    global _extractor
    if _extractor is None:
        _extractor = LLMProductExtractor(model=model)
    return _extractor
