from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import os
import secrets
import shutil
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib import error, parse, request


DEFAULT_TIMEOUT_SECONDS = 30
RENDER_DEPLOY_SUCCESS_STATES = {"live", "succeeded", "success", "deployed"}
RENDER_DEPLOY_FAILURE_STATES = {
    "build_failed",
    "failed",
    "canceled",
    "cancelled",
    "update_failed",
    "deactivated",
    "timed_out",
}


class ApiError(RuntimeError):
    def __init__(self, status_code: int, message: str, body: str | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.body = body or ""


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_targets(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def emit(result: Any) -> None:
    print(json.dumps(result, indent=2, ensure_ascii=False))


def mask_secret(value: str | None, start: int = 4, end: int = 4) -> str | None:
    if not value:
        return None
    if len(value) <= start + end:
        return "*" * len(value)
    return f"{value[:start]}{'*' * (len(value) - start - end)}{value[-end:]}"


def fingerprint_secret(value: str | None) -> str | None:
    if not value:
        return None
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:12]


def build_url(base_url: str, path: str, query: dict[str, Any] | None = None) -> str:
    url = f"{base_url.rstrip('/')}/{path.lstrip('/')}"
    if not query:
        return url

    filtered = {
        key: value
        for key, value in query.items()
        if value is not None and value != ""
    }
    if not filtered:
        return url

    return f"{url}?{parse.urlencode(filtered, doseq=True)}"


def http_json(
    method: str,
    url: str,
    headers: dict[str, str] | None = None,
    payload: Any | None = None,
    timeout: int = DEFAULT_TIMEOUT_SECONDS,
) -> Any:
    final_headers = {
        "Accept": "application/json",
        # Cloudflare occasionally blocks Python's default client signature on
        # management APIs, so we send a stable desktop browser-like UA.
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/135.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "en-US,en;q=0.9",
    }
    if headers:
        final_headers.update(headers)

    data: bytes | None = None
    if payload is not None:
        final_headers.setdefault("Content-Type", "application/json")
        data = json.dumps(payload).encode("utf-8")

    req = request.Request(url, method=method, headers=final_headers, data=data)
    try:
        with request.urlopen(req, timeout=timeout) as response:
            raw = response.read()
    except error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        message = body[:400] if body else str(exc.reason)
        raise ApiError(exc.code, f"{method} {url} failed with HTTP {exc.code}: {message}", body) from exc
    except error.URLError as exc:
        raise RuntimeError(f"{method} {url} failed: {exc.reason}") from exc

    if not raw:
        return {}

    text = raw.decode("utf-8", errors="replace")
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {"raw": text}


def discover_token_from_env(*names: str) -> tuple[str | None, str | None]:
    for name in names:
        value = os.getenv(name, "").strip()
        if value:
            return value, f"env:{name}"
    return None, None


def run_command(args: list[str], cwd: Path | None = None, timeout: int = 15) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        args,
        cwd=str(cwd) if cwd else None,
        check=True,
        capture_output=True,
        text=True,
        timeout=timeout,
    )


def discover_github_token() -> tuple[str | None, str | None]:
    token, source = discover_token_from_env("GITHUB_TOKEN", "GH_TOKEN")
    if token:
        return token, source

    try:
        result = subprocess.run(
            ["git", "credential", "fill"],
            input="protocol=https\nhost=github.com\n\n",
            check=True,
            capture_output=True,
            text=True,
            timeout=10,
        )
    except Exception:
        return None, None

    fields: dict[str, str] = {}
    for raw_line in result.stdout.splitlines():
        if "=" not in raw_line:
            continue
        key, value = raw_line.split("=", 1)
        fields[key.strip()] = value.strip()

    password = fields.get("password")
    if password:
        return password, "git-credential"
    return None, None


def discover_render_api_key() -> tuple[str | None, str | None]:
    return discover_token_from_env("RENDER_API_KEY")


def discover_supabase_token() -> tuple[str | None, str | None]:
    return discover_token_from_env("SUPABASE_ACCESS_TOKEN")


def discover_vercel_token() -> tuple[str | None, str | None]:
    token, source = discover_token_from_env("VERCEL_TOKEN")
    if token:
        return token, source

    auth_path = Path.home() / ".vercel" / "auth.json"
    if auth_path.exists():
        try:
            auth_data = json.loads(auth_path.read_text(encoding="utf-8"))
            token = (auth_data.get("token") or "").strip()
            if token:
                return token, str(auth_path)
        except json.JSONDecodeError:
            pass

    return None, None


def discover_google_access_token() -> tuple[str | None, str | None]:
    token, source = discover_token_from_env("GOOGLE_OAUTH_ACCESS_TOKEN")
    if token:
        return token, source

    if shutil.which("gcloud"):
        try:
            result = run_command(["gcloud", "auth", "print-access-token"], timeout=10)
            token = result.stdout.strip()
            if token:
                return token, "gcloud"
        except Exception:
            pass

    return None, None


