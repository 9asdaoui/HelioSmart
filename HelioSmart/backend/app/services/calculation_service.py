"""
Estimation Calculation Service
Contains all calculation methods for solar estimation
Ported from Laravel EstimationController
"""
import logging
import math
import httpx
from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class EstimationCalculationService:
    """Service for all solar estimation calculations"""

    def __init__(self, db: Session):
        self.db = db

    async def get_solar_average(self, lat: float, lon: float) -> Optional[float]:
        """
        Get solar irradiance average from NASA POWER API

        Args:
            lat: Latitude
            lon: Longitude

        Returns:
            Average solar irradiance in kWh/m2/day or None if failed
        """
        try:
            import datetime

            current_year = datetime.datetime.now().year
            end_year = current_year - 1
            start_year = end_year - 2

            url = (
                f"https://power.larc.nasa.gov/api/temporal/monthly/point?"
                f"parameters=ALLSKY_SFC_SW_DWN&community=RE&longitude={lon}&latitude={lat}"
                f"&start={start_year}&end={end_year}&format=JSON"
            )

            async with httpx.AsyncClient() as client:
                response = await client.get(url, timeout=30.0)
                response.raise_for_status()
                data = response.json()

                if not data or "properties" not in data:
                    return None

                values = data.get("properties", {}).get("parameter", {}).get("ALLSKY_SFC_SW_DWN", {})
                total = 0
                count = 0

                for key, value in values.items():
                    if len(key) == 6 and key[-2:] != "13" and value > 0:
                        total += value
                        count += 1

                return round(total / count, 2) if count > 0 else None

        except Exception as e:
            logger.warning(f"Failed to get solar average: {str(e)}")
            return None

    async def get_wind_and_snow_complexity(
        self, lat: float, lon: float
    ) -> Dict[str, Optional[float]]:
        """
        Fetch wind speed and elevation for a location, and return wind/snow complexity factors.

        Args:
            lat: Latitude
            lon: Longitude

        Returns:
            Dict with wind_complexity, snow_complexity, wind_speed, elevation
        """
        wind_speed = None
        elevation = None
        wind_complexity = 0.0
        snow_complexity = 0.0

        # 1. Get wind speed from NASA/POWER API
        try:
            nasa_url = (
                f"https://power.larc.nasa.gov/api/temporal/climatology/point?"
                f"parameters=WS10M&community=RE&longitude={lon}&latitude={lat}&format=JSON"
            )

            async with httpx.AsyncClient() as client:
                response = await client.get(nasa_url, timeout=30.0)
                if response.status_code == 200:
                    nasa_data = response.json()
                    if "properties" in nasa_data and "parameter" in nasa_data["properties"]:
                        ws_data = nasa_data["properties"]["parameter"].get("WS10M", {})
                        if ws_data:
                            wind_speed = sum(ws_data.values()) / len(ws_data)
        except Exception as e:
            logger.warning(f"Failed to get wind speed: {str(e)}")

        # 2. Get elevation from Open-Elevation API
        try:
            elev_url = f"https://api.open-elevation.com/api/v1/lookup?locations={lat},{lon}"

            async with httpx.AsyncClient() as client:
                response = await client.get(elev_url, timeout=30.0)
                if response.status_code == 200:
                    elev_data = response.json()
                    if "results" in elev_data and len(elev_data["results"]) > 0:
                        elevation = elev_data["results"][0].get("elevation")
        except Exception as e:
            logger.warning(f"Failed to get elevation: {str(e)}")

        # 3. Map wind speed to complexity (Morocco-specific thresholds)
        if wind_speed is not None:
            if wind_speed < 4:
                wind_complexity = 0.0
            elif wind_speed < 6:
                wind_complexity = 0.1
            elif wind_speed < 8:
                wind_complexity = 0.2
            else:
                wind_complexity = 0.3

        # 4. Map elevation to snow complexity (Morocco-specific)
        if elevation is not None:
            if elevation > 2000:
                snow_complexity = 0.3
            elif elevation > 1500:
                snow_complexity = 0.15
            else:
                snow_complexity = 0.0

        return {
            "wind_complexity": wind_complexity,
            "snow_complexity": snow_complexity,
            "wind_speed": wind_speed,
            "elevation": elevation,
        }

    def select_best_fit_panel(
        self,
        usable_area_m2: float,
        energy_need_kwh_per_year: float,
        solar_production_factor: float,
        coverage_target: float = 1.0,
        vendor_id: Optional[int] = None,
    ) -> Optional[Dict]:
        """
        Select the best-fit panel for the installation based on usable area and energy need.

        Args:
            usable_area_m2: Usable area in m2 (from API)
            energy_need_kwh_per_year: Client's annual energy need (kWh)
            solar_production_factor: kWh/kW/year (site-specific)
            coverage_target: Fraction of energy to cover (0-1)

        Returns:
            Dict with panel, panel_count, total_capacity_kw, total_annual_production_kwh or None
        """
        from app.models import Panel

        # Get all active panels sorted by score DESC (best first)
        # If vendor_id specified, restrict to that vendor's panels only
        panel_q = self.db.query(Panel).filter(Panel.status == "active")
        if vendor_id is not None:
            panel_q = panel_q.filter(Panel.vendor_id == vendor_id)
        panels = panel_q.order_by(Panel.score.desc()).all()

        # If no active panels, try default panel
        if not panels:
            from app.models import SolarConfiguration

            default_panel_id = (
                self.db.query(SolarConfiguration).filter(SolarConfiguration.key == "panel_id").first()
            )
            if default_panel_id:
                default_panel = self.db.query(Panel).filter(Panel.id == default_panel_id.value).first()
                if default_panel:
                    panels = [default_panel]

        for panel in panels:
            # Calculate panel area in m2
            panel_area_m2 = (panel.width_mm / 1000.0) * (panel.height_mm / 1000.0)
            if panel_area_m2 <= 0:
                continue

            # Max number of panels that fit in usable area
            max_panel_count = int(usable_area_m2 / panel_area_m2)
            if max_panel_count < 1:
                continue

            # Calculate minimum panel count needed to cover the client's need
            if panel.panel_rated_power <= 0:
                continue

            system_kw = (energy_need_kwh_per_year * coverage_target) / solar_production_factor
            min_panel_count = math.ceil((system_kw * 1000) / panel.panel_rated_power)

            # Use the lower of max_panel_count and min_panel_count
            if min_panel_count > max_panel_count:
                continue  # Can't fit enough panels

            system_capacity_kw = (panel.panel_rated_power * min_panel_count) / 1000.0
            annual_production_kwh = system_capacity_kw * solar_production_factor

            return {
                "panel": panel,
                "panel_count": min_panel_count,
                "total_capacity_kw": system_capacity_kw,
                "total_annual_production_kwh": annual_production_kwh,
                "panel_area_m2": panel_area_m2,
            }

        return None

    def estimate_structure_cost(
        self,
        panel: Dict,
        num_panels: int,
        installation_type: str,
        roof_type: str,
        orientation: str = "portrait",
    ) -> Dict:
        """
        Estimate mounting structure cost

        Args:
            panel: Panel dict with width and height
            num_panels: Number of panels
            installation_type: rooftop, ground, carport, floating
            roof_type: flat, tilted
            orientation: portrait or landscape

        Returns:
            Dict with cost breakdown for support, rail, clamp, foundation
        """
        from app.models import SolarConfiguration

        # Load configuration values with defaults
        support_unit_price = self._get_config_value("support_unit_price", 300)
        rail_unit_price = self._get_config_value("rail_unit_price", 120)
        clamp_unit_price = self._get_config_value("clamp_unit_price", 15)
        foundation_unit_price = self._get_config_value("foundation_unit_price", 200)

        # Determine foundations per support based on installation and roof type
        installation_type_lower = installation_type.lower()
        if installation_type_lower == "rooftop":
            if roof_type.lower() == "flat":
                foundations_per_support = self._get_config_value("foundation_ratio_rooftop_flat", 0.7)
            else:
                foundations_per_support = self._get_config_value("foundation_ratio_rooftop_tilted", 0.2)
        elif installation_type_lower == "ground":
            foundations_per_support = self._get_config_value("foundation_ratio_ground", 1.2)
        elif installation_type_lower == "carport":
            foundations_per_support = self._get_config_value("foundation_ratio_carport", 1.5)
        elif installation_type_lower == "floating":
            foundations_per_support = self._get_config_value("foundation_ratio_floating", 1.0)
        else:
            foundations_per_support = self._get_config_value("foundation_ratio_default", 1.0)

        # Panel dimensions in meters
        panel_width = panel["width"]
        panel_height = panel["height"]

        # Calculate rail length needed based on orientation
        if orientation.lower() == "landscape":
            rail_length_per_row = panel_height * num_panels / 2
        else:
            rail_length_per_row = panel_width * num_panels / 2

        total_rail_length = math.ceil(rail_length_per_row)
        total_rail_cost = total_rail_length * rail_unit_price

        # Clamps: 4 per panel
        total_clamps = num_panels * 4
        total_clamp_cost = total_clamps * clamp_unit_price

        # Supports
        total_supports = num_panels
        total_support_cost = total_supports * support_unit_price

        # Foundations
        total_foundations = math.ceil(total_supports * foundations_per_support)
        total_foundation_cost = total_foundations * foundation_unit_price

        # Total cost
        total_cost = total_support_cost + total_rail_cost + total_clamp_cost + total_foundation_cost

        return {
            "support": {
                "quantity": total_supports,
                "unit_price": support_unit_price,
                "total_cost": total_support_cost,
            },
            "rail": {
                "length_m": total_rail_length,
                "unit_price": rail_unit_price,
                "total_cost": total_rail_cost,
            },
            "clamp": {
                "quantity": total_clamps,
                "unit_price": clamp_unit_price,
                "total_cost": total_clamp_cost,
            },
            "foundation": {
                "quantity": total_foundations,
                "unit_price": foundation_unit_price,
                "total_cost": total_foundation_cost,
            },
            "total_structure_cost": total_cost,
        }

    def calculate_usage_and_cost(
        self, electricity_rate: float, monthly_bill: float, usage_pattern: str = "balanced"
    ) -> Dict:
        """
        Calculate annual and monthly usage and cost based on pattern

        Args:
            electricity_rate: Cost per kWh
            monthly_bill: Monthly bill amount
            usage_pattern: balanced, summer, or winter

        Returns:
            Dict with annualUsage, annualCost, monthlyUsage, monthlyCost
        """
        # Define monthly distribution factors for each pattern
        patterns = {
            "balanced": [0.083] * 12,
            "summer": [0.07, 0.07, 0.08, 0.09, 0.10, 0.11, 0.12, 0.12, 0.09, 0.07, 0.06, 0.02],
            "winter": [0.11, 0.11, 0.10, 0.09, 0.08, 0.07, 0.06, 0.06, 0.07, 0.09, 0.11, 0.13],
        }

        months = [
            "january",
            "february",
            "march",
            "april",
            "may",
            "june",
            "july",
            "august",
            "september",
            "october",
            "november",
            "december",
        ]

        factors = patterns.get(usage_pattern, patterns["balanced"])

        # Calculate annual cost and usage
        annual_cost = monthly_bill * 12
        annual_usage = annual_cost / electricity_rate

        # Calculate monthly usage and cost
        monthly_usage = {}
        monthly_cost = {}
        for i, month in enumerate(months):
            usage = round(annual_usage * factors[i], 2)
            cost = round(usage * electricity_rate, 2)
            monthly_usage[month] = usage
            monthly_cost[month] = cost

        return {
            "annualUsage": annual_usage,
            "annualCost": annual_cost,
            "monthlyUsage": monthly_usage,
            "monthlyCost": monthly_cost,
        }

    def calculate_total_system_loss(
        self, dc_voltage_drop: float, eta_inverter: float, ac_voltage_drop: float
    ) -> float:
        """
        Calculate total system losses following PVWatts methodology
        
        This method calculates the Performance Ratio (PR) by multiplying 
        all individual efficiency factors, then converts to loss percentage.
        
        Loss categories include:
        - Temperature derating
        - Soiling (dust/dirt)
        - Panel mismatch
        - DC wiring losses
        - Inverter efficiency
        - AC wiring losses  
        - Other losses (connections, availability, etc.)

        Args:
            dc_voltage_drop: DC voltage drop percentage (e.g., 2.0 for 2%)
            eta_inverter: Inverter efficiency as decimal (0-1, e.g., 0.96 for 96%)
            ac_voltage_drop: AC voltage drop percentage (e.g., 1.0 for 1%)

        Returns:
            Total system losses in percent (e.g., 14.5 for 14.5%)
        """
        # Load configurable loss factors (as decimal efficiencies)
        eta_other = self._get_config_value("eta_other", 0.98)          # Other/availability: 2% loss
        eta_mismatch = self._get_config_value("eta_mismatch", 0.99)     # Panel mismatch: 1% loss
        eta_soiling = self._get_config_value("eta_soiling", 0.97)       # Soiling: 3% loss
        eta_temperature = self._get_config_value("eta_temperature", 0.97)  # Temperature: 3% loss

        # Convert voltage drops (percentages) to efficiency factors
        eta_dc = 1 - (dc_voltage_drop / 100)  # DC wiring efficiency
        eta_ac = 1 - (ac_voltage_drop / 100)  # AC wiring efficiency

        # Calculate Performance Ratio (PR) by multiplying all efficiency factors
        # PR represents the overall system efficiency after all losses
        pr = (
            eta_temperature * 
            eta_soiling * 
            eta_mismatch * 
            eta_dc * 
            eta_inverter * 
            eta_ac * 
            eta_other
        )

        # Convert PR to loss percentage
        # If PR = 0.845 (84.5% efficient), losses = 15.5%
        losses = 100 - (pr * 100)
        
        return round(losses, 2)

    def calculate_system_loss_breakdown(
        self, 
        dc_voltage_drop: float, 
        eta_inverter: float, 
        ac_voltage_drop: float,
        location_lat: Optional[float] = None,
        roof_tilt: Optional[float] = None,
        shading_factor: float = 0.0
    ) -> Dict:
        """
        Calculate detailed system loss breakdown with individual components
        
        This method provides a comprehensive analysis of all loss factors,
        useful for frontend visualization and detailed reports.

        Args:
            dc_voltage_drop: DC voltage drop percentage (e.g., 2.0 for 2%)
            eta_inverter: Inverter efficiency as decimal (0-1)
            ac_voltage_drop: AC voltage drop percentage (e.g., 1.0 for 1%)
            location_lat: Optional latitude for location-based adjustments
            roof_tilt: Optional roof tilt for temperature coefficient adjustments
            shading_factor: Shading loss percentage (0-100)

        Returns:
            Dict with total_loss_percentage, performance_ratio, and breakdown of each component
        """
        # Load configurable loss factors
        eta_other = self._get_config_value("eta_other", 0.98)
        eta_mismatch = self._get_config_value("eta_mismatch", 0.99)
        eta_soiling = self._get_config_value("eta_soiling", 0.97)
        eta_temperature = self._get_config_value("eta_temperature", 0.97)

        # Convert voltage drops to efficiency factors
        eta_dc = 1 - (dc_voltage_drop / 100)
        eta_ac = 1 - (ac_voltage_drop / 100)
        
        # Apply shading if provided
        eta_shading = 1 - (shading_factor / 100) if shading_factor > 0 else 1.0

        # Calculate total Performance Ratio
        pr = (
            eta_temperature * 
            eta_soiling * 
            eta_mismatch * 
            eta_dc * 
            eta_inverter * 
            eta_ac * 
            eta_other *
            eta_shading
        )

        # Convert each efficiency to loss percentage for display
        breakdown = {
            "temperature_loss": round((1 - eta_temperature) * 100, 2),
            "soiling_loss": round((1 - eta_soiling) * 100, 2),
            "mismatch_loss": round((1 - eta_mismatch) * 100, 2),
            "dc_wiring_loss": round((1 - eta_dc) * 100, 2),
            "inverter_loss": round((1 - eta_inverter) * 100, 2),
            "ac_wiring_loss": round((1 - eta_ac) * 100, 2),
            "other_loss": round((1 - eta_other) * 100, 2),
            "shading_loss": round((1 - eta_shading) * 100, 2) if shading_factor > 0 else 0.0,
        }

        total_loss = round(100 - (pr * 100), 2)

        return {
            "total_loss_percentage": total_loss,
            "performance_ratio": round(pr, 4),
            "annual_energy_multiplier": round(pr, 4),
            "breakdown": breakdown,
            "summary": {
                "production_losses": round(breakdown["temperature_loss"] + breakdown["soiling_loss"], 2),
                "electrical_losses": round(breakdown["dc_wiring_loss"] + breakdown["ac_wiring_loss"] + breakdown["inverter_loss"], 2),
                "system_losses": round(breakdown["mismatch_loss"] + breakdown["other_loss"], 2),
                "environmental_losses": round(breakdown["shading_loss"], 2),
            }
        }

    def _get_config_value(self, key: str, default):
        """Get configuration value from database or return default"""
        from app.models import SolarConfiguration

        config = self.db.query(SolarConfiguration).filter(SolarConfiguration.key == key).first()
        if config:
            try:
                return float(config.value)
            except (ValueError, TypeError):
                return default
        return default
