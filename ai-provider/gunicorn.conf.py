"""
Gunicorn production configuration cho AI Provider
Tối ưu cho Render.com starter tier (512MB RAM)
"""
import os
import multiprocessing

# Bind - Render cung cấp PORT env var. Lightsail can pin this to the
# instance private IP so port 5050 is not exposed on the public interface.
port = os.getenv("PORT", "5050")
host = os.getenv("AI_PROVIDER_BIND_IP", "0.0.0.0")
bind = f"{host}:{port}"

# Workers - chỉ 1 worker vì YOLO model dùng nhiều RAM (~300MB)
# Nhiều worker sẽ duplicate model trong mỗi process → OOM
workers = int(os.getenv("WEB_CONCURRENCY", "1"))

# Threads - keep single request execution on Render Free to avoid overlapping
# YOLO11m inference memory spikes in the 512MB container.
threads = int(os.getenv("GUNICORN_THREADS", "1"))

# Timeout cao vì YOLO inference có thể chậm trên CPU
timeout = 120
graceful_timeout = 30

# Do not preload the app: /healthz must come up before the lazy YOLO model load.
preload_app = False

# Access log
accesslog = "-"  # stdout
errorlog = "-"   # stderr
loglevel = "info"

# Security
limit_request_line = 8190
limit_request_fields = 100
limit_request_field_size = 8190
