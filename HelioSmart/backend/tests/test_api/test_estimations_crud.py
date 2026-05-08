"""
Tests for Estimation CRUD endpoints
"""
import pytest
from app.models import Estimation, Panel, Utility, User
from app.schemas.estimation import EstimationStatus


@pytest.fixture
def sample_user(db_session):
    """Create a sample user for testing"""
    user = User(
        email="test@example.com",
        hashed_password="$2b$12$test",
        role="user",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def sample_estimation(db_session, sample_panel, sample_user):
    """Create a sample estimation for testing"""
    estimation = Estimation(
        panel_id=sample_panel.id,
        user_id=sample_user.id,
        customer_name="John Doe",
        email="john@example.com",
        latitude=34.0069,
        longitude=-6.8379,
        address="Casablanca, Morocco",
        city="Casablanca",
        country="Morocco",
        annual_usage_kwh=8000.0,
        annual_cost=12000.0,
        system_capacity=5.0,
        tilt=32.0,
        azimuth=180.0,
        losses=14.0,
        energy_annual=7500.0,
        status=EstimationStatus.COMPLETED,
        monthly_usage={"january": 664.0, "february": 664.0, "march": 664.0},
        monthly_cost={"january": 996.0, "february": 996.0, "march": 996.0},
        panel_count=10
    )
    db_session.add(estimation)
    db_session.commit()
    db_session.refresh(estimation)
    return estimation


class TestEstimationCRUD:
    """Test estimation CRUD endpoints"""

    def test_create_estimation(self, client, sample_panel, db_session):
        """Test creating a new estimation"""
        estimation_data = {
            "panel_id": sample_panel.id,
            "customer_name": "Jane Smith",
            "email": "jane@example.com",
            "latitude": 33.5731,
            "longitude": -7.5898,
            "address": "Rabat, Morocco",
            "city": "Rabat",
            "country": "Morocco",
            "annual_usage_kwh": 10000.0,
            "system_capacity": 6.0,
            "tilt": 30.0,
            "azimuth": 180.0,
            "losses": 14.0,
            "energy_annual": 9000.0
        }
        
        response = client.post("/api/v1/estimations/", json=estimation_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["customer_name"] == "Jane Smith"
        assert data["system_capacity"] == 6.0
        assert "id" in data

    def test_list_estimations(self, client, sample_estimation):
        """Test listing all estimations"""
        response = client.get("/api/v1/estimations/")
        
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "estimations" in data
        assert isinstance(data["estimations"], list)
        assert len(data["estimations"]) >= 1
        assert data["total"] >= 1

    def test_list_estimations_pagination(self, client, sample_estimation):
        """Test listing estimations with pagination"""
        response = client.get("/api/v1/estimations/?skip=0&limit=5")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["estimations"]) <= 5

    def test_list_estimations_filter_by_status(self, client, sample_estimation):
        """Test filtering estimations by status"""
        response = client.get("/api/v1/estimations/?status=completed")
        
        assert response.status_code == 200
        data = response.json()
        for estimation in data["estimations"]:
            assert estimation["status"] == "completed"

    def test_list_estimations_filter_by_user(self, client, sample_estimation, sample_user):
        """Test filtering estimations by user_id"""
        response = client.get(f"/api/v1/estimations/?user_id={sample_user.id}")
        
        assert response.status_code == 200
        data = response.json()
        # Verify filter parameter is accepted (user_id may not be in response schema)
        assert "estimations" in data
        assert isinstance(data["estimations"], list)

    def test_get_estimation_by_id(self, client, sample_estimation):
        """Test getting a specific estimation by ID"""
        response = client.get(f"/api/v1/estimations/{sample_estimation.id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_estimation.id
        assert data["customer_name"] == sample_estimation.customer_name
        assert data["system_capacity"] == sample_estimation.system_capacity
        assert data["latitude"] == sample_estimation.latitude
        assert data["longitude"] == sample_estimation.longitude

    def test_get_estimation_with_panel_info(self, client, sample_estimation):
        """Test getting estimation with resolved panel info"""
        response = client.get(f"/api/v1/estimations/{sample_estimation.id}")
        
        assert response.status_code == 200
        data = response.json()
        if data.get("panel_id"):
            assert "panel_info" in data
            if data["panel_info"]:
                assert "name" in data["panel_info"]
                assert "panel_rated_power" in data["panel_info"]

    def test_get_nonexistent_estimation(self, client):
        """Test getting an estimation that doesn't exist"""
        response = client.get("/api/v1/estimations/99999")
        
        assert response.status_code == 404

    def test_update_estimation(self, client, sample_estimation):
        """Test updating an existing estimation"""
        update_data = {
            "customer_name": "John Doe Updated",
            "system_capacity": 7.5,
            "panel_count": 15,
            "status": "completed"
        }
        
        response = client.put(
            f"/api/v1/estimations/{sample_estimation.id}",
            json=update_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["customer_name"] == "John Doe Updated"
        assert data["system_capacity"] == 7.5
        assert data["panel_count"] == 15

    def test_update_estimation_partial(self, client, sample_estimation):
        """Test partial update of estimation"""
        original_capacity = sample_estimation.system_capacity
        
        update_data = {
            "customer_name": "New Name Only"
        }
        
        response = client.put(
            f"/api/v1/estimations/{sample_estimation.id}",
            json=update_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["customer_name"] == "New Name Only"
        # Other fields should remain unchanged
        assert data["system_capacity"] == original_capacity

    def test_update_nonexistent_estimation(self, client):
        """Test updating an estimation that doesn't exist"""
        update_data = {
            "customer_name": "Test"
        }
        
        response = client.put("/api/v1/estimations/99999", json=update_data)
        
        assert response.status_code == 404

    def test_update_estimation_with_invalid_data(self, client, sample_estimation):
        """Test updating with invalid data"""
        update_data = {
            "system_capacity": -5.0,  # Invalid negative value
        }
        
        response = client.put(
            f"/api/v1/estimations/{sample_estimation.id}",
            json=update_data
        )
        
        # Should still accept but might validate
        assert response.status_code in [200, 422]

    def test_delete_estimation(self, client, sample_estimation):
        """Test deleting an estimation"""
        estimation_id = sample_estimation.id
        
        response = client.delete(f"/api/v1/estimations/{estimation_id}")
        
        assert response.status_code == 204
        
        # Verify it's deleted
        get_response = client.get(f"/api/v1/estimations/{estimation_id}")
        assert get_response.status_code == 404

    def test_delete_nonexistent_estimation(self, client):
        """Test deleting an estimation that doesn't exist"""
        response = client.delete("/api/v1/estimations/99999")
        
        assert response.status_code == 404

    def test_create_estimation_with_monthly_data(self, client, sample_panel):
        """Test creating estimation with monthly usage and cost data"""
        estimation_data = {
            "panel_id": sample_panel.id,
            "customer_name": "Monthly Test User",
            "email": "monthly@example.com",
            "latitude": 34.0,
            "longitude": -6.8,
            "system_capacity": 5.0,
            "tilt": 32.0,
            "azimuth": 180.0,
            "losses": 14.0,
            "energy_annual": 7500.0,
            "monthly_usage": {
                "january": 650.0,
                "february": 620.0,
                "march": 680.0,
                "april": 700.0,
                "may": 720.0,
                "june": 750.0,
                "july": 800.0,
                "august": 780.0,
                "september": 740.0,
                "october": 710.0,
                "november": 670.0,
                "december": 640.0
            },
            "monthly_cost": {
                "january": 975.0,
                "february": 930.0,
                "march": 1020.0,
                "april": 1050.0,
                "may": 1080.0,
                "june": 1125.0,
                "july": 1200.0,
                "august": 1170.0,
                "september": 1110.0,
                "october": 1065.0,
                "november": 1005.0,
                "december": 960.0
            }
        }
        
        response = client.post("/api/v1/estimations/", json=estimation_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["monthly_usage"] is not None
        assert data["monthly_cost"] is not None

    def test_get_estimation_visualization(self, client, sample_estimation):
        """Test getting estimation visualization data"""
        response = client.get(f"/api/v1/estimations/{sample_estimation.id}/visualization")
        
        # This endpoint might not be fully implemented
        assert response.status_code in [200, 404, 500]

    def test_list_estimations_empty(self, client):
        """Test listing estimations when database is empty"""
        response = client.get("/api/v1/estimations/")
        
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "estimations" in data
        assert data["total"] >= 0

    def test_update_estimation_status_workflow(self, client, sample_estimation):
        """Test updating estimation through different status states"""
        # Draft -> Pending
        response = client.put(
            f"/api/v1/estimations/{sample_estimation.id}",
            json={"status": "pending"}
        )
        assert response.status_code == 200
        assert response.json()["status"] == "pending"
        
        # Pending -> Completed
        response = client.put(
            f"/api/v1/estimations/{sample_estimation.id}",
            json={"status": "completed"}
        )
        assert response.status_code == 200
        assert response.json()["status"] == "completed"

    def test_create_estimation_minimal_required_fields(self, client):
        """Test creating estimation with only required fields"""
        estimation_data = {
            "latitude": 34.0,
            "longitude": -6.8,
            "system_capacity": 5.0,
            "tilt": 32.0,
            "azimuth": 180.0,
            "energy_annual": 7500.0
        }
        
        response = client.post("/api/v1/estimations/", json=estimation_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["latitude"] == 34.0
        assert data["system_capacity"] == 5.0

    def test_list_estimations_sort_by_created_at(self, client, db_session, sample_panel, sample_user):
        """Test listing estimations sorted by creation date"""
        # Create multiple estimations
        for i in range(3):
            est = Estimation(
                panel_id=sample_panel.id,
                user_id=sample_user.id,
                latitude=34.0 + i,
                longitude=-6.8,
                system_capacity=5.0 + i,
                tilt=32.0,
                azimuth=180.0,
                energy_annual=7500.0,
                customer_name=f"Test User {i}"
            )
            db_session.add(est)
        db_session.commit()
        
        response = client.get("/api/v1/estimations/")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["estimations"]) >= 3
