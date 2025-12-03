import requests
import sys
import time

def check_service(name, url, expected_status=200):
    print(f"Checking {name} at {url}...")
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == expected_status:
            print(f"✅ {name} is UP ({response.status_code})")
            return True
        else:
            print(f"❌ {name} returned {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print(f"❌ {name} is DOWN (Connection Error)")
        return False
    except Exception as e:
        print(f"❌ {name} Error: {e}")
        return False

def check_ai_detection():
    print("\nChecking AI Detection (Mock)...")
    url = "http://localhost:5050/detect"
    # Create a dummy image file in memory
    files = {'file': ('test.jpg', b'fake_image_content', 'image/jpeg')}
    try:
        response = requests.post(url, files=files, timeout=5)
        if response.status_code == 200:
            print(f"✅ AI Detection Endpoint is working. Response: {response.json()}")
            return True
        else:
            print(f"❌ AI Detection failed with {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"❌ AI Detection Error: {e}")
        return False

def main():
    print("--- EatFitAI System Verification ---\n")
    
    # Check AI Provider
    ai_ok = check_service("AI Provider", "http://localhost:5050/healthz")
    
    # Check Backend (Swagger UI as proxy for running)
    be_ok = check_service("Backend API (Swagger)", "http://localhost:5247/swagger/index.html")
    
    # Check Backend Health Endpoint (if exists)
    be_health_ok = check_service("Backend Health API", "http://localhost:5247/api/Health/live")

    ai_detect_ok = False
    if ai_ok:
        ai_detect_ok = check_ai_detection()

    print("\n--- Summary ---")
    if ai_ok and be_ok:
        print("✅ All systems appear to be running.")
    else:
        print("⚠️ Some systems are having issues.")

if __name__ == "__main__":
    main()
