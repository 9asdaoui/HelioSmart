"""
Pytest configuration and fixtures
"""
import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

# Set test environment variables before importing app
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["SECRET_KEY"] = "test-secret-key-for-testing-only"
os.environ["ALGORITHM"] = "HS256"
os.environ["CORS_ORIGINS"] = "http://localhost:3000"

from app.core.database import Base, get_db
from app.main import app
from app.models import Panel, Inverter, Utility, SolarConfiguration, UtilityRateRange


# Create in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    """Create a fresh database session for each test"""
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    """Create a test client with database session override"""
    
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def sample_panel(db_session):
    """Create a sample panel for testing"""
    panel = Panel(
        name="Test Panel 400W",
        brand="TestBrand",
        panel_rated_power=400,
        module_efficiency=20.5,
        width_mm=1000,
        height_mm=2000,
        open_circuit_voltage=45.0,
        maximum_operating_voltage_vmpp=37.5,
        maximum_operating_current_impp=10.67,
        short_circuit_current=11.5,
        warranty_years=25,
        temp_coefficient_of_pmax=-0.4,
        price=1500.0,
        status="active",
        score=85.0,
    )
    db_session.add(panel)
    db_session.commit()
    db_session.refresh(panel)
    return panel


@pytest.fixture
def sample_inverter(db_session):
    """Create a sample inverter for testing"""
    inverter = Inverter(
        name="Test Inverter 5kW",
        brand="TestInverter",
        nominal_ac_power_kw=5.0,
        max_dc_input_power=6.5,
        mppt_min_voltage=150,
        mppt_max_voltage=550,
        no_of_mppt_ports=2,
        efficiency_max=98.0,
        warranty=10,
        price=3000.0,
        status="active",
    )
    db_session.add(inverter)
    db_session.commit()
    db_session.refresh(inverter)
    return inverter


@pytest.fixture
def sample_utility(db_session):
    """Create a sample utility with rate ranges"""
    utility = Utility(
        name="Test Electric Company",
        country="Morocco",
        city="Casablanca",
        state="Grand Casablanca",
    )
    db_session.add(utility)
    db_session.commit()
    db_session.refresh(utility)
    
    # Add rate ranges
    rate_range_1 = UtilityRateRange(
        utility_id=utility.id,
        min=0,
        max=100,
        rate=1.2,
    )
    rate_range_2 = UtilityRateRange(
        utility_id=utility.id,
        min=100,
        max=300,
        rate=1.5,
    )
    rate_range_3 = UtilityRateRange(
        utility_id=utility.id,
        min=300,
        max=None,
        rate=1.8,
    )
    db_session.add_all([rate_range_1, rate_range_2, rate_range_3])
    db_session.commit()
    
    return utility


@pytest.fixture
def sample_solar_configs(db_session):
    """Create sample solar configurations"""
    configs = [
        SolarConfiguration(name="Electricity Rate", key="electricity_rate", value="1.5", description="Default electricity rate"),
        SolarConfiguration(name="Default Panel", key="panel_id", value="1", description="Default panel ID"),
        SolarConfiguration(name="Solar Production Factor", key="solar_production_factor", value="1600", description="Default solar production factor"),
        SolarConfiguration(name="Optimal Tilt", key="optimal_tilt_angle", value="30", description="Optimal tilt angle for Morocco"),
        SolarConfiguration(name="Default Azimuth", key="default_azimuth", value="180", description="South-facing azimuth"),
        SolarConfiguration(name="Default Losses", key="default_losses_percent", value="14", description="Default system losses"),
        SolarConfiguration(name="Support Price", key="support_unit_price", value="300", description="Support unit price"),
        SolarConfiguration(name="Rail Price", key="rail_unit_price", value="120", description="Rail unit price"),
        SolarConfiguration(name="Clamp Price", key="clamp_unit_price", value="15", description="Clamp unit price"),
        SolarConfiguration(name="Foundation Price", key="foundation_unit_price", value="200", description="Foundation unit price"),
        SolarConfiguration(name="Foundation Ratio Flat", key="foundation_ratio_rooftop_flat", value="0.7", description="Foundation ratio for flat roofs"),
        SolarConfiguration(name="Foundation Ratio Tilted", key="foundation_ratio_rooftop_tilted", value="0.2", description="Foundation ratio for tilted roofs"),
        SolarConfiguration(name="Temperature Efficiency", key="eta_temperature", value="0.97", description="Temperature efficiency factor"),
        SolarConfiguration(name="Soiling Efficiency", key="eta_soiling", value="0.97", description="Soiling efficiency factor"),
        SolarConfiguration(name="Mismatch Efficiency", key="eta_mismatch", value="0.99", description="Mismatch efficiency factor"),
        SolarConfiguration(name="Other Efficiency", key="eta_other", value="0.98", description="Other efficiency factor"),
        SolarConfiguration(name="Panels Per kW", key="panels_per_kw", value="2.5", description="Panels per kW"),
    ]
    db_session.add_all(configs)
    db_session.commit()
    return configs


@pytest.fixture
def mock_pvwatts_response():
    """Mock PVWatts API response"""
    return {
        "outputs": {
            "ac_monthly": [500, 550, 650, 700, 750, 800, 850, 820, 750, 650, 550, 500],
            "poa_monthly": [120, 135, 160, 175, 190, 200, 210, 205, 185, 160, 135, 120],
            "solrad_monthly": [4.0, 4.5, 5.2, 5.8, 6.1, 6.5, 6.8, 6.6, 6.0, 5.2, 4.5, 4.0],
            "dc_monthly": [520, 570, 675, 725, 775, 825, 875, 845, 775, 675, 570, 520],
            "ac_annual": 8050,
            "capacity_factor": 18.5,
            "solrad_annual": 5.5,
        }
    }


@pytest.fixture
def mock_nasa_power_response():
    """Mock NASA POWER API response"""
    return {
        "properties": {
            "parameter": {
                "ALLSKY_SFC_SW_DWN": {
                    "202301": 4.2,
                    "202302": 4.5,
                    "202303": 5.1,
                    "202304": 5.8,
                    "202305": 6.2,
                    "202306": 6.5,
                    "202307": 6.8,
                    "202308": 6.6,
                    "202309": 6.0,
                    "202310": 5.2,
                    "202311": 4.5,
                    "202312": 4.1,
                }
            }
        }
    }


@pytest.fixture
def mock_usable_area_response():
    """Mock usable area detection API response"""
    return {
        "usable_area": 1000.0,
        "usable_area_m2": 50.0,
        "roof_area": 1200.0,
        "roof_polygon": [[0, 0], [100, 0], [100, 100], [0, 100]],
        "usable_polygon": [[10, 10], [90, 10], [90, 90], [10, 90]],
        "obstacles": [],
        "roof_mask_image": None,
        "overlay_image": None,
        "sam_masks": None,
        "roof_mask_index": 0,
        "facade_reduction_ratio": 0.83,
        "roof_type": "flat",
        "facade_filtering_applied": False,
        "meters_per_pixel": 0.3,
        "_placeholder": True,
    }
