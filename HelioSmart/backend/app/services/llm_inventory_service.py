"""
LLM Inventory Extraction Service
Uses the configured Ollama LLM to extract Solar Panels / Inverters from
raw text or uploaded catalog files and returns structured JSON matching
our Pydantic schemas.
"""
import os
import re
import json
import logging
import httpx
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:1b")

# ─────────────────────────────────────────────────────────────────────────────
# System prompt
# ─────────────────────────────────────────────────────────────────────────────
EXTRACTION_SYSTEM_PROMPT = """You are a solar energy equipment data-extraction expert.
Your job is to read vendor catalog text and return a JSON array of product objects.

RULES:
1. Return ONLY valid JSON — no markdown, no explanation, no code fences.
2. Each element must have a "type" field: "panel" or "inverter".
3. For panels use these exact keys (omit missing optional ones):
   name, brand, panel_rated_power (Watts, number), module_efficiency (%, number 0-100),
   open_circuit_voltage (V), short_circuit_current (A),
   maximum_operating_voltage_vmpp (V), maximum_operating_current_impp (A),
   width_mm, height_mm, weight_kg, warranty_years (int), price (MAD or currency units),
   type (technology: "mono" | "poly" | "thin-film" | "bifacial"),
   temp_coefficient_of_pmax (negative %, number), status ("pending")
4. For inverters use these exact keys (omit missing optional ones):
   name, brand, ac_rated_power (W, number), dc_max_power (W, number),
   max_efficiency (%, number 0-100), mppt_min_voltage (V), mppt_max_voltage (V),
   max_input_voltage (V), max_input_current (A), ac_output_voltage (V),
   ac_frequency (Hz), phase_type ("single" | "three"), price (number),
   weight_kg, warranty_years (int), status ("pending")
5. If you cannot find a value, omit that key entirely.
6. "panel_rated_power" and "name" are required for panels; "ac_rated_power" and "name" for inverters.
7. Return an empty array [] if nothing can be extracted.

Example output:
[
  {"type":"panel","name":"SunPower 400W","brand":"SunPower","panel_rated_power":400,"module_efficiency":22.6,"width_mm":1046,"height_mm":1690,"warranty_years":25,"status":"pending"},
  {"type":"inverter","name":"Huawei SUN2000-5KTL","brand":"Huawei","ac_rated_power":5000,"max_efficiency":98.6,"phase_type":"single","warranty_years":10,"status":"pending"}
]"""


async def _call_ollama(prompt: str, timeout: int = 120) -> str:
    """Send a prompt to Ollama and return the raw text response."""
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "system": EXTRACTION_SYSTEM_PROMPT,
        "stream": False,
        "options": {
            "temperature": 0.0,   # deterministic for structured extraction
            "num_predict": 2048,
        },
    }
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(f"{OLLAMA_URL}/api/generate", json=payload)
        response.raise_for_status()
        data = response.json()
        return data.get("response", "")


def _clean_json(raw: str) -> str:
    """Strip markdown fences or leading/trailing noise around a JSON array."""
    # Remove ```json ... ``` or ``` ... ```
    raw = re.sub(r"```(?:json)?\s*", "", raw)
    raw = re.sub(r"```", "", raw)
    # Find the first '[' and last ']'
    start = raw.find("[")
    end = raw.rfind("]")
    if start == -1 or end == -1:
        return "[]"
    return raw[start : end + 1]


def _validate_and_split(raw_products: List[Dict]) -> Dict[str, List[Dict]]:
    """
    Split extracted products into panels / inverters and lightly validate.
    Returns { "panels": [...], "inverters": [...] }
    """
    panels: List[Dict] = []
    inverters: List[Dict] = []

    for item in raw_products:
        product_type = item.pop("type", None)
        # Default status to pending
        item.setdefault("status", "pending")
        # Convert numeric strings to floats/ints
        for key in (
            "panel_rated_power", "module_efficiency", "open_circuit_voltage",
            "short_circuit_current", "maximum_operating_voltage_vmpp", "maximum_operating_current_impp",
            "width_mm", "height_mm", "weight_kg", "price",
            "temp_coefficient_of_pmax", "ac_rated_power", "dc_max_power",
            "max_efficiency", "mppt_min_voltage", "mppt_max_voltage",
            "max_input_voltage", "max_input_current", "ac_output_voltage", "ac_frequency",
        ):
            if key in item and isinstance(item[key], str):
                try:
                    item[key] = float(item[key])
                except ValueError:
                    item.pop(key)

        for key in ("warranty_years", "num_of_cells"):
            if key in item and isinstance(item[key], str):
                try:
                    item[key] = int(item[key])
                except ValueError:
                    item.pop(key)

        if product_type == "panel" and item.get("name") and item.get("panel_rated_power"):
            panels.append(item)
        elif product_type == "inverter" and item.get("name") and item.get("ac_rated_power"):
            inverters.append(item)
        else:
            logger.warning(f"LLM extracted item skipped (missing required fields): {item}")

    return {"panels": panels, "inverters": inverters}


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

