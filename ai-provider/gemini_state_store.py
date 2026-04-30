from __future__ import annotations

import json
import logging
from pathlib import Path
import re
from typing import Any, Callable, Dict, Optional

logger = logging.getLogger(__name__)


class GeminiUsageStateStore:
    name = "none"

    def load(self) -> Optional[Dict[str, Any]]:
        return None

    def save(self, payload: Dict[str, Any]) -> None:
        return None

    def status(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "degraded": False,
            "error": "",
        }


class FileGeminiUsageStateStore(GeminiUsageStateStore):
    name = "file"

    def __init__(self, path: str) -> None:
        self.path = path
        self._last_error = ""

    def load(self) -> Optional[Dict[str, Any]]:
        state_path = self._resolve_path()
        if not state_path.exists():
            return None

        try:
            payload = json.loads(state_path.read_text(encoding="utf8"))
            self._last_error = ""
            return payload
        except Exception as exc:
            self._last_error = str(exc)
            logger.warning("Failed to load Gemini usage state file: %s", exc)
            return None

    def save(self, payload: Dict[str, Any]) -> None:
        try:
            state_path = self._resolve_path()
            state_path.parent.mkdir(parents=True, exist_ok=True)
            state_path.write_text(json.dumps(payload, indent=2), encoding="utf8")
            self._last_error = ""
        except Exception as exc:
            self._last_error = str(exc)
            logger.warning("Failed to save Gemini usage state file: %s", exc)

    def status(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "degraded": bool(self._last_error),
            "error": self._last_error,
            "path": str(self._resolve_path()),
        }

    def _resolve_path(self) -> Path:
        state_path = Path(self.path)
        return state_path if state_path.is_absolute() else Path.cwd() / state_path


class PostgresGeminiUsageStateStore(GeminiUsageStateStore):
    name = "postgres"

    def __init__(
        self,
        database_url: str,
        *,
        connect_factory: Optional[Callable[[str], Any]] = None,
    ) -> None:
        self.database_url = database_url
        self._connect_factory = connect_factory or self._default_connect
        self._last_error = "" if database_url else "GEMINI_USAGE_STATE_DATABASE_URL is not configured"

    def load(self) -> Optional[Dict[str, Any]]:
        if not self.database_url:
            return None

        try:
            with self._connect_factory(self._connect_dsn()) as connection:
                self._ensure_table(connection)
                with connection.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT "ProjectId", "ProjectAlias", "KeyAlias", "EntryJson", "LimitsJson", "GeneratedAt"
                        FROM "GeminiProviderState"
                        ORDER BY "ProjectAlias", "ProjectId"
                        """
                    )
                    rows = cursor.fetchall()
                connection.commit()

            entries = []
            limits: Dict[str, Any] = {}
            generated_at = None
            for row in rows:
                project_id, project_alias, key_alias, entry_json, limits_json, generated_at = row
                entry = self._loads(entry_json)
                if not isinstance(entry, dict):
                    continue
                entry.setdefault("projectId", project_id)
                entry.setdefault("projectAlias", project_alias)
                entry.setdefault("keyAlias", key_alias)
                entries.append(entry)
                if not limits:
                    parsed_limits = self._loads(limits_json)
                    limits = parsed_limits if isinstance(parsed_limits, dict) else {}

            self._last_error = ""
            return {
                "generatedAt": generated_at,
                "rateLimitScope": "project",
                "limits": limits,
                "entries": entries,
            }
        except Exception as exc:
            self._last_error = str(exc)
            logger.warning("Failed to load Gemini usage state from Postgres: %s", exc)
            return None

    def save(self, payload: Dict[str, Any]) -> None:
        if not self.database_url:
            return

        try:
            entries = payload.get("entries", [])
            limits_json = json.dumps(payload.get("limits", {}))
            generated_at = str(payload.get("generatedAt") or "")
            with self._connect_factory(self._connect_dsn()) as connection:
                self._ensure_table(connection)
                with connection.cursor() as cursor:
                    for entry in entries:
                        if not isinstance(entry, dict):
                            continue
                        project_id = str(entry.get("projectId", "")).strip()
                        if not project_id:
                            continue
                        project_alias = str(entry.get("projectAlias") or project_id)
                        key_alias = str(entry.get("keyAlias") or "")
                        cursor.execute(
                            """
                            INSERT INTO "GeminiProviderState"
                                ("ProjectId", "ProjectAlias", "KeyAlias", "EntryJson", "LimitsJson", "GeneratedAt", "UpdatedAt")
                            VALUES (%s, %s, %s, %s, %s, %s, NOW())
                            ON CONFLICT ("ProjectId") DO UPDATE SET
                                "ProjectAlias" = EXCLUDED."ProjectAlias",
                                "KeyAlias" = EXCLUDED."KeyAlias",
                                "EntryJson" = EXCLUDED."EntryJson",
                                "LimitsJson" = EXCLUDED."LimitsJson",
                                "GeneratedAt" = EXCLUDED."GeneratedAt",
                                "UpdatedAt" = NOW()
                            """,
                            (
                                project_id,
                                project_alias,
                                key_alias,
                                json.dumps(entry),
                                limits_json,
                                generated_at,
                            ),
                        )
                connection.commit()
            self._last_error = ""
        except Exception as exc:
            self._last_error = str(exc)
            logger.warning("Failed to save Gemini usage state to Postgres: %s", exc)

    def status(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "degraded": bool(self._last_error),
            "error": self._last_error,
        }

    def _connect_dsn(self) -> str:
        return _normalize_postgres_dsn(self.database_url)

    @staticmethod
    def _loads(value: Any) -> Any:
        if value is None:
            return None
        if isinstance(value, (dict, list)):
            return value
        return json.loads(str(value))

    @staticmethod
    def _default_connect(database_url: str) -> Any:
        try:
            import psycopg
        except ImportError as exc:
            raise RuntimeError("psycopg is required for GEMINI_USAGE_STATE_STORE=postgres") from exc

        return psycopg.connect(database_url, prepare_threshold=None)

    @staticmethod
    def _ensure_table(connection: Any) -> None:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS "GeminiProviderState" (
                    "ProjectId" text PRIMARY KEY,
                    "ProjectAlias" text NOT NULL,
                    "KeyAlias" text NULL,
                    "EntryJson" jsonb NOT NULL,
                    "LimitsJson" jsonb NOT NULL,
                    "GeneratedAt" text NULL,
                    "UpdatedAt" timestamptz NOT NULL DEFAULT NOW()
                )
                """
            )