def github_headers(token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def github_get_repo(owner: str, repo_name: str, token: str) -> dict[str, Any]:
    return http_json(
        "GET",
        build_url("https://api.github.com", f"/repos/{owner}/{repo_name}"),
        headers=github_headers(token),
    )


def github_enable_security(owner: str, repo_name: str, token: str) -> dict[str, Any]:
    payload = {
        "security_and_analysis": {
            "secret_scanning": {"status": "enabled"},
            "secret_scanning_push_protection": {"status": "enabled"},
        }
    }
    return http_json(
        "PATCH",
        build_url("https://api.github.com", f"/repos/{owner}/{repo_name}"),
        headers=github_headers(token),
        payload=payload,
    )


def normalize_github_security(repo: dict[str, Any]) -> dict[str, Any]:
    analysis = repo.get("security_and_analysis") or {}
    secret_scanning = (analysis.get("secret_scanning") or {}).get("status")
    push_protection = (analysis.get("secret_scanning_push_protection") or {}).get("status")
    return {
        "name": repo.get("name"),
        "private": repo.get("private"),
        "secretScanning": secret_scanning or "disabled_or_unavailable",
        "pushProtection": push_protection or "disabled_or_unavailable",
        "htmlUrl": repo.get("html_url"),
    }


def render_headers(api_key: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
    }


def render_api_request(
    method: str,
    targets: dict[str, Any],
    path: str,
    api_key: str,
    payload: Any | None = None,
    query: dict[str, Any] | None = None,
) -> Any:
    return http_json(
        method,
        build_url(targets["render"]["baseUrl"], path, query),
        headers=render_headers(api_key),
        payload=payload,
    )


def normalize_render_env_items(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    if isinstance(payload, dict):
        for candidate in ("items", "envVars", "data"):
            value = payload.get(candidate)
            if isinstance(value, list):
                return [item for item in value if isinstance(item, dict)]
    return []


def render_env_key(item: dict[str, Any]) -> str | None:
    for key in ("envVarKey", "key", "name"):
        value = item.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()

    nested = item.get("envVar")
    if isinstance(nested, dict):
        return render_env_key(nested)
    return None


def render_env_value_from_payload(payload: Any) -> str | None:
    if not isinstance(payload, dict):
        return None

    for key in ("value", "previewValue"):
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            upper = value.strip().upper()
            if upper in {"UNAVAILABLE", "REDACTED", "<REDACTED>"}:
                return None
            return value

    nested = payload.get("envVar")
    if isinstance(nested, dict):
        return render_env_value_from_payload(nested)

    return None


def render_get_service(targets: dict[str, Any], service_id: str, api_key: str) -> dict[str, Any]:
    payload = render_api_request("GET", targets, f"/services/{service_id}", api_key)
    return payload if isinstance(payload, dict) else {}


def render_list_env_vars(targets: dict[str, Any], service_id: str, api_key: str) -> list[dict[str, Any]]:
    payload = render_api_request("GET", targets, f"/services/{service_id}/env-vars", api_key, query={"limit": 100})
    return normalize_render_env_items(payload)


def render_get_env_var(targets: dict[str, Any], service_id: str, env_key: str, api_key: str) -> str | None:
    encoded_key = parse.quote(env_key, safe="")
    try:
        payload = render_api_request("GET", targets, f"/services/{service_id}/env-vars/{encoded_key}", api_key)
    except ApiError as exc:
        if exc.status_code == 404:
            return None
        raise
    return render_env_value_from_payload(payload)


def render_upsert_env_var(
    targets: dict[str, Any],
    service_id: str,
    env_key: str,
    value: str,
    api_key: str,
) -> dict[str, Any]:
    encoded_key = parse.quote(env_key, safe="")
    payload = {"value": value}
    result = render_api_request("PUT", targets, f"/services/{service_id}/env-vars/{encoded_key}", api_key, payload=payload)
    return result if isinstance(result, dict) else {}


def render_trigger_deploy(targets: dict[str, Any], service_id: str, api_key: str) -> dict[str, Any]:
    payload = {"clearCache": "do_not_clear"}
    result = render_api_request("POST", targets, f"/services/{service_id}/deploys", api_key, payload=payload)
    return result if isinstance(result, dict) else {}


def render_list_deploys(targets: dict[str, Any], service_id: str, api_key: str) -> list[dict[str, Any]]:
    payload = render_api_request("GET", targets, f"/services/{service_id}/deploys", api_key, query={"limit": 5})
    if isinstance(payload, dict):
        for candidate in ("deploys", "items", "data"):
            value = payload.get(candidate)
            if isinstance(value, list):
                return [item for item in value if isinstance(item, dict)]
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    return []


def render_wait_for_latest_deploy(
    targets: dict[str, Any],
    service_id: str,
    api_key: str,
    timeout_seconds: int,
) -> dict[str, Any]:
    start = time.time()
    while time.time() - start < timeout_seconds:
        deploys = render_list_deploys(targets, service_id, api_key)
        if deploys:
            latest = deploys[0]
            status = str(latest.get("status") or latest.get("state") or "").lower()
            if status in RENDER_DEPLOY_SUCCESS_STATES:
                return latest
            if status in RENDER_DEPLOY_FAILURE_STATES:
                raise RuntimeError(f"Render deploy failed with state '{status}'.")
        time.sleep(10)

    raise TimeoutError(f"Timed out waiting for latest Render deploy for service {service_id}.")


def parse_npgsql_connection_string(connection_string: str) -> list[tuple[str, str]]:
    pairs: list[tuple[str, str]] = []
    for chunk in connection_string.split(";"):
        item = chunk.strip()
        if not item or "=" not in item:
            continue
        key, value = item.split("=", 1)
        pairs.append((key, value))
    return pairs


def update_connection_string_password(connection_string: str, new_password: str) -> str:
    pairs = parse_npgsql_connection_string(connection_string)
    updated = False
    rewritten: list[str] = []

    for key, value in pairs:
        if key.strip().lower() == "password":
            rewritten.append(f"{key}={new_password}")
            updated = True
        else:
            rewritten.append(f"{key}={value}")

    if not updated:
        rewritten.append(f"Password={new_password}")

    return ";".join(rewritten) + ";"


def supabase_headers(token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {token}",
        "apikey": token,
        "Accept": "application/json",
    }


def supabase_api_request(
    method: str,
    targets: dict[str, Any],
    path: str,
    token: str,
    payload: Any | None = None,
    query: dict[str, Any] | None = None,
) -> Any:
    return http_json(
        method,
        build_url(targets["supabase"]["baseUrl"], path, query),
        headers=supabase_headers(token),
        payload=payload,
    )


def supabase_get_project(targets: dict[str, Any], token: str) -> dict[str, Any]:
    ref = targets["supabase"]["projectRef"]
    payload = supabase_api_request("GET", targets, f"/projects/{ref}", token)
    return payload if isinstance(payload, dict) else {}


def supabase_list_api_keys(targets: dict[str, Any], token: str) -> list[dict[str, Any]]:
    ref = targets["supabase"]["projectRef"]
    payload = supabase_api_request("GET", targets, f"/projects/{ref}/api-keys", token)
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    if isinstance(payload, dict):
        for candidate in ("keys", "items", "data"):
            value = payload.get(candidate)
            if isinstance(value, list):
                return [item for item in value if isinstance(item, dict)]
    return []


def supabase_rotate_db_password(targets: dict[str, Any], token: str, new_password: str) -> dict[str, Any]:
    ref = targets["supabase"]["projectRef"]
    payload = {"password": new_password}
    result = supabase_api_request("PATCH", targets, f"/projects/{ref}/database/password", token, payload=payload)
    return result if isinstance(result, dict) else {}


def vercel_headers(token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    }


def vercel_api_request(
    method: str,
    targets: dict[str, Any],
    path: str,
    token: str,
    payload: Any | None = None,
    query: dict[str, Any] | None = None,
) -> Any:
    return http_json(
        method,
        build_url(targets["vercel"]["baseUrl"], path, query),
        headers=vercel_headers(token),
        payload=payload,
    )


def vercel_list_env(targets: dict[str, Any], token: str) -> list[dict[str, Any]]:
    project_id = targets["vercel"]["projectId"]
    team_id = targets["vercel"]["teamId"]
    payload = vercel_api_request(
        "GET",
        targets,
        f"/v10/projects/{project_id}/env",
        token,
        query={"teamId": team_id, "decrypt": "false"},
    )
    if isinstance(payload, dict):
        for candidate in ("envs", "items", "data"):
            value = payload.get(candidate)
            if isinstance(value, list):
                return [item for item in value if isinstance(item, dict)]
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    return []


def vercel_upsert_env(
    targets: dict[str, Any],
    token: str,
    key: str,
    value: str,
    env_targets: list[str],
) -> Any:
    project_id = targets["vercel"]["projectId"]
    team_id = targets["vercel"]["teamId"]
    payload = [
        {
            "key": key,
            "value": value,
            "type": "encrypted",
            "target": env_targets,
        }
    ]
    return vercel_api_request(
        "POST",
        targets,
        f"/v10/projects/{project_id}/env",
        token,
        payload=payload,
        query={"teamId": team_id, "upsert": "true"},
    )


def google_headers(access_token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json",
    }


def google_api_request(
    method: str,
    path: str,
    access_token: str,
    payload: Any | None = None,
    query: dict[str, Any] | None = None,
) -> Any:
    return http_json(
        method,
        build_url("https://apikeys.googleapis.com", path, query),
        headers=google_headers(access_token),
        payload=payload,
    )


def read_google_services_api_key(path: Path) -> str:
    data = json.loads(path.read_text(encoding="utf-8"))
    return data["client"][0]["api_key"][0]["current_key"]


def google_lookup_api_key_name(access_token: str, key_string: str) -> str:
    payload = google_api_request(
        "GET",
        "/v2/keys:lookupKey",
        access_token,
        query={"keyString": key_string},
    )
    if not isinstance(payload, dict) or not payload.get("name"):
        raise RuntimeError("Google lookupKey did not return a resource name.")
    return str(payload["name"])


def google_get_api_key(access_token: str, name: str) -> dict[str, Any]:
    payload = google_api_request("GET", f"/v2/{name}", access_token)
    return payload if isinstance(payload, dict) else {}


def google_patch_android_restrictions(
    access_token: str,
    name: str,
    package_name: str,
    release_sha1: str,
    debug_sha1: str | None = None,
    api_targets: list[str] | None = None,
) -> dict[str, Any]:
    allowed_applications = [
        {
            "packageName": package_name,
            "sha1Fingerprint": release_sha1,
        }
    ]

    if debug_sha1:
        allowed_applications.append(
            {
                "packageName": package_name,
                "sha1Fingerprint": debug_sha1,
            }
        )

    restrictions: dict[str, Any] = {
        "androidKeyRestrictions": {
            "allowedApplications": allowed_applications,
        }
    }
    if api_targets:
        restrictions["apiTargets"] = [{"service": item} for item in api_targets]

    payload = {
        "name": name,
        "restrictions": restrictions,
    }
    result = google_api_request(
        "PATCH",
        f"/v2/{name}",
        access_token,
        payload=payload,
        query={"updateMask": "restrictions"},
    )
    return result if isinstance(result, dict) else {}


def generate_secret(length_bytes: int = 48) -> str:
    return secrets.token_urlsafe(length_bytes)


def collect_credential_status() -> dict[str, Any]:
    github_token, github_source = discover_github_token()
    render_key, render_source = discover_render_api_key()
    supabase_token, supabase_source = discover_supabase_token()
    vercel_token, vercel_source = discover_vercel_token()
    google_token, google_source = discover_google_access_token()

    return {
        "github": {"available": bool(github_token), "source": github_source},
        "render": {"available": bool(render_key), "source": render_source},
        "supabase": {"available": bool(supabase_token), "source": supabase_source},
        "vercel": {"available": bool(vercel_token), "source": vercel_source},
        "google": {"available": bool(google_token), "source": google_source},
    }


def inventory_github(targets: dict[str, Any]) -> dict[str, Any]:
    token, source = discover_github_token()
    if not token:
        return {"status": "blocked", "reason": "Missing GitHub credential."}

    owner = targets["github"]["owner"]
    repos: list[dict[str, Any]] = []
    for repo in targets["github"]["repos"]:
        repo_payload = github_get_repo(owner, repo["name"], token)
        repos.append(normalize_github_security(repo_payload))

    return {"status": "ok", "source": source, "repos": repos}


def inventory_render(targets: dict[str, Any]) -> dict[str, Any]:
    api_key, source = discover_render_api_key()
    if not api_key:
        return {"status": "blocked", "reason": "Missing RENDER_API_KEY."}

    try:
        services: dict[str, Any] = {}
        for service_name, service_target in targets["render"]["services"].items():
            env_items = render_list_env_vars(targets, service_target["id"], api_key)
            env_keys = sorted(key for key in (render_env_key(item) for item in env_items) if key)
            service_info = render_get_service(targets, service_target["id"], api_key)
            critical: dict[str, Any] = {}
            for env_key in service_target.get("criticalEnvKeys", []):
                value = render_get_env_var(targets, service_target["id"], env_key, api_key)
                if value:
                    critical[env_key] = {
                        "status": "configured",
                        "fingerprint": fingerprint_secret(value),
                    }
                elif env_key in env_keys:
                    critical[env_key] = {"status": "present_hidden"}
                else:
                    critical[env_key] = {"status": "missing"}

            service_info_root = service_info.get("service") if isinstance(service_info.get("service"), dict) else service_info
            service_details = service_info_root.get("serviceDetails") if isinstance(service_info_root, dict) else {}

            services[service_name] = {
                "id": service_target["id"],
                "name": service_target["name"],
                "envVarCount": len(env_keys),
                "criticalEnv": critical,
                "serviceUrl": service_details.get("url") if isinstance(service_details, dict) else None,
            }

        return {"status": "ok", "source": source, "services": services}
    except Exception as exc:
        return {"status": "error", "source": source, "reason": str(exc)}


def inventory_supabase(targets: dict[str, Any]) -> dict[str, Any]:
    token, source = discover_supabase_token()
    if not token:
        return {"status": "blocked", "reason": "Missing SUPABASE_ACCESS_TOKEN."}

    try:
        project = supabase_get_project(targets, token)
        keys = []
        for item in supabase_list_api_keys(targets, token):
            raw_value = item.get("api_key") or item.get("apiKey")
            keys.append(
                {
                    "name": item.get("name") or item.get("description") or "unknown",
                    "type": item.get("type") or item.get("role") or "unknown",
                    "fingerprint": fingerprint_secret(raw_value if isinstance(raw_value, str) else None),
                }
            )

        return {
            "status": "ok",
            "source": source,
            "projectRef": targets["supabase"]["projectRef"],
            "projectStatus": project.get("status"),
            "apiKeys": keys,
        }
    except Exception as exc:
        return {"status": "error", "source": source, "reason": str(exc)}


def inventory_vercel(targets: dict[str, Any]) -> dict[str, Any]:
    token, source = discover_vercel_token()
    if not token:
        return {"status": "blocked", "reason": "Missing VERCEL_TOKEN or ~/.vercel/auth.json."}

    try:
        envs = []
        for item in vercel_list_env(targets, token):
            envs.append(
                {
                    "key": item.get("key"),
                    "type": item.get("type"),
                    "target": item.get("target"),
                    "gitBranch": item.get("gitBranch"),
                }
            )

        return {
            "status": "ok",
            "source": source,
            "projectId": targets["vercel"]["projectId"],
            "envCount": len(envs),
            "envs": envs,
        }
    except Exception as exc:
        return {"status": "error", "source": source, "reason": str(exc)}


def inventory_firebase(targets: dict[str, Any]) -> dict[str, Any]:
    token, source = discover_google_access_token()
    if not token:
        return {"status": "blocked", "reason": "Missing GOOGLE_OAUTH_ACCESS_TOKEN or gcloud auth session."}

    try:
        google_services_path = Path(targets["firebase"]["googleServicesPath"])
        key_string = os.getenv("FIREBASE_WEB_API_KEY", "").strip() or read_google_services_api_key(google_services_path)
        key_name = google_lookup_api_key_name(token, key_string)
        key_info = google_get_api_key(token, key_name)
        restrictions = key_info.get("restrictions") or {}

        return {
            "status": "ok",
            "source": source,
            "keyName": key_name,
            "displayName": key_info.get("displayName"),
            "androidRestrictions": (restrictions.get("androidKeyRestrictions") or {}).get("allowedApplications", []),
            "apiTargets": [item.get("service") for item in restrictions.get("apiTargets", []) if isinstance(item, dict)],
        }
    except Exception as exc:
        return {"status": "error", "source": source, "reason": str(exc)}


def build_inventory(targets: dict[str, Any]) -> dict[str, Any]:
    return {
        "generatedAt": utc_now(),
        "credentials": collect_credential_status(),
        "github": inventory_github(targets),
        "render": inventory_render(targets),
        "supabase": inventory_supabase(targets),
        "vercel": inventory_vercel(targets),
        "firebase": inventory_firebase(targets),
    }


def execute_github_enable(targets: dict[str, Any]) -> dict[str, Any]:
    token, source = discover_github_token()
    if not token:
        return {"status": "blocked", "reason": "Missing GitHub credential."}

    owner = targets["github"]["owner"]
    repos: list[dict[str, Any]] = []
    for repo in targets["github"]["repos"]:
        current = github_get_repo(owner, repo["name"], token)
        try:
            github_enable_security(owner, repo["name"], token)
            verified = github_get_repo(owner, repo["name"], token)
            normalized = normalize_github_security(verified)
            normalized["mutationStatus"] = "enabled"
            repos.append(normalized)
        except ApiError as exc:
            normalized = normalize_github_security(current)
            normalized["mutationStatus"] = "unavailable"
            normalized["mutationError"] = exc.body[:240] if exc.body else str(exc)
            repos.append(normalized)

    return {"status": "ok", "source": source, "repos": repos}


def execute_render_rotate_jwt(targets: dict[str, Any], force_logout: bool, wait: bool, timeout_seconds: int) -> dict[str, Any]:
    api_key, source = discover_render_api_key()
    if not api_key:
        return {"status": "blocked", "reason": "Missing RENDER_API_KEY."}

    backend_target = targets["render"]["services"]["backend"]
    service_id = backend_target["id"]
    current_key = os.getenv("CURRENT_JWT_KEY", "").strip() or render_get_env_var(targets, service_id, "Jwt__Key", api_key)
    existing_previous = render_get_env_var(targets, service_id, "Jwt__PreviousKeys", api_key) or ""

    if not current_key and not force_logout:
        return {
            "status": "blocked",
            "reason": "Missing CURRENT_JWT_KEY and live Jwt__Key could not be read from Render. Pass CURRENT_JWT_KEY or rerun with --force-logout.",
        }

    new_key = os.getenv("NEW_JWT_KEY", "").strip() or generate_secret(48)

    previous_keys: list[str] = []
    if not force_logout and current_key:
        previous_keys.append(current_key)
    if existing_previous:
        for item in existing_previous.replace(";", ",").split(","):
            candidate = item.strip()
            if candidate and candidate not in previous_keys and candidate != new_key:
                previous_keys.append(candidate)

    render_upsert_env_var(targets, service_id, "Jwt__PreviousKeys", ",".join(previous_keys), api_key)
    render_upsert_env_var(targets, service_id, "Jwt__Key", new_key, api_key)
    deploy = render_trigger_deploy(targets, service_id, api_key)

    deploy_wait = "skipped"
    if wait:
        try:
            render_wait_for_latest_deploy(targets, service_id, api_key, timeout_seconds)
            deploy_wait = "completed"
        except TimeoutError:
            deploy_wait = "timed_out"

    return {
        "status": "ok",
        "source": source,
        "serviceId": service_id,
        "forceLogout": force_logout,
        "deployId": deploy.get("id"),
        "deployWait": deploy_wait,
        "newKey": {
            "masked": mask_secret(new_key),
            "fingerprint": fingerprint_secret(new_key),
        },
        "previousKeysCount": len(previous_keys),
    }


def execute_render_rotate_internal_token(targets: dict[str, Any], wait: bool, timeout_seconds: int) -> dict[str, Any]:
    api_key, source = discover_render_api_key()
    if not api_key:
        return {"status": "blocked", "reason": "Missing RENDER_API_KEY."}

    shared_token = os.getenv("NEW_AI_PROVIDER_INTERNAL_TOKEN", "").strip() or generate_secret(32)
    backend_id = targets["render"]["services"]["backend"]["id"]
    ai_provider_id = targets["render"]["services"]["aiProvider"]["id"]

    render_upsert_env_var(targets, backend_id, "AIProvider__InternalToken", shared_token, api_key)
    render_upsert_env_var(targets, ai_provider_id, "AI_PROVIDER_INTERNAL_TOKEN", shared_token, api_key)

    backend_deploy = render_trigger_deploy(targets, backend_id, api_key)
    ai_provider_deploy = render_trigger_deploy(targets, ai_provider_id, api_key)

    backend_wait = "skipped"
    ai_provider_wait = "skipped"
    if wait:
        try:
            render_wait_for_latest_deploy(targets, backend_id, api_key, timeout_seconds)
            backend_wait = "completed"
        except TimeoutError:
            backend_wait = "timed_out"

        try:
            render_wait_for_latest_deploy(targets, ai_provider_id, api_key, timeout_seconds)
            ai_provider_wait = "completed"
        except TimeoutError:
            ai_provider_wait = "timed_out"

    return {
        "status": "ok",
        "source": source,
        "backendServiceId": backend_id,
        "aiProviderServiceId": ai_provider_id,
        "backendDeployId": backend_deploy.get("id"),
        "aiProviderDeployId": ai_provider_deploy.get("id"),
        "backendDeployWait": backend_wait,
        "aiProviderDeployWait": ai_provider_wait,
        "sharedToken": {
            "masked": mask_secret(shared_token),
            "fingerprint": fingerprint_secret(shared_token),
        },
    }


def execute_supabase_rotate_db_password(targets: dict[str, Any], wait: bool, timeout_seconds: int) -> dict[str, Any]:
    supabase_token, supabase_source = discover_supabase_token()
    if not supabase_token:
        return {"status": "blocked", "reason": "Missing SUPABASE_ACCESS_TOKEN."}

    render_key, render_source = discover_render_api_key()
    if not render_key:
        return {"status": "blocked", "reason": "Missing RENDER_API_KEY."}

    backend_target = targets["render"]["services"]["backend"]
    service_id = backend_target["id"]
    current_connection = render_get_env_var(targets, service_id, "ConnectionStrings__DefaultConnection", render_key)
    if not current_connection:
        return {
            "status": "blocked",
            "reason": "Could not read ConnectionStrings__DefaultConnection from Render, so DB password rotation was not attempted.",
        }

    new_password = os.getenv("NEW_SUPABASE_DB_PASSWORD", "").strip() or generate_secret(32)
    updated_connection = update_connection_string_password(current_connection, new_password)

    supabase_rotate_db_password(targets, supabase_token, new_password)
    render_upsert_env_var(targets, service_id, "ConnectionStrings__DefaultConnection", updated_connection, render_key)
    deploy = render_trigger_deploy(targets, service_id, render_key)

    deploy_wait = "skipped"
    if wait:
        try:
            render_wait_for_latest_deploy(targets, service_id, render_key, timeout_seconds)
            deploy_wait = "completed"
        except TimeoutError:
            deploy_wait = "timed_out"

    return {
        "status": "ok",
        "supabaseSource": supabase_source,
        "renderSource": render_source,
        "projectRef": targets["supabase"]["projectRef"],
        "serviceId": service_id,
        "deployId": deploy.get("id"),
        "deployWait": deploy_wait,
        "newPassword": {
            "masked": mask_secret(new_password),
            "fingerprint": fingerprint_secret(new_password),
        },
    }


def execute_firebase_restriction(targets: dict[str, Any]) -> dict[str, Any]:
    access_token, source = discover_google_access_token()
    if not access_token:
        return {"status": "blocked", "reason": "Missing GOOGLE_OAUTH_ACCESS_TOKEN or gcloud auth session."}

    release_sha1 = os.getenv("FIREBASE_ANDROID_SHA1_RELEASE", "").strip()
    if not release_sha1:
        return {"status": "blocked", "reason": "Missing FIREBASE_ANDROID_SHA1_RELEASE."}

    debug_sha1 = os.getenv("FIREBASE_ANDROID_SHA1_DEBUG", "").strip() or None
    api_targets_raw = os.getenv("FIREBASE_API_TARGETS", "").strip()
    api_targets = [item.strip() for item in api_targets_raw.split(",") if item.strip()] or None

    key_string = os.getenv("FIREBASE_WEB_API_KEY", "").strip()
    if not key_string:
        key_string = read_google_services_api_key(Path(targets["firebase"]["googleServicesPath"]))

    key_name = google_lookup_api_key_name(access_token, key_string)
    updated = google_patch_android_restrictions(
        access_token,
        key_name,
        targets["firebase"]["androidPackageName"],
        release_sha1,
        debug_sha1,
        api_targets,
    )
    restrictions = updated.get("restrictions") or {}

    return {
        "status": "ok",
        "source": source,
        "keyName": key_name,
        "androidRestrictions": (restrictions.get("androidKeyRestrictions") or {}).get("allowedApplications", []),
        "apiTargets": [item.get("service") for item in restrictions.get("apiTargets", []) if isinstance(item, dict)],
    }


def execute_rotate(targets: dict[str, Any], args: argparse.Namespace) -> dict[str, Any]:
    run_github = args.all or args.github
    run_jwt = args.all or args.jwt
    run_internal_token = args.all or args.internal_token
    run_db = args.all or args.db
    run_firebase = args.all or args.firebase

    if not any((run_github, run_jwt, run_internal_token, run_db, run_firebase)):
        raise SystemExit("Chưa chọn lane nào. Dùng --all hoặc một trong --github/--jwt/--internal-token/--db/--firebase.")

    results: dict[str, Any] = {"generatedAt": utc_now()}
    if run_github:
        results["github"] = execute_github_enable(targets)
    if run_jwt:
        results["jwt"] = execute_render_rotate_jwt(targets, args.force_logout, args.wait, args.timeout_seconds)
    if run_internal_token:
        results["internalToken"] = execute_render_rotate_internal_token(targets, args.wait, args.timeout_seconds)
    if run_db:
        results["database"] = execute_supabase_rotate_db_password(targets, args.wait, args.timeout_seconds)
    if run_firebase:
        results["firebase"] = execute_firebase_restriction(targets)

    return results


def verify_inventory(report: dict[str, Any]) -> dict[str, Any]:
    checks: list[dict[str, Any]] = []

    github = report.get("github") or {}
    if github.get("status") == "ok":
        for repo in github.get("repos", []):
            secret_scanning_ok = repo.get("secretScanning") == "enabled"
            push_protection_ok = repo.get("pushProtection") == "enabled"
            checks.append(
                {
                    "name": f"github:{repo.get('name')}:secret_scanning",
                    "passed": secret_scanning_ok,
                    "detail": repo.get("secretScanning"),
                }
            )
            checks.append(
                {
                    "name": f"github:{repo.get('name')}:push_protection",
                    "passed": push_protection_ok,
                    "detail": repo.get("pushProtection"),
                }
            )
    else:
        checks.append(
            {
                "name": "github:credential",
                "passed": False,
                "detail": github.get("reason"),
            }
        )

    render = report.get("render") or {}
    if render.get("status") == "ok":
        backend = (render.get("services") or {}).get("backend") or {}
        jwt_key_status = ((backend.get("criticalEnv") or {}).get("Jwt__Key") or {}).get("status")
        checks.append(
            {
                "name": "render:backend:jwt_key_present",
                "passed": jwt_key_status in {"configured", "present_hidden"},
                "detail": jwt_key_status,
            }
        )
    else:
        checks.append(
            {
                "name": "render:credential",
                "passed": False,
                "detail": render.get("reason"),
            }
        )

    passed = all(item["passed"] for item in checks)
    return {"passed": passed, "checks": checks}


def history_rewrite_plan(targets: dict[str, Any]) -> dict[str, Any]:
    plan: list[dict[str, Any]] = []
    for repo in targets["historyRewrite"]["repos"]:
        repo_path = Path(repo["path"])
        remote_url = ""
        try:
            remote_url = run_command(["git", "-C", str(repo_path), "remote", "get-url", "origin"]).stdout.strip()
        except Exception:
            remote_url = ""

        path_entries: list[dict[str, Any]] = []
        for rel_path in repo.get("paths", []):
            tracked = False
            history_hits = 0
            try:
                tracked_output = run_command(["git", "-C", str(repo_path), "ls-files", "--", rel_path]).stdout.strip()
                tracked = bool(tracked_output)
            except Exception:
                tracked = False

            try:
                log_output = run_command(["git", "-C", str(repo_path), "log", "--all", "--format=%H", "--", rel_path]).stdout
                history_hits = len([line for line in log_output.splitlines() if line.strip()])
            except Exception:
                history_hits = 0

            path_entries.append(
                {
                    "path": rel_path,
                    "trackedInHead": tracked,
                    "historyCommitHits": history_hits,
                }
            )

        plan.append(
            {
                "name": repo["name"],
                "path": repo["path"],
                "remote": remote_url,
                "paths": path_entries,
                "pathGlobs": repo.get("pathGlobs", []),
            }
        )

    return {
        "generatedAt": utc_now(),
        "gitFilterRepoAvailable": resolve_git_filter_repo_command() is not None,
        "repos": plan,
    }


def resolve_git_filter_repo_command() -> list[str] | None:
    try:
        run_command(["git", "filter-repo", "--help"], timeout=10)
        return ["git", "filter-repo"]
    except Exception:
        pass

    if importlib.util.find_spec("git_filter_repo") is not None:
        return [sys.executable, "-m", "git_filter_repo"]

    return None


def history_rewrite_execute(targets: dict[str, Any], args: argparse.Namespace) -> dict[str, Any]:
    if not args.confirm_rewrite_history:
        raise SystemExit("History rewrite rất phá hủy. Dùng --confirm-rewrite-history để tiếp tục.")

    tool_command = resolve_git_filter_repo_command()
    if tool_command is None:
        raise SystemExit("Chưa có git-filter-repo. Cài trước khi chạy history rewrite.")

    repo_targets = {item["name"]: item for item in targets["historyRewrite"]["repos"]}
    repo = repo_targets.get(args.repo)
    if not repo:
        raise SystemExit(f"Repo '{args.repo}' không có trong targets.json.")

    mirror_dir = Path(args.mirror_dir).expanduser().resolve()
    if mirror_dir.exists():
        if not (mirror_dir / "config").exists():
            raise SystemExit(f"Mirror dir '{mirror_dir}' tồn tại nhưng không giống bare mirror repo.")
    else:
        run_command(["git", "clone", "--mirror", repo["path"], str(mirror_dir)], timeout=120)

    filter_args = [*tool_command, "--force", "--invert-paths"]
    for item in repo.get("paths", []):
        filter_args.extend(["--path", item])
    for item in repo.get("pathGlobs", []):
        filter_args.extend(["--path-glob", item])

    run_command(filter_args, cwd=mirror_dir, timeout=600)

    if args.push:
        run_command(["git", "-C", str(mirror_dir), "push", "--force", "--mirror", "origin"], timeout=600)

    return {
        "status": "ok",
        "repo": repo["name"],
        "mirrorDir": str(mirror_dir),
        "pushed": args.push,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Security rollout automation for EatFitAI.")
    parser.add_argument(
        "--targets",
        default=str(Path(__file__).with_name("targets.json")),
        help="Path to targets.json",
    )

    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("inventory", help="Collect live inventory across GitHub/Render/Vercel/Supabase/Firebase.")

    subparsers.add_parser("verify", help="Run inventory and evaluate key security checks.")

    subparsers.add_parser("github-enable-security", help="Enable GitHub secret scanning and push protection.")

    rotate_parser = subparsers.add_parser("rotate", help="Rotate one or more security lanes.")
    rotate_parser.add_argument("--all", action="store_true", help="Run all supported lanes.")
    rotate_parser.add_argument("--github", action="store_true", help="Enable GitHub security features.")
    rotate_parser.add_argument("--jwt", action="store_true", help="Rotate backend Jwt__Key on Render.")
    rotate_parser.add_argument("--internal-token", action="store_true", help="Rotate shared internal token between backend and AI provider on Render.")
    rotate_parser.add_argument("--db", action="store_true", help="Rotate Supabase DB password and sync Render.")
    rotate_parser.add_argument("--firebase", action="store_true", help="Apply Firebase Android key restrictions.")
    rotate_parser.add_argument("--force-logout", action="store_true", help="Allow JWT rotation without previous-key grace window.")
    rotate_parser.add_argument("--wait", action="store_true", help="Wait for Render deploys to finish.")
    rotate_parser.add_argument("--timeout-seconds", type=int, default=900, help="Wait timeout for Render deploys.")

    render_jwt_parser = subparsers.add_parser("render-rotate-jwt", help="Rotate backend Jwt__Key with optional grace window.")
    render_jwt_parser.add_argument("--force-logout", action="store_true", help="Skip Jwt__PreviousKeys grace window.")
    render_jwt_parser.add_argument("--wait", action="store_true", help="Wait for latest Render deploy.")
    render_jwt_parser.add_argument("--timeout-seconds", type=int, default=900)

    render_internal_parser = subparsers.add_parser("render-rotate-internal-token", help="Rotate shared internal token between backend and AI provider.")
    render_internal_parser.add_argument("--wait", action="store_true", help="Wait for latest Render deploy.")
    render_internal_parser.add_argument("--timeout-seconds", type=int, default=900)

    supabase_db_parser = subparsers.add_parser("supabase-rotate-db-password", help="Rotate Supabase DB password and sync Render.")
    supabase_db_parser.add_argument("--wait", action="store_true", help="Wait for latest Render deploy.")
    supabase_db_parser.add_argument("--timeout-seconds", type=int, default=900)

    subparsers.add_parser("vercel-inventory", help="List Vercel project environment variable inventory.")

    vercel_upsert_parser = subparsers.add_parser("vercel-upsert-env", help="Upsert one Vercel environment variable.")
    vercel_upsert_parser.add_argument("--key", required=True)
    vercel_upsert_parser.add_argument("--value", required=True)
    vercel_upsert_parser.add_argument(
        "--target",
        action="append",
        default=None,
        help="Vercel env target, e.g. production or preview. Repeat as needed.",
    )

    subparsers.add_parser("firebase-restrict-android-key", help="Restrict Firebase Android API key by package/SHA-1.")

    subparsers.add_parser("history-rewrite-plan", help="Build a git history rewrite plan.")

    history_execute_parser = subparsers.add_parser("history-rewrite-execute", help="Run git filter-repo on a mirror clone.")
    history_execute_parser.add_argument("--repo", required=True, help="Repo name from targets.json historyRewrite.repos[].name")
    history_execute_parser.add_argument("--mirror-dir", required=True, help="Bare mirror clone directory to rewrite.")
    history_execute_parser.add_argument("--push", action="store_true", help="Force-push mirror after rewrite.")
    history_execute_parser.add_argument("--confirm-rewrite-history", action="store_true", help="Acknowledge destructive history rewrite.")

    return parser.parse_args()


def main() -> int:
    args = parse_args()
    targets = load_targets(Path(args.targets))

    if args.command == "inventory":
        emit(build_inventory(targets))
        return 0

    if args.command == "verify":
        report = build_inventory(targets)
        verification = verify_inventory(report)
        emit({"inventory": report, "verification": verification})
        return 0 if verification["passed"] else 1

    if args.command == "github-enable-security":
        emit(execute_github_enable(targets))
        return 0

    if args.command == "rotate":
        result = execute_rotate(targets, args)
        emit(result)
        blocked_or_failed = any(
            lane.get("status") not in {"ok", "skipped"}
            for lane in result.values()
            if isinstance(lane, dict) and "status" in lane
        )
        return 1 if blocked_or_failed else 0

    if args.command == "render-rotate-jwt":
        result = execute_render_rotate_jwt(targets, args.force_logout, args.wait, args.timeout_seconds)
        emit(result)
        return 0 if result.get("status") == "ok" else 1

    if args.command == "render-rotate-internal-token":
        result = execute_render_rotate_internal_token(targets, args.wait, args.timeout_seconds)
        emit(result)
        return 0 if result.get("status") == "ok" else 1

    if args.command == "supabase-rotate-db-password":
        result = execute_supabase_rotate_db_password(targets, args.wait, args.timeout_seconds)
        emit(result)
        return 0 if result.get("status") == "ok" else 1

    if args.command == "vercel-inventory":
        emit(inventory_vercel(targets))
        return 0

    if args.command == "vercel-upsert-env":
        token, _ = discover_vercel_token()
        if not token:
            raise SystemExit("Missing VERCEL_TOKEN or ~/.vercel/auth.json.")
        emit(vercel_upsert_env(targets, token, args.key, args.value, args.target or ["production"]))
        return 0

    if args.command == "firebase-restrict-android-key":
        result = execute_firebase_restriction(targets)
        emit(result)
        return 0 if result.get("status") == "ok" else 1

    if args.command == "history-rewrite-plan":
        emit(history_rewrite_plan(targets))
        return 0

    if args.command == "history-rewrite-execute":
        emit(history_rewrite_execute(targets, args))
        return 0

    raise SystemExit(f"Unsupported command: {args.command}")


if __name__ == "__main__":
    sys.exit(main())
