from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import json
import logging
import os
from threading import RLock
from typing import Any, Callable, Dict, Iterable, List, Optional
from urllib.parse import quote
from zoneinfo import ZoneInfo

import requests

logger = logging.getLogger(__name__)

DEFAULT_MODEL = "gemini-2.5-flash"
DEFAULT_TIMEOUT_SECONDS = 30
DEFAULT_SHORT_COOLDOWN_SECONDS = 90
try:
    PACIFIC_TZ = ZoneInfo("America/Los_Angeles")
except Exception:
    PACIFIC_TZ = None
GENERATE_URL_TEMPLATE = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


class GeminiPoolError(RuntimeError):
    def __init__(
        self,
        code: str,
        message: str,
        *,
        retry_after: Optional[str] = None,
        project_alias: Optional[str] = None,
        project_id: Optional[str] = None,
        model: Optional[str] = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.retry_after = retry_after
        self.project_alias = project_alias
        self.project_id = project_id
        self.model = model


class GeminiQuotaExhaustedError(GeminiPoolError):
    pass


class GeminiUnavailableError(GeminiPoolError):
    pass


@dataclass
class GeminiPoolEntry:
    project_alias: str
    project_id: str
    key_alias: str
    api_key: str
    model: str
    enabled: bool = True
    cooldown_until: Optional[datetime] = None
    exhausted_until: Optional[datetime] = None
    disabled_reason: Optional[str] = None

    def is_available(self, now: datetime) -> bool:
        if not self.enabled:
            return False
        if self.exhausted_until and now < self.exhausted_until:
            return False
        if self.cooldown_until and now < self.cooldown_until:
            return False
        return True

    def clear_expired(self, now: datetime) -> None:
        if self.cooldown_until and now >= self.cooldown_until:
            self.cooldown_until = None
        if self.exhausted_until and now >= self.exhausted_until:
            self.exhausted_until = None


class GeminiPoolManager:
    def __init__(
        self,
        entries: Iterable[GeminiPoolEntry],
        *,
        default_model: str = DEFAULT_MODEL,
        timeout_seconds: int = DEFAULT_TIMEOUT_SECONDS,
        short_cooldown_seconds: int = DEFAULT_SHORT_COOLDOWN_SECONDS,
        requester: Optional[Callable[..., requests.Response]] = None,
    ) -> None:
        self.default_model = default_model or DEFAULT_MODEL
        self.timeout_seconds = timeout_seconds
        self.short_cooldown_seconds = short_cooldown_seconds
        self._requester = requester or requests.post
        self._lock = RLock()
        self._duplicates_filtered = 0
        self._last_failover_reason: Optional[str] = None
        self._last_retry_after: Optional[str] = None
        self._entries = self._dedupe_entries(list(entries))
        self._active_project_id = self._entries[0].project_id if self._entries else None

    @classmethod
    def from_env(cls) -> "GeminiPoolManager":
        default_model = os.getenv("GEMINI_MODEL", DEFAULT_MODEL).strip() or DEFAULT_MODEL
        timeout_seconds = _safe_int(os.getenv("GEMINI_TIMEOUT_SECONDS"), DEFAULT_TIMEOUT_SECONDS)
        short_cooldown_seconds = _safe_int(
            os.getenv("GEMINI_SHORT_COOLDOWN_SECONDS"),
            DEFAULT_SHORT_COOLDOWN_SECONDS,
        )

        raw_pool = os.getenv("GEMINI_KEY_POOL_JSON", "").strip()
        entries: List[GeminiPoolEntry] = []

        if raw_pool:
            try:
                payload = json.loads(raw_pool)
                if not isinstance(payload, list):
                    raise ValueError("GEMINI_KEY_POOL_JSON must be a JSON array")
                for index, item in enumerate(payload):
                    if not isinstance(item, dict):
                        logger.warning("Skipping Gemini pool entry %s: expected object", index)
                        continue
                    api_key = str(item.get("apiKey", "")).strip()
                    project_id = str(item.get("projectId", "")).strip()
                    if not api_key or not project_id:
                        logger.warning(
                            "Skipping Gemini pool entry %s: apiKey/projectId missing",
                            index,
                        )
                        continue

                    entries.append(
                        GeminiPoolEntry(
                            project_alias=str(item.get("projectAlias", f"project-{index + 1}")).strip()
                            or f"project-{index + 1}",
                            project_id=project_id,
                            key_alias=str(item.get("keyAlias", f"slot-{index + 1}")).strip()
                            or f"slot-{index + 1}",
                            api_key=api_key,
                            model=str(item.get("model", default_model)).strip() or default_model,
                            enabled=bool(item.get("enabled", True)),
                        )
                    )
            except Exception as exc:
                logger.error("Failed to parse GEMINI_KEY_POOL_JSON: %s", exc)

        legacy_key = os.getenv("GEMINI_API_KEY", "").strip()
        if not entries and legacy_key:
            entries.append(
                GeminiPoolEntry(
                    project_alias="legacy-default",
                    project_id="legacy-default",
                    key_alias="legacy-primary",
                    api_key=legacy_key,
                    model=default_model,
                    enabled=True,
                )
            )

        manager = cls(
            entries,
            default_model=default_model,
            timeout_seconds=timeout_seconds,
            short_cooldown_seconds=short_cooldown_seconds,
        )
        status = manager.get_runtime_status()
        logger.info(
            "Gemini pool initialized: model=%s activeProject=%s poolSize=%s distinctProjects=%s duplicatesFiltered=%s",
            status["gemini_model"],
            status["gemini_active_project"],
            status["gemini_pool_size"],
            status["gemini_distinct_project_count"],
            status["gemini_duplicates_filtered"],
        )
        return manager

    def has_configured_entries(self) -> bool:
        with self._lock:
            return bool(self._entries)

    def has_available_entry(self) -> bool:
        with self._lock:
            now = _utcnow()
            self._refresh_locked(now)
            return any(entry.is_available(now) for entry in self._entries)

    def is_exhausted(self) -> bool:
        with self._lock:
            now = _utcnow()
            self._refresh_locked(now)
            return bool(self._entries) and all(
                (not entry.enabled)
                or (entry.exhausted_until is not None and now < entry.exhausted_until)
                or (entry.cooldown_until is not None and now < entry.cooldown_until)
                for entry in self._entries
            )

    def get_runtime_status(self) -> Dict[str, Any]:
        with self._lock:
            now = _utcnow()
            self._refresh_locked(now)
            active = self._get_active_entry_locked(now)
            return {
                "gemini_configured": bool(self._entries),
                "gemini_model": active.model if active else self.default_model,
                "gemini_active_project": active.project_alias if active else None,
                "gemini_pool_size": len(self._entries),
                "gemini_distinct_project_count": len({entry.project_id for entry in self._entries}),
                "gemini_duplicates_filtered": self._duplicates_filtered,
                "gemini_last_failover_reason": self._last_failover_reason,
                "gemini_retry_after": self._last_retry_after,
            }

    def ensure_service_available(self) -> None:
        status = self.get_runtime_status()
        if not status["gemini_configured"]:
            raise GeminiUnavailableError(
                "gemini_not_configured",
                "Gemini key pool chưa được cấu hình",
                model=status["gemini_model"],
            )

        if not self.has_available_entry():
            raise GeminiQuotaExhaustedError(
                "gemini_quota_exhausted",
                "Toàn bộ Gemini project đã chạm quota hoặc đang cooldown",
                retry_after=status["gemini_retry_after"],
                model=status["gemini_model"],
            )

    def generate_text(
        self,
        prompt: str,
        *,
        temperature: float = 0.1,
        max_output_tokens: int = 500,
    ) -> str:
        with self._lock:
            now = _utcnow()
            self._refresh_locked(now)
            candidates = self._candidate_entries_locked(now)
            if not self._entries:
                raise GeminiUnavailableError(
                    "gemini_not_configured",
                    "Gemini key pool chưa được cấu hình",
                    model=self.default_model,
                )
            if not candidates:
                raise GeminiQuotaExhaustedError(
                    "gemini_quota_exhausted",
                    "Toàn bộ Gemini project đã chạm quota hoặc đang cooldown",
                    retry_after=self._last_retry_after,
                    model=self.default_model,
                )

        previous_active_project = self._active_project_id
        last_failed_entry: Optional[GeminiPoolEntry] = None
        last_failed_kind: Optional[str] = None
        last_retry_after: Optional[str] = None
        saw_quota_issue = False

        for entry in candidates:
            try:
                text = self._generate_with_entry(
                    entry,
                    prompt,
                    temperature=temperature,
                    max_output_tokens=max_output_tokens,
                )
                with self._lock:
                    self._active_project_id = entry.project_id
                    if last_failed_entry and previous_active_project != entry.project_id:
                        self._last_failover_reason = (
                            f"{last_failed_kind}:{last_failed_entry.project_alias}->{entry.project_alias}"
                        )
                    self._last_retry_after = None
                return text
            except GeminiPoolError as exc:
                with self._lock:
                    self._apply_error_state_locked(entry, exc)
                last_failed_entry = entry
                last_failed_kind = exc.code
                last_retry_after = exc.retry_after or last_retry_after
                if exc.code == "gemini_quota_exhausted":
                    saw_quota_issue = True
                if exc.code == "gemini_request_invalid":
                    raise

        with self._lock:
            self._last_retry_after = last_retry_after
        if saw_quota_issue:
            raise GeminiQuotaExhaustedError(
                "gemini_quota_exhausted",
                "Toàn bộ Gemini project đã chạm quota hoặc đang cooldown",
                retry_after=last_retry_after,
                model=self.default_model,
            )
        raise GeminiUnavailableError(
            "gemini_unavailable",
            "Gemini hiện không khả dụng trên tất cả project trong pool",
            retry_after=last_retry_after,
            model=self.default_model,
        )

    def _generate_with_entry(
        self,
        entry: GeminiPoolEntry,
        prompt: str,
        *,
        temperature: float,
        max_output_tokens: int,
    ) -> str:
        attempts = 2
        last_exc: Optional[GeminiPoolError] = None
        for attempt in range(attempts):
            try:
                return self._perform_request(
                    entry,
                    prompt,
                    temperature=temperature,
                    max_output_tokens=max_output_tokens,
                )
            except GeminiPoolError as exc:
                last_exc = exc
                if exc.code == "gemini_transient_error" and attempt < attempts - 1:
                    continue
                raise
        assert last_exc is not None
        raise last_exc

    def _perform_request(
        self,
        entry: GeminiPoolEntry,
        prompt: str,
        *,
        temperature: float,
        max_output_tokens: int,
    ) -> str:
        url = GENERATE_URL_TEMPLATE.format(model=quote(entry.model, safe="-_."))
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_output_tokens,
            },
        }

        try:
            response = self._requester(
                url,
                params={"key": entry.api_key},
                json=payload,
                timeout=self.timeout_seconds,
            )
        except requests.Timeout as exc:
            raise GeminiPoolError(
                "gemini_transient_error",
                "Gemini request timed out",
                project_alias=entry.project_alias,
                project_id=entry.project_id,
                model=entry.model,
            ) from exc
        except requests.RequestException as exc:
            raise GeminiPoolError(
                "gemini_transient_error",
                "Gemini request failed",
                project_alias=entry.project_alias,
                project_id=entry.project_id,
                model=entry.model,
            ) from exc

        if response.status_code >= 400:
            self._raise_for_error_response(entry, response)

        data = response.json()
        text = _extract_text(data)
        if not text:
            raise GeminiPoolError(
                "gemini_request_invalid",
                "Gemini returned empty response",
                project_alias=entry.project_alias,
                project_id=entry.project_id,
                model=entry.model,
            )
        return text

    def _raise_for_error_response(self, entry: GeminiPoolEntry, response: requests.Response) -> None:
        message = ""
        retry_after = response.headers.get("Retry-After")
        try:
            payload = response.json()
            message = (
                payload.get("error", {}).get("message")
                or payload.get("message")
                or response.text
            )
        except ValueError:
            message = response.text

        message = (message or "").strip()
        status_code = response.status_code
        code = "gemini_unavailable"

        if status_code in (401, 403):
            code = "gemini_auth_error"
        elif status_code == 429:
            lower = message.lower()
            if any(token in lower for token in ("daily", "per day", "rpd", "quota")):
                retry_after = retry_after or _next_pacific_midnight_iso()
            code = "gemini_quota_exhausted"
        elif status_code >= 500:
            code = "gemini_transient_error"
        elif status_code == 400:
            code = "gemini_request_invalid"

        raise GeminiPoolError(
            code,
            message or f"Gemini request failed with status {status_code}",
            retry_after=retry_after,
            project_alias=entry.project_alias,
            project_id=entry.project_id,
            model=entry.model,
        )

    def _dedupe_entries(self, entries: List[GeminiPoolEntry]) -> List[GeminiPoolEntry]:
        deduped: List[GeminiPoolEntry] = []
        seen_projects: set[str] = set()
        duplicates = 0
        for entry in entries:
            if not entry.enabled or not entry.api_key:
                continue
            if entry.project_id in seen_projects:
                duplicates += 1
                logger.warning(
                    "Ignoring Gemini key %s because project %s is already active in pool",
                    entry.key_alias,
                    entry.project_id,
                )
                continue
            seen_projects.add(entry.project_id)
            deduped.append(entry)
        self._duplicates_filtered = duplicates
        return deduped

    def _refresh_locked(self, now: datetime) -> None:
        for entry in self._entries:
            entry.clear_expired(now)

    def _candidate_entries_locked(self, now: datetime) -> List[GeminiPoolEntry]:
        entries = self._entries[:]
        if self._active_project_id:
            entries.sort(key=lambda item: item.project_id != self._active_project_id)
        return [entry for entry in entries if entry.is_available(now)]

    def _get_active_entry_locked(self, now: datetime) -> Optional[GeminiPoolEntry]:
        active = next(
            (entry for entry in self._entries if entry.project_id == self._active_project_id),
            None,
        )
        if active and active.is_available(now):
            return active
        for entry in self._entries:
            if entry.is_available(now):
                return entry
        return active

    def _apply_error_state_locked(self, entry: GeminiPoolEntry, error: GeminiPoolError) -> None:
        now = _utcnow()
        if error.code == "gemini_auth_error":
            entry.enabled = False
            entry.disabled_reason = error.code
        elif error.code == "gemini_quota_exhausted":
            retry_at = _parse_retry_after(error.retry_after)
            if retry_at:
                entry.exhausted_until = retry_at
            else:
                entry.cooldown_until = now + timedelta(seconds=self.short_cooldown_seconds)
        elif error.code == "gemini_transient_error":
            entry.cooldown_until = now + timedelta(seconds=self.short_cooldown_seconds)


