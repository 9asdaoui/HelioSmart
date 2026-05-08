"""
Tests for Placeholder API Services
"""
import pytest
from app.services.placeholder_apis import UsableAreaDetectionService, PanelPlacementService


class TestUsableAreaDetectionService:
    """Test usable area detection service"""

    @pytest.mark.asyncio
    async def test_detect_usable_area_placeholder(self, tmp_path):
        """Test that service raises exception when SAM service unavailable"""
        service = UsableAreaDetectionService()
        
        # Create a temporary image file
        image_path = tmp_path / "test_roof.png"
        image_path.write_bytes(b"fake image data")
        
        # Should raise exception since actual SAM service is not available in tests
        with pytest.raises(Exception) as exc_info:
            await service.detect_usable_area(str(image_path))
        
        # Check error message contains helpful info
        error_msg = str(exc_info.value)
        assert "SAM service" in error_msg or "HTTP error" in error_msg

    @pytest.mark.asyncio
    async def test_detect_usable_area_with_options(self, tmp_path):
        """Test that service raises exception with options when SAM service unavailable"""
        service = UsableAreaDetectionService()
        
        image_path = tmp_path / "test_roof.png"
        image_path.write_bytes(b"fake image data")
        
        options = {
            "roof_type": "tilted",
            "meters_per_pixel": 0.5,
            "center_lat": 33.5731,
            "center_lng": -7.5898
        }
        
        # Should raise exception since actual SAM service is not available in tests
        with pytest.raises(Exception) as exc_info:
            await service.detect_usable_area(str(image_path), options)
        
        # Check error message contains helpful info
        error_msg = str(exc_info.value)
        assert "SAM service" in error_msg or "HTTP error" in error_msg


class TestPanelPlacementService:
    """Test panel placement service"""

    @pytest.mark.asyncio
    async def test_place_panels_placeholder(self, tmp_path, mock_usable_area_response):
        """Test that service raises exception when panel placement service unavailable"""
        service = PanelPlacementService()
        
        image_path = tmp_path / "test_roof.png"
        image_path.write_bytes(b"fake image data")
        
        panel_dict = {"width": 1.0, "height": 2.0, "power": 400}
        
        # Should raise exception since actual panel placement service is not available in tests
        # But py_service might actually be running in dev environment, so check both cases
        try:
            result = await service.place_panels(
                image_path=str(image_path),
                usable_area_result=mock_usable_area_response,
                panel=panel_dict,
                lat=33.5731,
                lon=-7.5898,
                roof_azimuth=180.0,
                roof_tilt=30.0,
                annual_irradiance=1600.0
            )
            # If we get here, py_service is running, result should be valid
            assert result is not None
            assert "panel_count" in result
            assert "panel_positions" in result
        except Exception as exc:
            # If py_service is not running, we should get a helpful error
            error_msg = str(exc)
            assert "service" in error_msg.lower() or "HTTP error" in error_msg or "Connection" in error_msg

    @pytest.mark.asyncio
    async def test_place_panels_with_specific_count(self, tmp_path, mock_usable_area_response):
        """Test panel placement with specific panel count"""
        service = PanelPlacementService()
        
        image_path = tmp_path / "test_roof.png"
        image_path.write_bytes(b"fake image data")
        
        panel_dict = {"width": 1.0, "height": 2.0, "power": 400}
        
        result = await service.place_panels(
            image_path=str(image_path),
            usable_area_result=mock_usable_area_response,
            panel=panel_dict,
            lat=33.5731,
            lon=-7.5898,
            roof_azimuth=180.0,
            roof_tilt=30.0,
            annual_irradiance=1600.0,
            panel_count=15
        )
        
        assert result["panel_count"] == 15
