from __future__ import annotations

import os
from typing import Mapping

TRUTHY = {"1", "true", "yes", "y", "on"}
FALSY = {"0", "false", "no", "n", "off"}


def _value(env: Mapping[str, str] | None, key: str) -> str:
    source = env if env is not None else os.environ
    return str(source.get(key, "")).strip()


def _is_truthy(value: str) -> bool:
    return value.strip().lower() in TRUTHY


def _is_falsy(value: str) -> bool:
    return value.strip().lower() in FALSY


def is_cloud_runtime(env: Mapping[str, str] | None = None) -> bool:
    if _is_truthy(_value(env, "RENDER")):
        return True

    for key in ("APP_ENV", "FLASK_ENV", "ENVIRONMENT"):
        if _value(env, key).lower() == "production":
            return True

    return False


def allow_generic_yolo_fallback(env: Mapping[str, str] | None = None) -> bool:
    raw = _value(env, "ALLOW_GENERIC_YOLO_FALLBACK")
    if raw:
        return _is_truthy(raw) and not _is_falsy(raw)

    return not is_cloud_runtime(env)


def missing_supabase_model_keys(env: Mapping[str, str] | None = None) -> list[str]:
    if not _is_truthy(_value(env, "ALLOW_SUPABASE_MODEL_DOWNLOAD")):
        return []

    required = ["SUPABASE_URL", "SUPABASE_SERVICE_KEY"]
    return [key for key in required if not _value(env, key)]


def pending_model_readiness_error(
    *,
    best_model_exists: bool,
    model_loaded: bool,
    model_load_error: str | None,
    env: Mapping[str, str] | None = None,
) -> str | None:
    if model_load_error:
        return model_load_error

    if model_loaded or best_model_exists or allow_generic_yolo_fallback(env):
        return None

    missing = missing_supabase_model_keys(env)
    if missing:
        return f"best.pt is required in production; Supabase model download is enabled but missing {', '.join(missing)}"

    return "best.pt or best.onnx is required in production and must be packaged with the service"