def _safe_int(raw: Optional[str], default: int) -> int:
    try:
        return int(raw or default)
    except (TypeError, ValueError):
        return default


def _utcnow() -> datetime:
    return datetime.utcnow()


def _next_pacific_midnight_iso() -> str:
    now_utc = _utcnow().replace(tzinfo=timezone.utc)
    if PACIFIC_TZ is not None:
        now_pacific = now_utc.astimezone(PACIFIC_TZ)
        next_midnight = (now_pacific + timedelta(days=1)).replace(
            hour=0,
            minute=0,
            second=0,
            microsecond=0,
        )
        return next_midnight.astimezone(timezone.utc).isoformat()

    current_offset_hours = _pacific_offset_hours_for_utc(now_utc)
    now_pacific = (now_utc + timedelta(hours=current_offset_hours)).replace(tzinfo=None)
    next_midnight_local = (now_pacific + timedelta(days=1)).replace(
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )
    next_offset_hours = _pacific_offset_hours_for_local(next_midnight_local)
    next_midnight_utc = (
        next_midnight_local - timedelta(hours=next_offset_hours)
    ).replace(tzinfo=timezone.utc)
    return next_midnight_utc.isoformat()


def _pacific_offset_hours_for_utc(now_utc: datetime) -> int:
    year = now_utc.year
    dst_start_utc = _nth_weekday_of_month(year, 3, 6, 2).replace(
        hour=10,
        minute=0,
        second=0,
        microsecond=0,
        tzinfo=timezone.utc,
    )
    dst_end_utc = _nth_weekday_of_month(year, 11, 6, 1).replace(
        hour=9,
        minute=0,
        second=0,
        microsecond=0,
        tzinfo=timezone.utc,
    )
    return -7 if dst_start_utc <= now_utc < dst_end_utc else -8


