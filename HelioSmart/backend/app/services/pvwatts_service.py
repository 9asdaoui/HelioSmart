"""
PVWatts API Service
Handles communication with NREL PVWatts v8 API for solar production estimation
"""
import os
import logging
from typing import Dict, Optional
import httpx

logger = logging.getLogger(__name__)


class PVWattsService:
    """Service for interfacing with PVWatts API"""

    def __init__(self):
        self.api_key = os.getenv("PVWATTS_API_KEY", "")
        self.base_url = "https://developer.nrel.gov/api/pvwatts/v8.json"

    async def get_estimate(
        self,
        lat: float,
        lon: float,
        system_capacity: float,
        tilt: float,
        azimuth: float,
        losses: float,
    ) -> Dict:
        """
        Call the PVWatts API to estimate energy production

        Args:
            lat: Latitude
            lon: Longitude
            system_capacity: System capacity in kW
            tilt: Tilt angle in degrees
            azimuth: Azimuth angle in degrees (180 = south)
            losses: System losses in percent

        Returns:
            Dict containing monthly data and annual production
        """
        try:
            params = {
                "api_key": self.api_key,
                "lat": lat,
                "lon": lon,
                "system_capacity": system_capacity,
                "module_type": 1,  # Premium
                "array_type": 0,  # Fixed roof mount
                "tilt": tilt,
                "azimuth": azimuth,
                "losses": losses,
                "timeframe": "monthly",
            }

            async with httpx.AsyncClient() as client:
                response = await client.get(self.base_url, params=params, timeout=30.0)
                response.raise_for_status()
                data = response.json()

                # Extract monthly values and map to readable month names
                monthly_data = {}
                month_names = [
                    "January",
                    "February",
                    "March",
                    "April",
                    "May",
                    "June",
                    "July",
                    "August",
                    "September",
                    "October",
                    "November",
                    "December",
                ]

                for i, month in enumerate(month_names):
                    monthly_data[month] = {
                        "ac_monthly": data["outputs"]["ac_monthly"][i],
                        "poa_monthly": data["outputs"]["poa_monthly"][i],
                        "solrad_monthly": data["outputs"]["solrad_monthly"][i],
                        "dc_monthly": data["outputs"]["dc_monthly"][i],
                    }

                return {
                    "monthlyData": monthly_data,
                    "annualProduction": data["outputs"]["ac_annual"],
                    "capacityFactor": data["outputs"]["capacity_factor"],
                    "solradAnnual": data["outputs"]["solrad_annual"],
                }

        except httpx.HTTPError as e:
            logger.error(f"PVWatts API error: {str(e)}")
            raise Exception(f"Failed to retrieve data from PVWatts API: {str(e)}")
