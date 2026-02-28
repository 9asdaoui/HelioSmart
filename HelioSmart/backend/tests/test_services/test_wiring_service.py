"""
Tests for WiringService
"""
import pytest
from app.services.wiring_service import WiringService


class TestWiringService:
    """Test wiring service methods"""

    def test_estimate_wiring_distances(self, db_session):
        """Test wiring distance estimation"""
        service = WiringService(db_session)
        
        result = service.estimate_wiring_distances(
            floor_count=2,
            floor_height=3.0,
            horizontal_dc_distance=5.0,
            horizontal_ac_distance=2.0
        )
        
        assert "dc" in result
        assert "ac" in result
        assert result["dc"] == 5.0
        assert result["ac"] > 6.0  # Should be sqrt(6^2 + 2^2) ≈ 6.32

    def test_recommend_wire_size(self, db_session):
        """Test wire size recommendations"""
        service = WiringService(db_session)
        
        assert service.recommend_wire_size(5) == "4 mm²"
        assert service.recommend_wire_size(12) == "6 mm²"
        assert service.recommend_wire_size(20) == "10 mm²"
        assert service.recommend_wire_size(30) == "16 mm²"
        assert service.recommend_wire_size(40) == "25 mm²"

    def test_calculate_voltage_drop(self, db_session):
        """Test voltage drop calculation"""
        service = WiringService(db_session)
        
        vdrop = service.calculate_voltage_drop(
            wire_size="6 mm²",
            current=10.0,
            length=20.0,
            voltage=300.0
        )
        
        assert isinstance(vdrop, float)
        assert vdrop > 0
        assert vdrop < 10  # Should be reasonable

    def test_generate_wiring_specs(self, db_session):
        """Test wiring specification generation"""
        service = WiringService(db_session)
        
        inverter_design = {
            "combo": [
                {
                    "model": "Test Inverter",
                    "stringing": {
                        "strings": [
                            {"mppt": 1, "panels_per_string": 10, "n_strings": 2},
                            {"mppt": 2, "panels_per_string": 10, "n_strings": 1}
                        ]
                    },
                    "total_ac_kw": 5.0
                }
            ]
        }
        
        panel_specs = {
            "vmp": 37.5,
            "imp": 10.67,
            "voc": 45.0,
            "isc": 11.5
        }
        
        result = service.generate_wiring_specs(
            inverter_design=inverter_design,
            panel_specs=panel_specs,
            floor_count=2
        )
        
        assert isinstance(result, list)
        assert len(result) > 0
        
        # Should have DC wiring for each string
        dc_wiring = [w for w in result if w["type"] == "dc"]
        assert len(dc_wiring) == 3  # 2 + 1 strings
        
        # Should have AC wiring
        ac_wiring = [w for w in result if w["type"] == "ac"]
        assert len(ac_wiring) == 1

    def test_generate_bom(self, db_session):
        """Test Bill of Materials generation"""
        service = WiringService(db_session)
        
        wiring_specs = [
            {
                "inverter": "Test Inverter",
                "type": "dc",
                "wire_size": "6 mm²",
                "length": 20.0,
                "voltage_drop_percent": 2.0
            },
            {
                "inverter": "Test Inverter",
                "type": "dc",
                "wire_size": "6 mm²",
                "length": 20.0,
                "voltage_drop_percent": 2.0
            },
            {
                "inverter": "Test Inverter",
                "type": "ac",
                "wire_size": "10 mm²",
                "length": 15.0,
                "voltage_drop_percent": 1.5
            }
        ]
        
        result = service.generate_bom(wiring_specs)
        
        assert "bom" in result
        assert "total_cost_mad" in result
        assert isinstance(result["bom"], list)
        assert result["total_cost_mad"] > 0
        
        # Check for expected items
        bom_items = {item["item"] for item in result["bom"]}
        assert "6 mm²" in bom_items
        assert "10 mm²" in bom_items
        assert "MC4" in bom_items
        assert "fuse" in bom_items
        assert "junction_box" in bom_items

    def test_generate_bom_empty_specs(self, db_session):
        """Test BOM generation with empty specs"""
        service = WiringService(db_session)
        
        result = service.generate_bom([])
        
        assert result["bom"] == []
        assert result["total_cost_mad"] == 0