def _pacific_offset_hours_for_local(local_dt: datetime) -> int:
    year = local_dt.year
    dst_start_local = _nth_weekday_of_month(year, 3, 6, 2).replace(
        hour=2,
        minute=0,
        second=0,
        microsecond=0,
    )
    dst_end_local = _nth_weekday_of_month(year, 11, 6, 1).replace(
        hour=2,
        minute=0,
        second=0,
        microsecond=0,
    )
    return -7 if dst_start_local <= local_dt < dst_end_local else -8


def _nth_weekday_of_month(year: int, month: int, weekday: int, occurrence: int) -> datetime:
    first_day = datetime(year, month, 1)
    delta_days = (weekday - first_day.weekday()) % 7
    first_match = first_day + timedelta(days=delta_days)
    return first_match + timedelta(weeks=occurrence - 1)


def _parse_retry_after(retry_after: Optional[str]) -> Optional[datetime]:
    if not retry_after:
        return None
    try:
        if retry_after.isdigit():
            return _utcnow() + timedelta(seconds=int(retry_after))
        return datetime.fromisoformat(retry_after.replace("Z", "+00:00")).replace(tzinfo=None)
    except (TypeError, ValueError):
        return None


def _extract_text(payload: Dict[str, Any]) -> Optional[str]:
    candidates = payload.get("candidates") or []
    for candidate in candidates:
        content = candidate.get("content") or {}
        parts = content.get("parts") or []
        text_parts = [part.get("text", "") for part in parts if part.get("text")]
        if text_parts:
            return "".join(text_parts)
    return None
