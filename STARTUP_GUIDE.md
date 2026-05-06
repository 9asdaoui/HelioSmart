# 🚀 HelioSmart Startup Guide

**Quick Reference**: Step-by-step guide to run the entire HelioSmart stack.

---

## 📋 Prerequisites

Ensure you have installed:
- ✅ **Docker Desktop** (with Docker Compose)
- ✅ **Git** (for cloning)
- For manual setup (optional):
  - Python 3.10+
  - Node.js 18+
  - PostgreSQL 15+

---

## 🎯 Quick Start (Docker - Recommended)

### Option 1: Run Everything with Docker Compose

```powershell
# Navigate to the HelioSmart directory
cd HelioSmart

# Start all services (database, backend, frontend, ollama)
docker-compose -f docker-compose.dev.yml up -d

# Check status
docker-compose -f docker-compose.dev.yml ps

# View logs
docker-compose -f docker-compose.dev.yml logs -f
```

**Access Points**:
- 🌐 **Frontend**: http://localhost:5173
- 🔧 **Backend API**: http://localhost:8000
- 📚 **API Docs**: http://localhost:8000/docs
- 💾 **Database**: localhost:5432
- 🤖 **Ollama**: http://localhost:11434

---

## 📝 Step-by-Step Setup (Detailed)

### Step 1️⃣: Prepare Environment Files

The `.env` files have been created for you with the NREL API key configured.

**Backend** (`HelioSmart/backend/.env`):
- ✅ PVWATTS_API_KEY is already set
- ⚠️ If you need Google Maps, add it to frontend `.env`

**Frontend** (`HelioSmart/frontend/.env`):
- Add Google Maps API key if needed for satellite imagery

### Step 2️⃣: Start Database First

```powershell
# Start only the database
cd HelioSmart
docker-compose -f docker-compose.dev.yml up -d db

# Wait a moment, then verify it's healthy
docker-compose -f docker-compose.dev.yml ps db

# Expected output: State should be "Up (healthy)"
```

**Health Check**:
```powershell
# Check database logs
docker logs heliosmart-db-dev

# Should see: "database system is ready to accept connections"
```

### Step 3️⃣: Start Backend

```powershell
# Start backend (depends on database)
docker-compose -f docker-compose.dev.yml up -d backend

# View backend startup logs
docker logs -f heliosmart-backend-dev
```

**What Happens**:
1. ✅ Connects to PostgreSQL
2. ✅ Runs Alembic migrations (`alembic upgrade head`)
3. ✅ Starts FastAPI server on port 8000
4. ✅ Loads chatbot models in background

**Verify Backend**:
```powershell
# Test health endpoint
curl http://localhost:8000/health

# Expected: {"status":"healthy"}
```

Or open in browser: http://localhost:8000/docs

### Step 4️⃣: Start Frontend

```powershell
# Start frontend
docker-compose -f docker-compose.dev.yml up -d frontend

# View frontend logs
docker logs -f heliosmart-frontend-dev
```

**What Happens**:
1. ✅ Installs npm dependencies
2. ✅ Starts Vite dev server on port 5173
3. ✅ Connects to backend at http://localhost:8000

**Verify Frontend**:
Open browser: http://localhost:5173

### Step 5️⃣: Start Ollama (Optional - For Chatbot)

```powershell
# Start Ollama service
docker-compose -f docker-compose.dev.yml up -d ollama

# Pull the llama model (first time only - takes a few minutes)
docker exec -it heliosmart-ollama-dev ollama pull llama3.2:1b

# Verify
docker exec -it heliosmart-ollama-dev ollama list
```

### Step 6️⃣: Start AI Microservice (Optional - For Roof Detection)

The `py_service` runs separately and requires the SAM model.

**Option A: Run with Docker (GPU)**
```powershell
cd py_service

# Build and start (will attempt to download 2.4GB model)
docker-compose up -d sam-service

# Check logs
docker logs -f heliosmart-sam-service
```

**Option B: Run with Docker (CPU-only)**
```powershell
cd py_service

# Use CPU version (slower but doesn't need GPU)
docker-compose up -d sam-service-cpu

# Check logs
docker logs -f heliosmart-sam-service-cpu
```

**Option C: Run Manually (Python)**
```powershell
cd py_service

# Create virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Download SAM model (2.4GB - or use smaller ViT-B 375MB)
# Large model (better accuracy):
Invoke-WebRequest -Uri https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4b8939.pth -OutFile sam_vit_h_4b8939.pth

# OR Small model (faster, less accurate):
# Invoke-WebRequest -Uri https://dl.fbaipublicfiles.com/segment_anything/sam_vit_b_01ec64.pth -OutFile sam_vit_b_01ec64.pth
# Then edit api_service.py: SAM_CHECKPOINT = "sam_vit_b_01ec64.pth" and MODEL_TYPE = "vit_b"

# Start service
python api_service.py
```

