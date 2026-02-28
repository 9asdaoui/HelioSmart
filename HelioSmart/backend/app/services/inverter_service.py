"""
Inverter Selection and String Calculation Service  
Handles inverter combo selection and stringing logic
"""
import logging
import math
from typing import Dict, List, Optional
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class InverterService:
    """Service for inverter selection and stringing calculations"""

    def __init__(self, db: Session):
        self.db = db

    def select_best_inverter_combo(self, panel_id: int, panel_count: int) -> Dict:
        """
        Select the best inverter combination with auto stringing for a given panel setup

        Args:
            panel_id: ID of the panel being used
            panel_count: Number of panels to configure

        Returns:
            Dict with combo, total_ac_kw, total_dc_kw, etc.
        """
        from app.models import Panel, Inverter, SolarConfiguration

        try:
            # Fetch panel specification
            panel = self.db.query(Panel).filter(Panel.id == panel_id).first()
            if not panel:
                return {
                    "error": "Panel not found",
                    "combo": [],
                    "message": f"Panel with ID {panel_id} not found",
                }

            # Validate panel properties
            if not panel.panel_rated_power or panel.panel_rated_power <= 0:
                return {
                    "error": "Invalid panel power",
                    "combo": [],
                    "message": f"Panel {panel.name} has invalid power rating",
                }

            # Get all active inverters
            inverters = self.db.query(Inverter).filter(Inverter.status == "active").all()
            if not inverters:
                return {
                    "error": "No inverters available",
                    "combo": [],
                    "message": "No active inverters found in database",
                }

            # Calculate total DC requirement in kW
            total_dc_kw = (panel.panel_rated_power * panel_count) / 1000

            logger.info(
                f"Inverter selection: panel_power={panel.panel_rated_power}W, "
                f"panel_count={panel_count}, total_dc={total_dc_kw}kW"
            )

            max_dc_ac_ratio = 1.35
            max_qty_per_model = 10

            best_score = float("inf")
            best_configuration = None

            # Try single inverter configurations
            for inverter in inverters:
                if not inverter.nominal_ac_power_kw or inverter.nominal_ac_power_kw <= 0:
                    continue
                if not inverter.max_dc_input_power or inverter.max_dc_input_power <= 0:
                    continue

                for qty in range(1, max_qty_per_model + 1):
                    total_ac_capacity = inverter.nominal_ac_power_kw * qty
                    total_dc_capacity = inverter.max_dc_input_power * qty

                    # Check if this configuration can handle all panels
                    if (
                        total_dc_capacity >= total_dc_kw
                        and total_ac_capacity * max_dc_ac_ratio >= total_dc_kw
                    ):
                        try:
                            # Calculate stringing for all panels across all inverters
                            panels_per_inverter = panel_count // qty
                            remaining_panels = panel_count % qty

                            inverter_configs = []
                            total_used_panels = 0

                            for i in range(qty):
                                panels_for_this_inverter = panels_per_inverter
                                if i < remaining_panels:
                                    panels_for_this_inverter += 1

                                if panels_for_this_inverter > 0:
                                    stringing_result = self.calculate_stringing(
                                        panel, panels_for_this_inverter, inverter
                                    )
                                    if "error" in stringing_result:
                                        break

                                    inverter_configs.append(
                                        {
                                            "inverter_unit": i + 1,
                                            "model": inverter.name,
                                            "panels_assigned": panels_for_this_inverter,
                                            "stringing": stringing_result,
                                        }
                                    )
                                    total_used_panels += panels_for_this_inverter

                            # Only consider if we use ALL panels
                            if total_used_panels == panel_count:
                                score = self._score_configuration(inverter, qty)

                                if score < best_score:
                                    best_score = score
                                    best_configuration = {
                                        "type": "single_model",
                                        "inverters": inverter_configs,
                                        "total_inverter_count": qty,
                                        "total_ac_kw": total_ac_capacity,
                                        "total_dc_kw": total_dc_kw,
                                        "total_panels_used": total_used_panels,
                                        "score": score,
                                    }

                        except Exception as e:
                            logger.warning(
                                f"Stringing failed for {inverter.name} x{qty}: {str(e)}"
                            )
                            continue

            if not best_configuration:
                logger.warning(
                    f"No inverter configuration found for {panel_count} panels, {total_dc_kw}kW DC"
                )
                return {
                    "error": "No valid configuration",
                    "combo": [],
                    "message": f"No valid inverter configuration found for {panel_count} panels",
                }

            # Format the result
            formatted_combos = []
            for config in best_configuration["inverters"]:
                formatted_combos.append(
                    {"model": config["model"], "qty": 1, "stringing": config["stringing"]}
                )

            return {
                "combo": formatted_combos,
                "total_ac_kw": best_configuration["total_ac_kw"],
                "total_dc_kw": best_configuration["total_dc_kw"],
                "total_panels_used": best_configuration["total_panels_used"],
                "total_inverter_count": best_configuration["total_inverter_count"],
                "configuration_type": best_configuration["type"],
                "score": best_configuration["score"],
            }

        except Exception as e:
            logger.error(f"Unexpected error in select_best_inverter_combo: {str(e)}")
            return {"error": "Unexpected error", "combo": [], "message": str(e)}

    def calculate_stringing(
        self, panel, panel_count: int, inverter, temp_min_c: float = -10.0, temp_coeff_pct: float = 0.29
    ) -> Dict:
        """
        Calculate stringing configuration for one inverter

        Args:
            panel: Panel model instance
            panel_count: Number of panels for this inverter
            inverter: Inverter model instance
            temp_min_c: Minimum temperature in Celsius
            temp_coeff_pct: Temperature coefficient percentage

        Returns:
            Dict with strings, v_string_voc, dc_power_kw, dc_ac_ratio, total_panels_used
        """
        try:
            # Parse MPPT voltage range from separate min/max fields
            mppt_min_v = None
            mppt_max_v = None

            if inverter.mppt_min_voltage and inverter.mppt_max_voltage:
                mppt_min_v = float(inverter.mppt_min_voltage)
                mppt_max_v = float(inverter.mppt_max_voltage)

            if not mppt_min_v or not mppt_max_v:
                return {
                    "error": "Missing MPPT voltage range",
                    "message": f"Inverter {inverter.name} has no MPPT voltage range",
                }

            # Validate panel voltage properties
            if not panel.open_circuit_voltage or panel.open_circuit_voltage <= 0:
                return {
                    "error": "Invalid panel open circuit voltage",
                    "message": f"Panel {panel.name} has invalid Voc",
                }

            if not panel.maximum_operating_voltage_vmpp or panel.maximum_operating_voltage_vmpp <= 0:
                return {
                    "error": "Invalid panel operating voltage",
                    "message": f"Panel {panel.name} has invalid Vmpp",
                }

            # Adjust Voc for temperature
            voc = panel.open_circuit_voltage
            v_operating = panel.maximum_operating_voltage_vmpp
            voc_cold = voc * (1 + temp_coeff_pct / 100 * (25 - temp_min_c))

            # Compute valid string length range
            pps_min = math.ceil(mppt_min_v / v_operating)
            pps_max = math.floor(mppt_max_v / voc_cold)

            if pps_max < pps_min:
                return {
                    "error": "Invalid voltage window",
                    "message": f"No valid string length for inverter {inverter.name}",
                }

            # Find optimal string configuration
            best_config = None
            best_score = float("inf")

            for pps in range(pps_min, pps_max + 1):
                base_strings = panel_count // pps
                remainder_panels = panel_count % pps

                if base_strings == 0:
                    continue

                total_strings = base_strings + (1 if remainder_panels > 0 else 0)

                # Check MPPT ports
                mppts = inverter.no_of_mppt_ports if inverter.no_of_mppt_ports else 1
                if total_strings > mppts * 2:
                    continue

                # Score this configuration
                score = total_strings + (0.5 if remainder_panels > 0 else 0)

                if score < best_score:
                    best_score = score
                    best_config = {
                        "pps": pps,
                        "base_strings": base_strings,
                        "remainder_panels": remainder_panels,
                        "total_strings": total_strings,
                    }

            if not best_config:
                return {
                    "error": "No valid stringing configuration",
                    "message": f"No valid stringing for {panel_count} panels",
                }

            # Build the string configuration
            strings = []
            mppts = inverter.no_of_mppt_ports if inverter.no_of_mppt_ports else 1

            base_strings = best_config["base_strings"]
            strings_per_mppt = base_strings // mppts
            extra_strings = base_strings % mppts

            for mppt in range(1, mppts + 1):
                strings_for_this_mppt = strings_per_mppt
                if mppt <= extra_strings:
                    strings_for_this_mppt += 1

                if strings_for_this_mppt > 0:
                    strings.append(
                        {
                            "mppt": mppt,
                            "panels_per_string": best_config["pps"],
                            "n_strings": strings_for_this_mppt,
                        }
                    )

            # Add remainder string if needed
            if best_config["remainder_panels"] > 0:
                remainder_voc = voc_cold * best_config["remainder_panels"]
                if mppt_min_v <= remainder_voc <= mppt_max_v:
                    last_mppt = strings[-1]["mppt"] if strings else 1
                    strings.append(
                        {
                            "mppt": last_mppt,
                            "panels_per_string": best_config["remainder_panels"],
                            "n_strings": 1,
                        }
                    )

            # Calculate actual panels used and power
            actual_panels_used = (best_config["base_strings"] * best_config["pps"]) + best_config[
                "remainder_panels"
            ]
            actual_power = (panel.panel_rated_power * actual_panels_used) / 1000

            return {
                "strings": strings,
                "v_string_voc": round(voc_cold * best_config["pps"], 2),
                "dc_power_kw": round(actual_power, 2),
                "dc_ac_ratio": round(actual_power / inverter.nominal_ac_power_kw, 2),
                "total_panels_used": actual_panels_used,
            }

        except Exception as e:
            logger.error(f"Stringing calculation error: {str(e)}")
            return {"error": "Unexpected stringing error", "message": str(e)}

    def _score_configuration(self, inverter, quantity: int) -> float:
        """Score a single inverter model configuration"""
        total_price = inverter.price * quantity
        efficiency = inverter.efficiency_max if inverter.efficiency_max else 95

        price_score = total_price / 10000
        efficiency_score = (100 - efficiency) / 100
        quantity_penalty = (quantity - 1) * 0.1

        return price_score + efficiency_score + quantity_penalty