def _normalize_postgres_dsn(value: str) -> str:
    raw = str(value or "").strip()
    if not raw or "://" in raw or "=" not in raw or ";" not in raw:
        return raw

    aliases = {
        "host": "host",
        "server": "host",
        "port": "port",
        "database": "dbname",
        "initial catalog": "dbname",
        "dbname": "dbname",
        "username": "user",
        "user id": "user",
        "userid": "user",
        "user": "user",
        "password": "password",
        "pwd": "password",
        "ssl mode": "sslmode",
        "sslmode": "sslmode",
    }
    ignored = {
        "trust server certificate",
        "include error detail",
        "pooling",
        "maximum pool size",
        "minimum pool size",
        "command timeout",
        "timeout",
        "search path",
        "application name",
    }
    ssl_modes = {
        "disable": "disable",
        "allow": "allow",
        "prefer": "prefer",
        "require": "require",
        "verify-ca": "verify-ca",
        "verify-full": "verify-full",
    }
    parts = []

    for segment in raw.split(";"):
        if not segment.strip() or "=" not in segment:
            continue
        key, part_value = segment.split("=", 1)
        normalized_key = " ".join(key.strip().lower().split())
        target_key = aliases.get(normalized_key)
        if not target_key:
            if normalized_key not in ignored:
                logger.debug("Ignoring unsupported Postgres connection option: %s", key)
            continue

        normalized_value = part_value.strip()
        if target_key == "sslmode":
            normalized_value = ssl_modes.get(normalized_value.lower(), normalized_value.lower())
        parts.append(f"{target_key}={_quote_dsn_value(normalized_value)}")

    return " ".join(parts) if parts else raw


def _quote_dsn_value(value: str) -> str:
    if value == "":
        return "''"
    if re.search(r"\s|'", value):
        return "'" + value.replace("\\", "\\\\").replace("'", "\\'") + "'"
    return value
