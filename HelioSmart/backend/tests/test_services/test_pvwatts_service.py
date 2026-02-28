"""
Tests for PVWattsService
"""
import pytest
from unittest.mock import AsyncMock, patch
from app.services.pvwatts_service import PVWattsService


class TestPVWattsService:
    """Test PVWatts service"""

    @pytest.mark.asyncio
    async def test_get_estimate_success(self, mock_pvwatts_response):
        """Test successful PVWatts API call"""
        service = PVWattsService()
        
        with patch("httpx.AsyncClient.get") as mock_get:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = mock_pvwatts_response
            mock_get.return_value = mock_response
            
            result = await service.get_estimate(
                lat=33.5731,
                lon=-7.5898,
                system_capacity=5.0,
                tilt=30.0,
                azimuth=180.0,
                losses=14.0
            )
            
            assert "monthlyData" in result
            assert "annualProduction" in result
            assert "capacityFactor" in result
            assert "solradAnnual" in result
            assert len(result["monthlyData"]) == 12
            assert result["annualProduction"] == 8050

    @pytest.mark.asyncio
    async def test_get_estimate_api_failure(self):
        """Test PVWatts API failure handling"""
        service = PVWattsService()
        
        with patch("httpx.AsyncClient.get") as mock_get:
            mock_get.side_effect = Exception("API error")
            
            with pytest.raises(Exception) as exc_info:
                await service.get_estimate(
                    lat=33.5731,
                    lon=-7.5898,
                    system_capacity=5.0,
                    tilt=30.0,
                    azimuth=180.0,
                    losses=14.0
                )
            
            assert "Failed to retrieve data from PVWatts API" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_get_estimate_monthly_data_structure(self, mock_pvwatts_response):
        """Test that monthly data is structured correctly"""
        service = PVWattsService()
        
        with patch("httpx.AsyncClient.get") as mock_get:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = mock_pvwatts_response
            mock_get.return_value = mock_response
            
            result = await service.get_estimate(33.5731, -7.5898, 5.0, 30.0, 180.0, 14.0)
            
            # Check January data
            assert "January" in result["monthlyData"]
            jan_data = result["monthlyData"]["January"]
            assert "ac_monthly" in jan_data
            assert "poa_monthly" in jan_data
            assert "solrad_monthly" in jan_data
            assert "dc_monthly" in jan_data