class LLMInventoryService:
    """
    Extract solar panel and inverter specifications from unstructured catalog text
    using the Ollama LLM.

    Usage:
        service = LLMInventoryService()
        result = await service.extract(text="...catalog text...")
        # result = {"panels": [...PanelCreate-compatible dicts...],
        #           "inverters": [...InverterCreate-compatible dicts...],
        #           "raw_count": int, "error": str|None}
    """

    async def check_available(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                resp = await client.get(f"{OLLAMA_URL}/api/tags")
                return resp.status_code == 200
        except Exception:
            return False

    async def extract(
        self,
        text: Optional[str] = None,
        file_bytes: Optional[bytes] = None,
        file_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Main extraction entry point.
        Accepts either plain text or raw file bytes (txt/csv/json supported).
        Returns { panels, inverters, raw_count, error }.
        """
        # Resolve input to text
        catalog_text = ""
        if file_bytes:
            catalog_text = self._decode_file(file_bytes, file_name or "")
        if text:
            catalog_text = (catalog_text + "\n\n" + text).strip()

        if not catalog_text:
            return {"panels": [], "inverters": [], "raw_count": 0, "error": "No input provided"}

        # Truncate to avoid overflowing LLM context (keep first 6000 chars)
        if len(catalog_text) > 6000:
            catalog_text = catalog_text[:6000] + "\n...[truncated]"

        # Build user prompt
        user_prompt = (
            "Extract all solar panels and inverters from the following catalog text.\n"
            "Return ONLY a JSON array as instructed.\n\n"
            f"--- CATALOG TEXT ---\n{catalog_text}\n--- END ---"
        )

        try:
            raw_response = await _call_ollama(user_prompt)
        except httpx.ConnectError:
            return {
                "panels": [], "inverters": [], "raw_count": 0,
                "error": "Ollama not reachable. Make sure the OLLAMA_URL service is running.",
            }
        except Exception as exc:
            logger.error(f"LLM call failed: {exc}")
            return {"panels": [], "inverters": [], "raw_count": 0, "error": str(exc)}

        # Parse JSON
        try:
            clean = _clean_json(raw_response)
            raw_list: List[Dict] = json.loads(clean)
        except json.JSONDecodeError as exc:
            logger.error(f"LLM returned invalid JSON: {exc}\nRaw: {raw_response[:500]}")
            return {
                "panels": [], "inverters": [], "raw_count": 0,
                "error": f"LLM returned non-JSON output: {str(exc)}",
            }

        split = _validate_and_split(raw_list)
        raw_count = len(raw_list)

        return {
            "panels": split["panels"],
            "inverters": split["inverters"],
            "raw_count": raw_count,
            "error": None,
        }

    def _decode_file(self, file_bytes: bytes, file_name: str) -> str:
        """Decode file bytes to text string (txt/csv/json/pdf-stub)."""
        name_lower = file_name.lower()
        if name_lower.endswith(".json"):
            try:
                data = json.loads(file_bytes.decode("utf-8", errors="replace"))
                # Convert JSON to readable text so the LLM can parse it
                return json.dumps(data, indent=2)
            except Exception:
                pass
        # Default: try UTF-8 / latin-1 text decode
        for encoding in ("utf-8", "latin-1", "cp1252"):
            try:
                return file_bytes.decode(encoding)
            except Exception:
                continue
        return file_bytes.decode("utf-8", errors="replace")
