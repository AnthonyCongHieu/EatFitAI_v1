# Gunicorn configuration for EatFitAI AI Provider
# Sử dụng để chạy production với multi-worker

# Server socket
bind = "0.0.0.0:5050"

# Worker processes
# Khuyến nghị: 2 * CPU cores + 1
workers = 3

# Worker class - sử dụng sync vì YOLO inference blocking
worker_class = "sync"

# Timeout cho requests AI (Ollama có thể chậm)
timeout = 120

# Graceful timeout
graceful_timeout = 60

# Keep alive
keepalive = 5

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"

# Preload app để chia sẻ YOLO model giữa workers
preload_app = True

# Max requests per worker trước khi restart (tránh memory leak)
max_requests = 500
max_requests_jitter = 50
