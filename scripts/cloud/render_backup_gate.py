from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
TARGETS_PATH = REPO_ROOT / "infra" / "lightsail" / "render-backup-targets.json"
RENDER_API_BASE_URL = "https://api.render.com/v1"


def load_targets() -> list[dict[str, Any]]:
    payload = json.loads(TARGETS_PATH.read_text(encoding="utf-8"))
    return list(payload.get("services") or [])


def render_request(method: str, path: str, api_key: str) -> Any:
    request = urllib.request.Request(
        f"{RENDER_API_BASE_URL}{path}",
        method=method,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            body = response.read().decode("utf-8")
            return json.loads(body) if body else {}
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Render API {method} {path} failed: {exc.code} {detail}") from exc


def normalize_service(payload: Any) -> dict[str, Any]:
    if isinstance(payload, dict) and isinstance(payload.get("service"), dict):
        return payload["service"]
    if isinstance(payload, dict):
        return payload
    return {}


def latest_deploy(payload: Any) -> dict[str, Any]:
    if not isinstance(payload, list) or not payload:
        return {}
    first = payload[0]
    if isinstance(first, dict) and isinstance(first.get("deploy"), dict):
        return first["deploy"]
    return first if isinstance(first, dict) else {}


def collect_inventory(api_key: str) -> dict[str, Any]:
    rows = []
    for target in load_targets():
        service = normalize_service(render_request("GET", f"/services/{target['id']}", api_key))
        deploy = latest_deploy(
            render_request("GET", f"/services/{target['id']}/deploys?limit=1", api_key)
        )
        expected_auto_deploy = target.get("expectedAutoDeploy", "no")
        expected_final_state = target.get("expectedFinalState", "suspended")
        rows.append(
            {
                "name": target["name"],
                "id": target["id"],
                "role": target["role"],
                "serviceUrl": target["serviceUrl"],
                "autoDeploy": service.get("autoDeploy"),
                "autoDeployOk": service.get("autoDeploy") == expected_auto_deploy,
                "suspended": service.get("suspended"),
                "finalStateOk": service.get("suspended") == expected_final_state,
                "latestDeployId": deploy.get("id"),
                "latestDeployStatus": deploy.get("status"),
                "latestCommit": (deploy.get("commit") or {}).get("id"),
            }
        )

    return {
        "targetsPath": str(TARGETS_PATH.relative_to(REPO_ROOT)),
        "services": rows,
        "autoDeployFrozen": all(row["autoDeployOk"] for row in rows),
        "allSuspended": all(row["finalStateOk"] for row in rows),
    }


def suspend_targets(api_key: str) -> list[dict[str, str]]:
    results = []
    for target in load_targets():
        service = normalize_service(render_request("GET", f"/services/{target['id']}", api_key))
        if service.get("suspended") == "suspended":
            results.append({"name": target["name"], "id": target["id"], "action": "already-suspended"})
            continue

        render_request("POST", f"/services/{target['id']}/suspend", api_key)
        results.append({"name": target["name"], "id": target["id"], "action": "suspend-requested"})

    return results


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Inspect or suspend Render backup services after Lightsail cutover gates pass."
    )
    parser.add_argument(
        "--execute-suspend",
        action="store_true",
        help="Actually call Render suspend endpoints. Without this flag the script is read-only.",
    )
    parser.add_argument(
        "--gates-passed",
        action="store_true",
        help="Required with --execute-suspend after DuckDNS, auth, API, device, perf, and abuse gates pass.",
    )
    parser.add_argument(
        "--require-suspended",
        action="store_true",
        help="Exit non-zero unless all configured Render services are suspended.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    api_key = os.getenv("RENDER_API_KEY", "").strip()
    if not api_key:
        print("RENDER_API_KEY is required.", file=sys.stderr)
        return 2

    if args.execute_suspend and not args.gates_passed:
        print(
            "--execute-suspend requires --gates-passed. Do not suspend Render before cutover gates pass.",
            file=sys.stderr,
        )
        return 2

    if args.execute_suspend:
        suspend_results = suspend_targets(api_key)
        print(json.dumps({"suspendResults": suspend_results}, indent=2))

    inventory = collect_inventory(api_key)
    print(json.dumps(inventory, indent=2))

    if not inventory["autoDeployFrozen"]:
        return 1
    if args.require_suspended and not inventory["allSuspended"]:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
