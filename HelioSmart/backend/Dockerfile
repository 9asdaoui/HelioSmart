# Use cliniq-backend as base — already has torch, transformers, faiss, langchain,
# sentence-transformers, psycopg2, pillow, httpx, passlib, python-jose, pypdf,
# pandas, numpy, etc. This avoids re-downloading ~3GB of heavy ML packages.
FROM cliniq-backend:latest

# Set working directory
WORKDIR /app

# Install system dependencies (ffmpeg required for pydub/audio processing)
RUN apt-get update && apt-get install -y \
    postgresql-client \
    gcc \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy delta requirements (only packages NOT already in base image)
COPY requirements-delta.txt .

# Install only the missing/upgraded packages on top of the base
RUN pip install --no-cache-dir -r requirements-delta.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run migrations and start server
CMD alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000
