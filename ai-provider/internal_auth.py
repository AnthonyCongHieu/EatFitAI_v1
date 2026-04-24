from __future__ import annotations

import hmac
import os
from collections.abc import Mapping


INTERNAL_TOKEN_HEADER = "X-Internal-Token"


def _env_value(env: Mapping[str, str] | None, name: str) -> str:
    source = env if env is not None else os.environ
    return (source.get(name) or "").strip()


def env_flag(name: str, default: bool = False, env: Mapping[str, str] | None = None) -> bool:
    raw = _env_value(env, name)
    if not raw:
        return default

    return raw.lower() in {"1", "true", "yes", "on"}


def get_internal_runtime_token(env: Mapping[str, str] | None = None) -> str:
    return _env_value(env, "AI_PROVIDER_INTERNAL_TOKEN")


def allows_insecure_dev_internal_requests(env: Mapping[str, str] | None = None) -> bool:
    return env_flag("ALLOW_INSECURE_AI_PROVIDER_DEV", default=False, env=env) and not is_production_environment(env)


def is_production_environment(env: Mapping[str, str] | None = None) -> bool:
    for name in ("FLASK_ENV", "APP_ENV", "PYTHON_ENV", "ENVIRONMENT"):
        value = _env_value(env, name).lower()
        if value in {"prod", "production"}:
            return True

    return bool(_env_value(env, "RENDER") or _env_value(env, "RENDER_SERVICE_ID"))


def is_internal_request_authorized(
    provided_token: str | None,
    env: Mapping[str, str] | None = None,
) -> bool:
    expected = get_internal_runtime_token(env)
    if not expected:
        return allows_insecure_dev_internal_requests(env)

    provided = (provided_token or "").strip()
    return bool(provided) and hmac.compare_digest(provided, expected)


def internal_auth_missing(env: Mapping[str, str] | None = None) -> bool:
    return not get_internal_runtime_token(env) and not allows_insecure_dev_internal_requests(env)
