"""
Tests for Inverter CRUD endpoints
"""
import pytest


class TestInverterEndpoints:
    """Test inverter API endpoints"""

    def test_create_inverter(self, client):
        """Test creating an inverter"""
        inverter_data = {
            "name": "New Inverter 6kW",
            "brand": "NewInverter",
            "nominal_ac_power_kw": 6.0,
            "max_dc_input_power": 7.8,
            "mppt_min_voltage": 160,
            "mppt_max_voltage": 580,
            "no_of_mppt_ports": 2,
            "efficiency_max": 98.5,
            "warranty": 12,
            "price": 3500.0,
            "status": "active"
        }
        
        response = client.post("/api/v1/inverters/", json=inverter_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "New Inverter 6kW"
        assert data["nominal_ac_power_kw"] == 6.0

    def test_list_inverters(self, client, sample_inverter):
        """Test listing inverters"""
        response = client.get("/api/v1/inverters/")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_filter_inverters_by_power(self, client, sample_inverter):
        """Test filtering inverters by power range"""
        response = client.get("/api/v1/inverters/?min_power=4.0&max_power=6.0")
        
        assert response.status_code == 200
        data = response.json()
        assert all(4.0 <= inv["nominal_ac_power_kw"] <= 6.0 for inv in data)

    def test_get_inverter(self, client, sample_inverter):
        """Test getting a specific inverter"""
        response = client.get(f"/api/v1/inverters/{sample_inverter.id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_inverter.id

    def test_update_inverter(self, client, sample_inverter):
        """Test updating an inverter"""
        update_data = {"price": 3200.0}
        
        response = client.put(f"/api/v1/inverters/{sample_inverter.id}", json=update_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["price"] == 3200.0

    def test_delete_inverter(self, client, sample_inverter):
        """Test deleting an inverter"""
        response = client.delete(f"/api/v1/inverters/{sample_inverter.id}")
        
        assert response.status_code == 204
