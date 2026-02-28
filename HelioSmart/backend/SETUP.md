# HelioSmart Backend Setup Guide

## Prerequisites
- Python 3.10 or higher
- PostgreSQL 14 or higher
- pip (Python package manager)

## Installation Steps

### 1. Create Virtual Environment
```bash
cd backend
python -m venv venv

# On Windows
venv\Scripts\activate

# On macOS/Linux
source venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables
Copy the example environment file and configure it:
```bash
copy .env.example .env  # Windows
# or
cp .env.example .env    # macOS/Linux
```

Edit `.env` file with your configuration:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/heliosmart
SECRET_KEY=your-secret-key-here
PVWATTS_API_KEY=your-pvwatts-api-key
OPENSOLAR_API_KEY=your-opensolar-api-key
```

### 4. Create Database
```bash
# In PostgreSQL
createdb heliosmart

# Or using psql
psql -U postgres
CREATE DATABASE heliosmart;
\q
```

### 5. Run Migrations
```bash
alembic upgrade head
```

If you need to create a new migration:
```bash
alembic revision --autogenerate -m "description"
alembic upgrade head
```

### 6. Run the Development Server
```bash
uvicorn app.main:app --reload
```

The API will be available at:
- API: http://localhost:8000
- Docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Testing the API

### Using cURL
```bash
# Health check
curl http://localhost:8000/health

# Get estimations
curl http://localhost:8000/api/v1/estimations

# Create estimation
curl -X POST http://localhost:8000/api/v1/estimations \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 34.0522,
    "longitude": -118.2437,
    "system_capacity": 5.0,
    "tilt": 25,
    "azimuth": 180,
    "energy_annual": 7500
  }'
```

### Using Swagger UI
Navigate to http://localhost:8000/docs to use the interactive API documentation.

## Common Issues

### Database Connection Error
- Ensure PostgreSQL is running
- Check DATABASE_URL in .env file
- Verify database exists: `psql -U postgres -l`

### Module Not Found
- Activate virtual environment
- Reinstall dependencies: `pip install -r requirements.txt`

### Migration Errors
- Drop and recreate database if needed
- Run: `alembic stamp head` then `alembic upgrade head`