**Verify Microservice**:
```powershell
curl http://localhost:8889/health

# Expected: {"status":"healthy","model_loaded":true,...}
```

---

## 🔍 Verification Checklist

Run these commands to verify each service:

```powershell
# 1. Database
docker logs heliosmart-db-dev --tail 20
# Should see: "database system is ready to accept connections"

# 2. Backend
curl http://localhost:8000/health
# Should return: {"status":"healthy"}

# 3. Backend API Docs
start http://localhost:8000/docs
# Should open interactive API documentation

# 4. Frontend
start http://localhost:5173
# Should open HelioSmart homepage

# 5. Ollama (if started)
docker exec -it heliosmart-ollama-dev ollama list
# Should show llama3.2:1b

# 6. Microservice (if started)
curl http://localhost:8889/health
# Should return health status with model info
```

---

## 🐛 Troubleshooting

### Database Issues

**Problem**: Backend can't connect to database
```powershell
# Check database is running
docker-compose -f docker-compose.dev.yml ps db

# Check database logs
docker logs heliosmart-db-dev

# Restart database
docker-compose -f docker-compose.dev.yml restart db
```

### Backend Issues

**Problem**: Backend crashes or won't start
```powershell
# Check logs
docker logs heliosmart-backend-dev --tail 50

# Common issues:
# - Database not ready: Wait a few seconds and restart
# - Port 8000 already in use: Stop other processes or change port
# - Migration error: Check database is clean

# Restart backend
docker-compose -f docker-compose.dev.yml restart backend
```

**Problem**: Migrations fail
```powershell
# Run migrations manually
docker exec -it heliosmart-backend-dev alembic upgrade head

# Or reset database (WARNING: deletes all data)
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d
```

### Frontend Issues

**Problem**: Frontend shows connection errors
```powershell
# Check logs
docker logs heliosmart-frontend-dev --tail 50

# Verify API URL
cat HelioSmart/frontend/.env
# Should be: VITE_API_URL=http://localhost:8000/api/v1

# Restart frontend
docker-compose -f docker-compose.dev.yml restart frontend
```

**Problem**: npm install fails
```powershell
# Clear node_modules and reinstall
docker-compose -f docker-compose.dev.yml down frontend
docker volume rm heliosmart_frontend_node_modules 2>$null
docker-compose -f docker-compose.dev.yml up -d frontend
```

### Microservice Issues

**Problem**: SAM model not found
```powershell
# The model file is 2.4GB and must be downloaded
cd py_service

# Download manually
Invoke-WebRequest -Uri https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4b8939.pth -OutFile sam_vit_h_4b8939.pth

# Verify file size (should be ~2.4GB)
ls -lh sam_vit_h_4b8939.pth
```

**Problem**: GPU not available
```powershell
# Use CPU version instead
cd py_service
docker-compose up -d sam-service-cpu

# Or set CUDA_VISIBLE_DEVICES="" to force CPU mode
```

### Ollama Issues

**Problem**: Ollama model not found
```powershell
# Pull the model
docker exec -it heliosmart-ollama-dev ollama pull llama3.2:1b

# Check available models
docker exec -it heliosmart-ollama-dev ollama list

# If download fails, try smaller model
docker exec -it heliosmart-ollama-dev ollama pull llama3.2:1b
```

---

## 🔄 Common Commands

### Start All Services
```powershell
cd HelioSmart
docker-compose -f docker-compose.dev.yml up -d
```

### Stop All Services
```powershell
docker-compose -f docker-compose.dev.yml down
```

### Restart Specific Service
```powershell
docker-compose -f docker-compose.dev.yml restart backend
docker-compose -f docker-compose.dev.yml restart frontend
docker-compose -f docker-compose.dev.yml restart db
```

### View Logs
```powershell
# All services
docker-compose -f docker-compose.dev.yml logs -f

# Specific service
docker logs -f heliosmart-backend-dev
docker logs -f heliosmart-frontend-dev
docker logs -f heliosmart-db-dev
docker logs -f heliosmart-ollama-dev
```

### Check Service Status
```powershell
docker-compose -f docker-compose.dev.yml ps
```

### Clean Everything (Reset)
```powershell
# WARNING: This deletes all data including database!
docker-compose -f docker-compose.dev.yml down -v
docker volume prune -f
```

