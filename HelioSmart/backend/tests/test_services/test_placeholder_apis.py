"""
Tests for Placeholder API Services
"""
import pytest
from app.services.placeholder_apis import UsableAreaDetectionService, PanelPlacementService


class TestUsableAreaDetectionService:
    """Test usable area detection service"""

    @pytest.mark.asyncio
    async def test_detect_usable_area_placeholder(self, tmp_path):
        """Test placeholder usable area detection"""
        service = UsableAreaDetectionService()
        
        # Create a temporary image file
        image_path = tmp_path / "test_roof.png"
        image_path.write_bytes(b"fake image data")
        
        result = await service.detect_usable_area(str(image_path))
        
        assert result is not None
        assert "_placeholder" in result
        assert result["_placeholder"] is True
        assert "usable_area_m2" in result
        assert "roof_polygon" in result
        assert "usable_polygon" in result
        assert result["usable_area_m2"] == 50.0

    @pytest.mark.asyncio
    async def test_detect_usable_area_with_options(self, tmp_path):
        """Test placeholder with custom options"""
        service = UsableAreaDetectionService()
        
        image_path = tmp_path / "test_roof.png"
        image_path.write_bytes(b"fake image data")
        
        options = {
            "roof_type": "tilted",
            "meters_per_pixel": 0.5
        }
        
        result = await service.detect_usable_area(str(image_path), options)
        
        assert result["roof_type"] == "tilted"
        assert result["meters_per_pixel"] == 0.5


class TestPanelPlacementService:
    """Test panel placement service"""

    @pytest.mark.asyncio
    async def test_place_panels_placeholder(self, tmp_path, mock_usable_area_response):
        """Test placeholder panel placement"""
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
            annual_irradiance=1600.0
        )
        
        assert result is not None
        assert "_placeholder" in result
        assert result["_placeholder"] is True
        assert "panel_count" in result
        assert "panel_grid" in result
        assert "panel_positions" in result
        assert result["panel_count"] > 0

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
