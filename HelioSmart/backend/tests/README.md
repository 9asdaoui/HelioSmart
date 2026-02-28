# HelioSmart Backend Tests

## Test Structure

```
tests/
├── conftest.py                          # Pytest fixtures and configuration
├── test_services/                       # Unit tests for services
│   ├── test_calculation_service.py      # Calculation service tests
│   ├── test_inverter_service.py         # Inverter service tests
│   ├── test_wiring_service.py           # Wiring service tests
│   ├── test_pvwatts_service.py          # PVWatts service tests
│   └── test_placeholder_apis.py         # Placeholder API tests
└── test_api/                            # Integration tests for API endpoints
    ├── test_panels.py                   # Panel CRUD tests
    ├── test_inverters.py                # Inverter CRUD tests
    └── test_estimation_integration.py   # Full estimation creation tests
```

## Running Tests

### Run All Tests
```bash
cd backend
pytest
```

### Run Specific Test File
```bash
pytest tests/test_services/test_calculation_service.py
```

### Run Specific Test Class
```bash
pytest tests/test_services/test_calculation_service.py::TestEstimationCalculationService
```

### Run Specific Test Method
```bash
pytest tests/test_services/test_calculation_service.py::TestEstimationCalculationService::test_select_best_fit_panel
```

### Run with Coverage
```bash
pytest --cov=app --cov-report=html
```

Then open `htmlcov/index.html` in your browser to see coverage report.

### Run Only Unit Tests
```bash
pytest -m unit
```

### Run Only Integration Tests
```bash
pytest -m integration
```

### Run with Verbose Output
```bash
pytest -v
```

### Run and Stop on First Failure
```bash
pytest -x
```

## Test Coverage

### Services Tested:
- ✅ **Calculation Service** (14 tests)
  - Solar average from NASA API
  - Wind and snow complexity
  - Panel selection algorithm
  - Structure cost estimation
  - Usage and cost patterns
  - System loss calculation

- ✅ **Inverter Service** (6 tests)
  - Inverter combo selection
  - Stringing calculations
  - MPPT voltage validation
  - Temperature adjustments
  - Configuration scoring

- ✅ **Wiring Service** (6 tests)
  - Wiring distance estimation
  - Wire size recommendations
  - Voltage drop calculations
  - Wiring spec generation
  - BOM generation

- ✅ **PVWatts Service** (3 tests)
  - API integration
  - Response parsing
  - Error handling

- ✅ **Placeholder APIs** (4 tests)
  - Usable area detection
  - Panel placement
  - Custom options handling

### API Endpoints Tested:
- ✅ **Panels CRUD** (6 tests)
- ✅ **Inverters CRUD** (6 tests)
- ✅ **Estimation Creation** (3 integration tests)

## Fixtures

### Database Fixtures
- `db_session` - Fresh in-memory SQLite database for each test
- `client` - FastAPI test client with database override

### Model Fixtures
- `sample_panel` - Pre-created panel with realistic specs
- `sample_inverter` - Pre-created inverter with MPPT specs
- `sample_utility` - Pre-created utility with rate ranges
- `sample_solar_configs` - Configuration key-value pairs

### Mock Data Fixtures
- `mock_pvwatts_response` - Realistic PVWatts API response
- `mock_nasa_power_response` - NASA POWER API solar data
- `mock_usable_area_response` - Usable area detection result

## Writing New Tests

### Unit Test Example
```python
def test_my_calculation(db_session, sample_solar_configs):
    """Test description"""
    service = MyService(db_session)
    
    result = service.my_method(param1, param2)
    
    assert result is not None
    assert result["key"] == expected_value
```

### Async Test Example
```python
@pytest.mark.asyncio
async def test_my_async_method(db_session):
    """Test async method"""
    service = MyAsyncService(db_session)
    
    with patch("httpx.AsyncClient.get") as mock_get:
        mock_response = AsyncMock()
        mock_response.json.return_value = {"data": "value"}
        mock_get.return_value = mock_response
        
        result = await service.fetch_data()
        
        assert result["data"] == "value"
```

### API Test Example
```python
def test_my_endpoint(client, sample_panel):
    """Test API endpoint"""
    response = client.post("/api/v1/endpoint", json={"key": "value"})
    
    assert response.status_code == 201
    data = response.json()
    assert data["key"] == "value"
```

## Mocking External APIs

Tests use `unittest.mock.patch` to mock external API calls:

```python
with patch("httpx.AsyncClient.get") as mock_get:
    mock_response = AsyncMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"result": "data"}
    mock_get.return_value = mock_response
    
    # Your test code here
```

## Continuous Integration

Add to your CI/CD pipeline:

```yaml
# .github/workflows/test.yml
- name: Run tests
  run: |
    cd backend
    pytest --cov=app --cov-report=xml
    
- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./backend/coverage.xml
```

## Test Data

Tests use **in-memory SQLite** database, so they:
- ✅ Run fast (no network I/O)
- ✅ Are isolated (fresh DB per test)
- ✅ Don't affect production data
- ✅ Don't require Docker/PostgreSQL

## Known Limitations

1. **SQLite vs PostgreSQL**: Some PostgreSQL-specific features may behave differently
2. **Async in SQLite**: Async operations tested but SQLite doesn't use async
3. **External APIs**: All external APIs are mocked, real API integration not tested

## Next Steps

- [ ] Add end-to-end tests with real database
- [ ] Add performance/load tests
- [ ] Increase coverage to 90%+
- [ ] Add mutation testing
- [ ] Add contract tests for external APIs
