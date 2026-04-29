#!/usr/bin/env python3
"""Fail when repo-tracked files look like live secrets or local credentials."""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
PLACEHOLDER_VALUES = {
    "",
    "SET_IN_USER_SECRETS",
    "SET_IN_ENV_OR_SECRET_STORE",
    "YOUR_VALUE_HERE",
    "YOUR_SECRET_HERE",
    "CHANGE_ME",
}
FORBIDDEN_EXACT_TRACKED_PATHS = {
    "eatfitai-mobile/android/app/google-services.json",
}
FORBIDDEN_SUFFIXES = (".jks", ".keystore", ".p12", ".pfx")
SECRET_EXTENSIONS = {".env", ".local"}


def normalize_repo_path(path: str | Path) -> str:
    return str(path).replace("\\", "/").strip("/")


def git_tracked_paths() -> list[str]:
    result = subprocess.run(
        ["git", "ls-files", "-z"],
        cwd=REPO_ROOT,
        check=True,
        capture_output=True,
        text=False,
    )
    raw_paths = result.stdout.decode("utf-8").split("\0")
    return [normalize_repo_path(path) for path in raw_paths if path]


def is_env_runtime_file(path: str) -> bool:
    name = Path(path).name
    if name.endswith(".example"):
        return False

    return name == ".env" or name.startswith(".env.")


def scan_tracked_paths(paths: list[str]) -> list[str]:
    findings: list[str] = []

    for path in paths:
        normalized = normalize_repo_path(path)
        lower = normalized.casefold()
        name = Path(normalized).name

        if normalized in FORBIDDEN_EXACT_TRACKED_PATHS:
            findings.append(f"{normalized}: should not be tracked; keep it local or in provider secrets")

        if lower.endswith(FORBIDDEN_SUFFIXES):
            findings.append(f"{normalized}: signing certificate/keystore must not be tracked")

        if is_env_runtime_file(normalized):
            findings.append(f"{normalized}: runtime .env files must not be tracked")

        if name == "google-services.json":
            findings.append(f"{normalized}: Firebase config must not be tracked")

    return findings


def is_placeholder(value: object) -> bool:
    if not isinstance(value, str):
        return False

    stripped = value.strip()
    if stripped in PLACEHOLDER_VALUES:
        return True

    return stripped.startswith("YOUR_") or stripped.startswith("SET_IN_")


def extract_connection_password(connection_string: str) -> str:
    match = re.search(r"(?:^|;)Password=([^;]*)", connection_string, flags=re.IGNORECASE)
    return match.group(1).strip() if match else ""


def scan_backend_development_config() -> list[str]:
    config_path = REPO_ROOT / "eatfitai-backend" / "appsettings.Development.json"
    if not config_path.exists():
        return []

    findings: list[str] = []
    try:
        config = json.loads(config_path.read_text(encoding="utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        return [f"eatfitai-backend/appsettings.Development.json: cannot parse JSON safely: {exc}"]

    connection_string = (
        config.get("ConnectionStrings", {}).get("DefaultConnection")
        if isinstance(config.get("ConnectionStrings"), dict)
        else None
    )
    if isinstance(connection_string, str):
        password = extract_connection_password(connection_string)
        if password and not is_placeholder(password):
            findings.append(
                "eatfitai-backend/appsettings.Development.json: "
                "ConnectionStrings:DefaultConnection contains a non-placeholder Password"
            )

    jwt_key = config.get("Jwt", {}).get("Key") if isinstance(config.get("Jwt"), dict) else None
    if isinstance(jwt_key, str) and not is_placeholder(jwt_key):
        findings.append(
            "eatfitai-backend/appsettings.Development.json: Jwt:Key must be a placeholder; "
            "use dotnet user-secrets for local development"
        )

    return findings


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    findings = scan_tracked_paths(git_tracked_paths())
    findings.extend(scan_backend_development_config())

    if not findings:
        print("No tracked secret files or local backend secrets found.")
        return 0

    print("Secret tracking guard failed:")
    for finding in findings:
        print(f"- {finding}")
    print(f"Total findings: {len(findings)}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
