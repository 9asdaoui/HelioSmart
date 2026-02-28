# SAM Roof Segmentation Service
# Uses NVIDIA CUDA for GPU acceleration

FROM pytorch/pytorch:2.1.0-cuda12.1-cudnn8-runtime

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    wget \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY requirements.docker.txt requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install segment-anything from GitHub
RUN pip install git+https://github.com/facebookresearch/segment-anything.git

# Copy application code
COPY api_service.py .
COPY test_api.py .

# Create directory for model
RUN mkdir -p /app/models

# Download SAM ViT-H model (2.4GB) - this will be cached in Docker layer
# Comment out if you want to mount the model from host instead
ARG DOWNLOAD_MODEL=true
RUN if [ "$DOWNLOAD_MODEL" = "true" ]; then \
    echo "Downloading SAM ViT-H model (2.4GB)..." && \
    wget -q --show-progress -O sam_vit_h_4b8939.pth \
    https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4b8939.pth && \
    echo "Model downloaded successfully!"; \
    fi

# Expose port
EXPOSE 8889

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8889/health || exit 1

# Run the service
CMD ["python", "-u", "api_service.py"]