### Access Database
```powershell
# Connect to PostgreSQL
docker exec -it heliosmart-db-dev psql -U postgres -d heliosmart

# Run SQL queries
SELECT COUNT(*) FROM estimations;
\dt  # List tables
\q   # Exit
```

### Run Backend Commands
```powershell
# Run migrations
docker exec -it heliosmart-backend-dev alembic upgrade head

# Seed database
docker exec -it heliosmart-backend-dev python seed_moroccan_data.py

# Open backend shell
docker exec -it heliosmart-backend-dev bash
```

### Run Frontend Commands
```powershell
# Install new package
docker exec -it heliosmart-frontend-dev npm install <package-name>

# Rebuild
docker exec -it heliosmart-frontend-dev npm run build

# Open frontend shell
docker exec -it heliosmart-frontend-dev sh
```

---

## 🎯 Test the Complete Flow

Once everything is running:

### 1. **Create an Estimation**
- Navigate to: http://localhost:5173
- Click "New Estimation" (green button)
- Fill out the 6-step wizard:
  - **Step 1**: Customer info + location (use map or enter coordinates)
  - **Step 2**: Select energy usage pattern
  - **Step 3**: Choose utility provider
  - **Step 4**: Roof details (type, tilt, stories)
  - **Step 5**: Place roof points (if needed)
  - **Step 6**: Review and submit

### 2. **View Results**
- After submission, you'll be redirected to the estimation details
- Should see:
  - System capacity
  - Panel count
  - Monthly production chart
  - Financial analysis
  - Environmental impact

### 3. **Check Backend Calculations**
- Open API docs: http://localhost:8000/docs
- Try the `/api/v1/estimations` endpoints
- View the created estimation in the database

### 4. **Test Chatbot** (if Ollama running)
- Navigate to: http://localhost:5173/chatbot
- Ask questions about solar energy
- Test voice input (if enabled)

### 5. **Test Admin Features**
- Go to: http://localhost:5173/admin/panels
- Add/edit/delete solar panels
- Same for inverters, utilities, configurations

---

## 📊 Service Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User Browser                         │
│              http://localhost:5173                      │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────▼────────────┐
        │   Frontend (React)      │
        │   Port: 5173           │
        │   Vite Dev Server      │
        └────────────┬────────────┘
                     │ HTTP REST
        ┌────────────▼────────────┐
        │   Backend (FastAPI)     │
        │   Port: 8000           │
        │   API + Business Logic  │
        └─────┬──────┬──────┬─────┘
              │      │      │
    ┌─────────┘      │      └──────────┐
    │                │                 │
┌───▼────┐    ┌──────▼─────┐    ┌─────▼──────┐
│Database│    │   Ollama   │    │ py_service │
│Port:   │    │   Port:    │    │ Port: 8889 │
│5432    │    │   11434    │    │ SAM Model  │
└────────┘    └────────────┘    └────────────┘
```

---

## 🎓 Next Steps

After getting everything running:

1. ✅ **Seed Database**: Run `python seed_moroccan_data.py` to add panels/inverters
2. ✅ **Test Estimations**: Create a few test estimations
3. ✅ **Configure Google Maps**: Add API key for better satellite imagery
4. ✅ **Deploy py_service**: For AI-powered roof detection
5. ✅ **Review Logs**: Check for any warnings or errors
6. ✅ **Read Documentation**: See DEVELOPMENT_NOTES.md for task list

---

## 📚 Additional Resources

- **Main README**: [HelioSmart/README.md](HelioSmart/README.md)
- **Docker Guide**: [HelioSmart/DOCKER.md](HelioSmart/DOCKER.md)
- **Development Tasks**: [DEVELOPMENT_NOTES.md](DEVELOPMENT_NOTES.md)
- **Backend Details**: [HelioSmart/IMPLEMENTATION_SUMMARY.md](HelioSmart/IMPLEMENTATION_SUMMARY.md)
- **Frontend Changes**: [HelioSmart/FRONTEND_CHANGES.md](HelioSmart/FRONTEND_CHANGES.md)
- **AI Service**: [py_service/README.md](py_service/README.md)

---

## 🆘 Getting Help

If you encounter issues:

1. **Check Logs**: `docker logs <container-name>`
2. **Check Status**: `docker-compose -f docker-compose.dev.yml ps`
3. **Verify Health**: Visit http://localhost:8000/health
4. **Review Docs**: Read the relevant README files
5. **Reset Everything**: `docker-compose -f docker-compose.dev.yml down -v && docker-compose -f docker-compose.dev.yml up -d`

---

**🎉 Happy Developing!**
