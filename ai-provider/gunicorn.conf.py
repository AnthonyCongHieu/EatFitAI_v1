"""
Gunicorn production configuration cho AI Provider
Tối ưu cho Render.com starter tier (512MB RAM)
"""
import os
import multiprocessing

# Bind - Render cung cấp PORT env var
port = os.getenv("PORT", "5050")
bind = f"0.0.0.0:{port}"

# Workers - chỉ 1 worker vì YOLO model dùng nhiều RAM (~300MB)
# Nhiều worker sẽ duplicate model trong mỗi process → OOM
workers = 1

# Threads - keep a small amount of request concurrency so health checks stay responsive.
threads = 2

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
