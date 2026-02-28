# HelioSmart - Solar Estimation Platform

HelioSmart is a comprehensive solar energy estimation platform built with FastAPI (Python) backend and React frontend.

## Features

- **Solar Estimations**: Create and manage solar panel installation estimations
- **Panel Management**: Manage solar panel inventory with detailed specifications
- **Inverter Management**: Track and configure inverter options
- **Utility Management**: Configure utility companies and rate structures
- **PVWatts Integration**: Calculate solar production using NREL PVWatts API
- **OpenSolar Integration**: Advanced roof analysis and panel placement
- **Real-time Calculations**: Instant system capacity and production estimates

## Tech Stack

### Backend
- **FastAPI**: Modern, fast Python web framework
- **SQLAlchemy**: SQL toolkit and ORM
- **PostgreSQL**: Robust relational database
- **Alembic**: Database migrations
- **Pydantic**: Data validation using Python type annotations

### Frontend
- **React**: Modern UI library
- **Tailwind CSS**: Utility-first CSS framework
- **Axios**: HTTP client
- **React Router**: Client-side routing
- **React Query**: Data fetching and caching

## Project Structure

```
HelioSmart/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API routes
│   │   ├── core/           # Core configuration
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Business logic
│   │   └── utils/          # Utility functions
│   ├── alembic/            # Database migrations
│   ├── tests/              # Backend tests
│   └── requirements.txt    # Python dependencies
│
├── frontend/               # React frontend
│   ├── public/             # Static files
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── hooks/          # Custom hooks
│   │   ├── utils/          # Utility functions
│   │   └── App.jsx         # Main app component
│   └── package.json        # Node dependencies
│
└── README.md               # This file
```

## Getting Started

### Option 1: Docker (Recommended - Easiest)

**Prerequisites:** Docker and Docker Compose installed

```bash
# Development mode with hot reload
docker-compose -f docker-compose.dev.yml up

# Production mode
docker-compose up --build
```

Access the application:
- **Frontend**: http://localhost:5173 (dev) or http://localhost (prod)
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

For detailed Docker instructions, see [DOCKER.md](DOCKER.md)

### Option 2: Manual Setup

**Prerequisites:** Python 3.10+, Node.js 18+, PostgreSQL 14+

#### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Configure database in `.env`:
```
DATABASE_URL=postgresql://user:password@localhost:5432/heliosmart
```

5. Run migrations:
```bash
alembic upgrade head
```

6. Start the server:
```bash
uvicorn app.main:app --reload
```

Backend will be available at: http://localhost:8000
API documentation: http://localhost:8000/docs

#### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

Frontend will be available at: http://localhost:5173

## API Documentation

Once the backend is running, visit http://localhost:8000/docs for interactive API documentation (Swagger UI).

## License

MIT License
