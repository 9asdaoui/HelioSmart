"""
Tests for EstimationCalculationService
"""
import pytest
from unittest.mock import AsyncMock, patch
from app.services.calculation_service import EstimationCalculationService


class TestEstimationCalculationService:
    """Test calculation service methods"""

    @pytest.mark.asyncio
    async def test_get_solar_average(self, db_session, mock_nasa_power_response):
        """Test solar average calculation from NASA POWER API"""
        service = EstimationCalculationService(db_session)
        
        with patch("httpx.AsyncClient.get") as mock_get:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json = AsyncMock(return_value=mock_nasa_power_response)
            mock_get.return_value.__aenter__.return_value.get =  AsyncMock(return_value=mock_response)
            
            with patch("httpx.AsyncClient") as mock_client:
                mock_instance = AsyncMock()
                mock_instance.__aenter__.return_value.get = AsyncMock(return_value=mock_response)
                mock_client.return_value = mock_instance
                
                result = await service.get_solar_average(33.5731, -7.5898)
                
                assert result is not None
                assert isinstance(result, float)
                assert result > 0
                assert result < 10  # Reasonable solar irradiance value

    @pytest.mark.asyncio
    async def test_get_solar_average_failure(self, db_session):
        """Test solar average handles API failure gracefully"""
        service = EstimationCalculationService(db_session)
        
        with patch("httpx.AsyncClient.get") as mock_get:
            mock_get.side_effect = Exception("API error")
            
            result = await service.get_solar_average(33.5731, -7.5898)
            
            assert result is None

    @pytest.mark.asyncio
    async def test_get_wind_and_snow_complexity(self, db_session):
        """Test wind and snow complexity calculation"""
        service = EstimationCalculationService(db_session)
        
        with patch("httpx.AsyncClient.get") as mock_get:
            # Mock NASA response for wind
            nasa_response = AsyncMock()
            nasa_response.status_code = 200
            nasa_response.json.return_value = {
                "properties": {
                    "parameter": {
                        "WS10M": {
                            "1": 3.5, "2": 3.8, "3": 4.0, "4": 4.2,
                            "5": 4.5, "6": 4.8, "7": 5.0, "8": 4.9,
                            "9": 4.6, "10": 4.3, "11": 4.0, "12": 3.7
                        }
                    }
                }
            }
            
            # Mock elevation response
            elev_response = AsyncMock()
            elev_response.status_code = 200
            elev_response.json.return_value = {"results": [{"elevation": 500}]}
            
            mock_get.side_effect = [nasa_response, elev_response]
            
            result = await service.get_wind_and_snow_complexity(33.5731, -7.5898)
            
            assert "wind_complexity" in result
            assert "snow_complexity" in result
            assert "wind_speed" in result
            assert "elevation" in result
            assert result["wind_complexity"] >= 0
            assert result["snow_complexity"] >= 0

    def test_select_best_fit_panel(self, db_session, sample_panel, sample_solar_configs):
        """Test best-fit panel selection"""
        service = EstimationCalculationService(db_session)
        
        result = service.select_best_fit_panel(
            usable_area_m2=50.0,
            energy_need_kwh_per_year=6000,
            solar_production_factor=1600,
            coverage_target=0.8
        )
        
        assert result is not None
        assert "panel" in result
        assert "panel_count" in result
        assert "total_capacity_kw" in result
        assert "total_annual_production_kwh" in result
        assert result["panel_count"] > 0
        assert result["total_capacity_kw"] > 0

    def test_select_best_fit_panel_no_fit(self, db_session, sample_panel, sample_solar_configs):
        """Test panel selection when no panel fits"""
        service = EstimationCalculationService(db_session)
        
        # Too small area
        result = service.select_best_fit_panel(
            usable_area_m2=1.0,
            energy_need_kwh_per_year=10000,
            solar_production_factor=1600,
            coverage_target=1.0
        )
        
        assert result is None

    def test_estimate_structure_cost(self, db_session, sample_solar_configs):
        """Test mounting structure cost estimation"""
        service = EstimationCalculationService(db_session)
        
        panel_dict = {"width": 1.0, "height": 2.0}
        
        result = service.estimate_structure_cost(
            panel=panel_dict,
            num_panels=10,
            installation_type="rooftop",
            roof_type="flat",
            orientation="portrait"
        )
        
        assert "support" in result
        assert "rail" in result
        assert "clamp" in result
        assert "foundation" in result
        assert "total_structure_cost" in result
        assert result["support"]["quantity"] == 10
        assert result["clamp"]["quantity"] == 40  # 4 clamps per panel
        assert result["total_structure_cost"] > 0

    def test_calculate_usage_and_cost_balanced(self, db_session):
        """Test usage and cost calculation with balanced pattern"""
        service = EstimationCalculationService(db_session)
        
        result = service.calculate_usage_and_cost(
            electricity_rate=1.5,
            monthly_bill=500,
            usage_pattern="balanced"
        )
        
        assert "annualUsage" in result
        assert "annualCost" in result
        assert "monthlyUsage" in result
        assert "monthlyCost" in result
        assert result["annualCost"] == 6000  # 500 * 12
        assert result["annualUsage"] == 4000  # 6000 / 1.5
        assert len(result["monthlyUsage"]) == 12
        assert len(result["monthlyCost"]) == 12

    def test_calculate_usage_and_cost_summer(self, db_session):
        """Test usage and cost calculation with summer pattern"""
        service = EstimationCalculationService(db_session)
        
        result = service.calculate_usage_and_cost(
            electricity_rate=1.5,
            monthly_bill=500,
            usage_pattern="summer"
        )
        
        # Summer pattern should have higher usage in summer months
        assert result["monthlyUsage"]["july"] > result["monthlyUsage"]["january"]

    def test_calculate_total_system_loss(self, db_session, sample_solar_configs):
        """Test system loss calculation"""
        service = EstimationCalculationService(db_session)
        
        losses = service.calculate_total_system_loss(
            dc_voltage_drop=1.5,
            eta_inverter=0.98,
            ac_voltage_drop=1.0
        )
        
        assert isinstance(losses, float)
        assert 0 < losses < 100
        assert losses > 10  # Should have some losses

    def test_calculate_total_system_loss_high_drops(self, db_session, sample_solar_configs):
        """Test system loss with high voltage drops"""
        service = EstimationCalculationService(db_session)
        
        losses = service.calculate_total_system_loss(
            dc_voltage_drop=5.0,
            eta_inverter=0.90,
            ac_voltage_drop=3.0
        )
        
        assert losses > 15  # Higher drops should result in higher losses
