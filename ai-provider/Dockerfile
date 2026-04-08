# Dockerfile cho EatFitAI AI Provider (Python + YOLO)
# Chạy CPU-only trên Render.com

FROM python:3.11-slim

WORKDIR /app

# Cài system deps cho OpenCV headless và torch
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 curl && \
    rm -rf /var/lib/apt/lists/*

# Copy requirements trước để tận dụng Docker cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source và model weights
COPY . .

# Port mặc định cho AI Provider
EXPOSE 5050

# Health check nội bộ
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s \
    CMD curl -f http://localhost:5050/healthz || exit 1

# Chạy với gunicorn (production WSGI server)
CMD ["gunicorn", "-c", "gunicorn.conf.py", "app:app"]
