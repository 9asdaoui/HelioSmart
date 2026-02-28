"""
Wiring Calculation Service
Handles DC/AC wiring specifications and Bill of Materials
"""
import logging
import math
from typing import Dict, List
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class WiringService:
    """Service for wiring calculations and BOM generation"""

    def __init__(self, db: Session):
        self.db = db

    def estimate_wiring_distances(
        self,
        floor_count: int,
        floor_height: float = 3.0,
        horizontal_dc_distance: float = 5.0,
        horizontal_ac_distance: float = 2.0,
    ) -> Dict[str, float]:
        """Estimate wiring distances for DC and AC"""
        dc_distance = horizontal_dc_distance
        vertical_ac = floor_count * floor_height
        ac_distance = math.sqrt(vertical_ac**2 + horizontal_ac_distance**2)

        return {"dc": round(dc_distance, 2), "ac": round(ac_distance, 2)}

    def recommend_wire_size(self, current: float) -> str:
        """Recommend wire size based on current"""
        if current <= 10:
            return "4 mm²"
        elif current <= 16:
            return "6 mm²"
        elif current <= 25:
            return "10 mm²"
        elif current <= 35:
            return "16 mm²"
        else:
            return "25 mm²"

    def calculate_voltage_drop(
        self, wire_size: str, current: float, length: float, voltage: float
    ) -> float:
        """Calculate voltage drop percentage"""
        resistance_per_km = {
            "4 mm²": 4.61,
            "6 mm²": 3.08,
            "10 mm²": 1.83,
            "16 mm²": 1.15,
            "25 mm²": 0.73,
        }

        r = resistance_per_km.get(wire_size, 3.08) / 1000 * length
        v_drop = r * current
        return (v_drop / voltage) * 100

    def generate_wiring_specs(
        self, inverter_design: Dict, panel_specs: Dict, floor_count: int, horizontal_distance: float = 5.0
    ) -> List[Dict]:
        """Generate wiring specifications for the solar installation"""
        try:
            wiring = []
            distances = self.estimate_wiring_distances(floor_count, 3, horizontal_distance)

            if "combo" not in inverter_design or not inverter_design["combo"]:
                return []

            for inv in inverter_design["combo"]:
                model = inv.get("model", "Unknown Model")
                stringing = inv.get("stringing", {})

                # Handle stringing format
                strings = stringing.get("strings", [])

                for string in strings:
                    n_strings = int(string.get("n_strings", 1))
                    panels_per_string = int(string.get("panels_per_string", 10))

                    for i in range(n_strings):
                        v_string = panels_per_string * panel_specs.get("vmp", 30)
                        i_string = panel_specs.get("imp", 10)
                        one_way = distances.get("dc", 5)
                        round_trip = one_way * 2 * 1.1

                        gauge = self.recommend_wire_size(i_string)
                        vdrop = self.calculate_voltage_drop(gauge, i_string, round_trip, v_string)

                        wiring.append(
                            {
                                "inverter": model,
                                "type": "dc",
                                "string_index": i + 1,
                                "voltage": v_string,
                                "current": i_string,
                                "wire_size": gauge,
                                "length": round_trip,
                                "voltage_drop_percent": round(vdrop, 2),
                                "drop_ok": vdrop <= 3,
                            }
                        )

                # Estimate AC wiring per inverter
                ac_power = 5.0  # Default
                if "total_ac_kw" in inv:
                    ac_power = inv["total_ac_kw"]

                ac_current = ac_power * 1000 / 230  # 230V single-phase
                ac_gauge = self.recommend_wire_size(ac_current)
                ac_length = distances.get("ac", 5) * 2 * 1.1

                ac_voltage_drop = self.calculate_voltage_drop(ac_gauge, ac_current, ac_length, 230)

                wiring.append(
                    {
                        "inverter": model,
                        "type": "ac",
                        "voltage": 230,
                        "current": round(ac_current, 2),
                        "wire_size": ac_gauge,
                        "length": round(ac_length, 2),
                        "voltage_drop_percent": round(ac_voltage_drop, 2),
                        "drop_ok": ac_voltage_drop <= 3,
                    }
                )

            return wiring

        except Exception as e:
            logger.error(f"generateWiringSpecs failed: {str(e)}")
            return []

    def generate_bom(self, wiring_specs: List[Dict]) -> Dict:
        """Generate Bill of Materials for wiring"""
        try:
            unit_prices = {
                "4 mm²": 11,
                "6 mm²": 14,
                "10 mm²": 20,
                "16 mm²": 30,
                "25 mm²": 42,
                "MC4": 8,
                "fuse": 100,
                "junction_box": 300,
            }

            bom = {}
            total_cost = 0

            if not wiring_specs:
                return {"bom": [], "total_cost_mad": 0}

            for spec in wiring_specs:
                wire_type = spec.get("wire_size")
                length = spec.get("length", 0)

                if not wire_type or length <= 0:
                    continue

                if wire_type not in bom:
                    bom[wire_type] = {"qty": 0, "unit_price": unit_prices.get(wire_type, 11)}

                bom[wire_type]["qty"] += round(length)

            # Add per DC string components
            dc_strings = [w for w in wiring_specs if w.get("type") == "dc"]

            if dc_strings:
                bom["MC4"] = {"qty": len(dc_strings) * 2, "unit_price": unit_prices["MC4"]}
                bom["fuse"] = {"qty": len(dc_strings), "unit_price": unit_prices["fuse"]}

            bom["junction_box"] = {"qty": 1, "unit_price": unit_prices["junction_box"]}

            output = []
            for item, data in bom.items():
                cost = data["qty"] * data["unit_price"]
                output.append(
                    {
                        "item": item,
                        "qty": data["qty"],
                        "unit_price_mad": data["unit_price"],
                        "total_mad": round(cost, 2),
                    }
                )
                total_cost += cost

            return {"bom": output, "total_cost_mad": round(total_cost, 2)}

        except Exception as e:
            logger.error(f"generateBOM failed: {str(e)}")
            return {"bom": [], "total_cost_mad": 0, "error": str(e)}
