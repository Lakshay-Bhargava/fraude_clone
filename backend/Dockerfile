# FraudScope AI — Production Backend Dockerfile for Render / Cloud Containers
FROM python:3.11-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

# Install Linux system dependencies: Tesseract OCR with English and Hindi language data, plus curl for health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-hin \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory inside container
WORKDIR /app

# Install Python dependencies first for optimal Docker layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend application source code
COPY . .

# Ensure no Windows binaries or caches exist in image (defense in depth)
RUN rm -rf /app/tesseract /app/*.exe /app/*.dll 2>/dev/null || true

# Expose default port
EXPOSE 8000

# Start FastAPI application using Uvicorn, binding to 0.0.0.0 and dynamically respecting $PORT
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
