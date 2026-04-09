"""
Upload best.pt lên Supabase Storage (bucket: ml-models)
Chạy 1 lần từ máy local để đưa model lên cloud.

Cách dùng:
  set SUPABASE_SERVICE_KEY=eyJ...
  python upload_model.py
"""
import os
import sys
import requests

# Cấu hình Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://bjlmndmafrajjysenpbm.supabase.co")
SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
BUCKET = "ml-models"
MODEL_FILE = "best.pt"

if not SERVICE_KEY:
    print("❌ Cần set SUPABASE_SERVICE_KEY environment variable!")
    print("   set SUPABASE_SERVICE_KEY=eyJ...")
    sys.exit(1)

if not os.path.exists(MODEL_FILE):
    print(f"❌ Không tìm thấy {MODEL_FILE} trong thư mục hiện tại!")
    sys.exit(1)

file_size_mb = os.path.getsize(MODEL_FILE) / (1024 * 1024)
print(f"📦 Uploading {MODEL_FILE} ({file_size_mb:.1f} MB) → Supabase Storage/{BUCKET}")
print(f"🔗 Target: {SUPABASE_URL}/storage/v1/object/{BUCKET}/{MODEL_FILE}")

# Upload qua Supabase Storage REST API
upload_url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{MODEL_FILE}"

with open(MODEL_FILE, "rb") as f:
    headers = {
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/octet-stream",
        # Upsert = true: ghi đè nếu file đã tồn tại (tiện khi update model)
        "x-upsert": "true",
    }
    
    response = requests.post(upload_url, headers=headers, data=f)

if response.status_code in (200, 201):
    print(f"✅ Upload thành công!")
    print(f"   Bucket: {BUCKET}")
    print(f"   Path: {MODEL_FILE}")
    print(f"   Size: {file_size_mb:.1f} MB")
    print(f"\n📋 Để verify, kiểm tra Supabase Dashboard → Storage → ml-models")
else:
    print(f"❌ Upload thất bại! Status: {response.status_code}")
    print(f"   Response: {response.text}")
    sys.exit(1)
