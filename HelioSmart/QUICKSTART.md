# Quick Start Guide

This guide will help you get HelioSmart up and running quickly.

## Prerequisites

Make sure you have the following installed:
- Python 3.10+ ([Download](https://www.python.org/downloads/))
- Node.js 18+ ([Download](https://nodejs.org/))
- PostgreSQL 14+ ([Download](https://www.postgresql.org/download/))

## Step 1: Clone or Navigate to Project

```bash
cd HelioSmart
```

## Step 2: Setup Backend

### Windows (PowerShell)

```powershell
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Copy environment file
copy .env.example .env

# Edit .env file with your database credentials
# notepad .env

# Create database (in PostgreSQL)
# Open PostgreSQL shell and run:
# CREATE DATABASE heliosmart;

# Run migrations
alembic upgrade head

# Start backend server
uvicorn app.main:app --reload
```

### macOS/Linux

```bash
# Navigate to backend
cd backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Edit .env file with your database credentials
# nano .env

# Create database
createdb heliosmart

# Run migrations
alembic upgrade head

# Start backend server
uvicorn app.main:app --reload
```

Backend will be running at:
- API: http://localhost:8000
- Docs: http://localhost:8000/docs

## Step 3: Setup Frontend (New Terminal)

### Windows

```powershell
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Copy environment file
copy .env.example .env

# Start development server
npm run dev
```

### macOS/Linux

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

Frontend will be running at: http://localhost:5173

## Step 4: Access the Application

1. Open your browser and go to: http://localhost:5173
2. You should see the HelioSmart homepage
3. Click "Create Estimation" to start creating your first solar estimation

## Basic Configuration

### Minimum .env for Backend

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/heliosmart
SECRET_KEY=change-this-to-a-random-secret-key
ALGORITHM=HS256
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Frontend .env

```env
VITE_API_URL=http://localhost:8000/api/v1
```

## Troubleshooting

### Backend Issues

**Database connection error:**
- Ensure PostgreSQL is running
- Check credentials in .env file
- Verify database exists

**Module not found:**
- Make sure virtual environment is activated
- Run `pip install -r requirements.txt` again

### Frontend Issues

**Cannot connect to API:**
- Ensure backend is running on port 8000
- Check VITE_API_URL in .env

**Port 5173 in use:**
- Change port in vite.config.js
- Or close the application using that port

## Next Steps

1. Read the full README.md for detailed information
2. Check backend/SETUP.md for backend-specific configuration
3. Check frontend/SETUP.md for frontend-specific configuration
4. Explore the API documentation at http://localhost:8000/docs

## Default Credentials

HelioSmart runs without authentication by default. You can start creating estimations immediately!

## API Testing

You can test the API using the Swagger UI:
1. Go to http://localhost:8000/docs
2. Try the `/api/v1/estimations` endpoints
3. Create, read, update, and delete estimations

Happy estimating with HelioSmart! ☀️
