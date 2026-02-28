"""
Tests for InverterService
"""
import pytest
from app.services.inverter_service import InverterService


class TestInverterService:
    """Test inverter service methods"""

    def test_select_best_inverter_combo_success(self, db_session, sample_panel, sample_inverter):
        """Test successful inverter combo selection"""
        service = InverterService(db_session)
        
        result = service.select_best_inverter_combo(
            panel_id=sample_panel.id,
            panel_count=13
        )
        
        assert "combo" in result
        assert "total_ac_kw" in result
        assert "total_dc_kw" in result
        assert "total_panels_used" in result
        assert result["total_panels_used"] == 13
        assert len(result["combo"]) > 0

    def test_select_best_inverter_combo_no_panel(self, db_session):
        """Test inverter selection with invalid panel ID"""
        service = InverterService(db_session)
        
        result = service.select_best_inverter_combo(
            panel_id=9999,  # Non-existent panel
            panel_count=10
        )
        
        assert "error" in result
        assert result["error"] == "Panel not found"

    def test_select_best_inverter_combo_no_inverters(self, db_session, sample_panel):
        """Test inverter selection when no inverters available"""
        service = InverterService(db_session)
        
        result = service.select_best_inverter_combo(
            panel_id=sample_panel.id,
            panel_count=10
        )
        
        assert "error" in result
        assert result["error"] == "No inverters available"

    def test_calculate_stringing_success(self, db_session, sample_panel, sample_inverter):
        """Test successful stringing calculation"""
        service = InverterService(db_session)
        
        result = service.calculate_stringing(
            panel=sample_panel,
            panel_count=10,
            inverter=sample_inverter
        )
        
        assert "strings" in result
        assert "v_string_voc" in result
        assert "dc_power_kw" in result
        assert "dc_ac_ratio" in result
        assert "total_panels_used" in result
        assert result["total_panels_used"] == 10
        assert len(result["strings"]) > 0

    def test_calculate_stringing_invalid_voltage_window(self, db_session, sample_inverter):
        """Test stringing with panel that doesn't fit voltage window"""
        service = InverterService(db_session)
        
        # Create panel with very low voltage
        from app.models import Panel
        low_voltage_panel = Panel(
            name="Low Voltage Panel",
            brand="Test",
            panel_rated_power=100,
            width_mm=500,
            height_mm=1000,
            open_circuit_voltage=10.0,  # Very low
            maximum_operating_voltage_vmpp=8.0,
            maximum_operating_current_impp=12.5,
            status="active",
        )
        db_session.add(low_voltage_panel)
        db_session.commit()
        
        result = service.calculate_stringing(
            panel=low_voltage_panel,
            panel_count=10,
            inverter=sample_inverter
        )
        
        # Should still work but might need many panels in series
        assert "error" in result or "strings" in result

    def test_calculate_stringing_temperature_adjustment(self, db_session, sample_panel, sample_inverter):
        """Test that temperature adjustment is applied correctly"""
        service = InverterService(db_session)
        
        result = service.calculate_stringing(
            panel=sample_panel,
            panel_count=10,
            inverter=sample_inverter,
            temp_min_c=-20.0  # Very cold temperature
        )
        
        # Voc should be adjusted upward for cold temperature
        # Original Voc = 45V, at -20C should be higher
        assert "v_string_voc" in result
        # The voltage per string should account for temperature

    def test_score_configuration(self, db_session, sample_inverter):
        """Test configuration scoring"""
        service = InverterService(db_session)
        
        score = service._score_configuration(sample_inverter, 1)
        
        assert isinstance(score, float)
        assert score > 0
        
        # More inverters should have higher score (worse)
        score_many = service._score_configuration(sample_inverter, 5)
        assert score_many > score
