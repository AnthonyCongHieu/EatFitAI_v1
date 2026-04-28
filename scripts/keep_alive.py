#!/usr/bin/env python3
"""
EatFitAI Keep-Alive Cron
========================
Gửi request định kỳ đến Render Free Tier services để tránh spin-down.
Render Free Tier sẽ tắt service sau 15 phút không có traffic.

Cách sử dụng:
1. Chạy local: python keep_alive.py
2. GitHub Actions: xem .github/workflows/keep-alive.yml
3. Cron job: */14 * * * * python3 /path/to/keep_alive.py
"""

import urllib.request
import json
import sys
import time
from datetime import datetime, timezone, timedelta

# Fix Windows console encoding
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Vietnam timezone
VN_TZ = timezone(timedelta(hours=7))

SERVICES = [
    {
        "name": "Backend DEV",
        "url": "https://eatfitai-backend-dev.onrender.com/health/ready",
        "expected_status": 200,
    },
    {
        "name": "AI Provider DEV",
        "url": "https://eatfitai-ai-provider-dev.onrender.com/healthz",
        "expected_status": 200,
    },
    {
        "name": "Backend PROD",
        "url": "https://eatfitai-backend.onrender.com/health/ready",
        "expected_status": 200,
    },
    {
        "name": "AI Provider PROD",
        "url": "https://eatfitai-ai-provider.onrender.com/healthz",
        "expected_status": 200,
    },
]


def ping_service(service: dict) -> dict:
    """Ping a service and return result."""
    start = time.time()
    try:
        req = urllib.request.Request(service["url"], method="GET")
        req.add_header("User-Agent", "EatFitAI-KeepAlive/1.0")
        with urllib.request.urlopen(req, timeout=30) as resp:
            status = resp.status
            elapsed = round((time.time() - start) * 1000)
            return {
                "name": service["name"],
                "status": status,
                "elapsed_ms": elapsed,
                "ok": status == service["expected_status"],
                "error": None,
            }
    except Exception as e:
        elapsed = round((time.time() - start) * 1000)
        return {
            "name": service["name"],
            "status": 0,
            "elapsed_ms": elapsed,
            "ok": False,
            "error": str(e),
        }


def main():
    now = datetime.now(VN_TZ).strftime("%Y-%m-%d %H:%M:%S %Z")
    print(f"\n{'='*60}")
    print(f"  EatFitAI Keep-Alive — {now}")
    print(f"{'='*60}\n")

    results = []
    for svc in SERVICES:
        result = ping_service(svc)
        results.append(result)
        icon = "✅" if result["ok"] else "❌"
        print(f"  {icon} {result['name']:<20s} → {result['status']} ({result['elapsed_ms']}ms)")
        if result["error"]:
            print(f"     └─ Error: {result['error'][:80]}")

    ok_count = sum(1 for r in results if r["ok"])
    print(f"\n  Result: {ok_count}/{len(results)} services healthy")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
