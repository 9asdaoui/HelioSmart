"""
Tests for Panel CRUD endpoints
"""
import pytest


class TestPanelEndpoints:
    """Test panel API endpoints"""

    def test_create_panel(self, client, db_session):
        """Test creating a panel"""
        panel_data = {
            "name": "New Panel 450W",
            "brand": "NewBrand",
            "model": "NP450",
            "panel_rated_power": 450,
            "module_efficiency": 21.0,
            "width_mm": 1100,
            "height_mm": 2100,
            "open_circuit_voltage": 48.0,
            "maximum_operating_voltage_vmpp": 40.0,
            "maximum_operating_current_impp": 11.25,
            "short_circuit_current": 12.0,
            "warranty_years": 25,
            "degradation_rate": 0.5,
            "price": 1800.0,
            "status": "active",
            "score": 90.0
        }
        
        response = client.post("/api/v1/panels/", json=panel_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "New Panel 450W"
        assert data["panel_rated_power"] == 450
        assert "id" in data

    def test_list_panels(self, client, sample_panel):
        """Test listing panels"""
        response = client.get("/api/v1/panels/")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert data[0]["name"] == sample_panel.name

    def test_get_panel(self, client, sample_panel):
        """Test getting a specific panel"""
        response = client.get(f"/api/v1/panels/{sample_panel.id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_panel.id
        assert data["name"] == sample_panel.name

    def test_update_panel(self, client, sample_panel):
        """Test updating a panel"""
        update_data = {"price": 2000.0, "status": "inactive"}
        
        response = client.put(f"/api/v1/panels/{sample_panel.id}", json=update_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["price"] == 2000.0
        assert data["status"] == "inactive"

    def test_delete_panel(self, client, sample_panel):
        """Test deleting a panel"""
        response = client.delete(f"/api/v1/panels/{sample_panel.id}")
        
        assert response.status_code == 204
        
        # Verify deletion
        response = client.get(f"/api/v1/panels/{sample_panel.id}")
        assert response.status_code == 404

    def test_filter_panels_by_brand(self, client, sample_panel):
        """Test filtering panels by brand"""
        response = client.get(f"/api/v1/panels/?brand={sample_panel.brand}")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert all(sample_panel.brand in p["brand"] for p in data)
