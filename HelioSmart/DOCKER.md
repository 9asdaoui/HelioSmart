# HelioSmart Docker Guide

## Quick Start

### Development Mode (Recommended for development)

```bash
# Start all services
docker-compose -f docker-compose.dev.yml up

# Or run in background
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker-compose.dev.yml down
```

Access the application:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### Production Mode

```bash
# Build and start all services
docker-compose up --build

# Or run in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

Access the application:
- **Frontend**: http://localhost
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## Services

### Database (PostgreSQL)
- **Port**: 5432
- **Database**: heliosmart
- **Username**: postgres
- **Password**: postgres

### Backend (FastAPI)
- **Port**: 8000
- **Auto-reload**: Enabled in dev mode
- **API Documentation**: http://localhost:8000/docs

### Frontend (React + Vite)
- **Port**: 5173 (dev) / 80 (prod)
- **Hot Module Replacement**: Enabled in dev mode

## Common Commands

### View running containers
```bash
docker-compose ps
```

### View logs for specific service
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

### Restart a service
```bash
docker-compose restart backend
```

### Rebuild a service
```bash
docker-compose up -d --build backend
```

### Execute commands in containers
```bash
# Backend shell
docker-compose exec backend bash

# Run migrations
docker-compose exec backend alembic upgrade head

# Frontend shell
docker-compose exec frontend sh

# Database shell
docker-compose exec db psql -U postgres -d heliosmart
```

### Clean up everything
```bash
# Stop and remove containers, networks
docker-compose down

# Also remove volumes (WARNING: This deletes all data!)
docker-compose down -v
```

## Development Workflow

1. **Start the development environment:**
   ```bash
   docker-compose -f docker-compose.dev.yml up
   ```

2. **Make changes to code:**
   - Backend changes are auto-reloaded
   - Frontend changes trigger Vite HMR

3. **View logs:**
   ```bash
   docker-compose -f docker-compose.dev.yml logs -f
   ```

4. **Create database migration:**
   ```bash
   docker-compose exec backend alembic revision --autogenerate -m "description"
   docker-compose exec backend alembic upgrade head
   ```

## Production Deployment

1. **Update environment variables** in `docker-compose.yml`:
   - Change `SECRET_KEY` to a secure random string
   - Update `CORS_ORIGINS` to your domain
   - Set `DEBUG` to `False`

2. **Build and run:**
   ```bash
   docker-compose up -d --build
   ```

3. **Check status:**
   ```bash
   docker-compose ps
   ```

## Troubleshooting

### Database connection issues
```bash
# Check if database is ready
docker-compose exec db pg_isready -U postgres

# View database logs
docker-compose logs db
```

### Port already in use
Edit `docker-compose.yml` and change the port mapping:
```yaml
ports:
  - "3000:80"  # Change 80 to 3000 or another available port
```

### Rebuild from scratch
```bash
docker-compose down -v
docker-compose build --no-cache
docker-compose up
```

### Reset database
```bash
docker-compose down -v
docker-compose up -d db
# Wait for DB to be ready
docker-compose up backend
```

## Environment Variables

### Backend
- `DATABASE_URL`: PostgreSQL connection string
- `SECRET_KEY`: JWT secret key
- `CORS_ORIGINS`: Allowed CORS origins
- `DEBUG`: Enable debug mode

### Frontend
- `VITE_API_URL`: Backend API URL

## Volume Management

### Backup database
```bash
docker-compose exec db pg_dump -U postgres heliosmart > backup.sql
```

### Restore database
```bash
cat backup.sql | docker-compose exec -T db psql -U postgres heliosmart
```

## Performance Tips

- Use `docker-compose.dev.yml` for development (hot reload)
- Use `docker-compose.yml` for production (optimized builds)
- Monitor resource usage: `docker stats`
- Clean up unused images: `docker image prune`
