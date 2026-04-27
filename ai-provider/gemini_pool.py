from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
import json
import logging
import os
from pathlib import Path
from threading import RLock
from typing import Any, Callable, Dict, Iterable, List, Optional
from urllib.parse import quote
from uuid import uuid4
from zoneinfo import ZoneInfo

import requests

logger = logging.getLogger(__name__)

DEFAULT_MODEL = "gemini-2.5-flash"
DEFAULT_TIMEOUT_SECONDS = 30
DEFAULT_SHORT_COOLDOWN_SECONDS = 90
DEFAULT_RPM_LIMIT = 5
DEFAULT_TPM_LIMIT = 250_000
DEFAULT_RPD_LIMIT = 20
DEFAULT_USAGE_STATE_PATH = os.path.join("uploads", "gemini-usage-state.json")
DEFAULT_PROBE_MIN_INTERVAL_SECONDS = 600
DEFAULT_PROBE_MAX_PER_PROJECT_PER_DAY = 3
DEFAULT_PROBE_PROMPT = "ping"
ROLLING_WINDOW_SECONDS = 60

try:
    PACIFIC_TZ = ZoneInfo("America/Los_Angeles")
except Exception:
    PACIFIC_TZ = None

GENERATE_URL_TEMPLATE = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
PROJECT_RATE_LIMIT_SCOPE = "project"
PROBE_MAX_OUTPUT_TOKENS = 1

STATE_AVAILABLE = "available"
STATE_MANUAL_OVERRIDE_ACTIVE = "manual_override_active"
STATE_MANUAL_OVERRIDE_EXPIRED_PENDING_PROBE = "manual_override_expired_pending_probe"
STATE_PROVIDER_RPD_EXHAUSTED = "provider_rpd_exhausted"
STATE_PROVIDER_RPM_EXHAUSTED = "provider_rpm_exhausted"
STATE_PROVIDER_TPM_EXHAUSTED = "provider_tpm_exhausted"
STATE_AUTH_INVALID = "auth_invalid"
STATE_TRANSIENT_BACKOFF = "transient_backoff"
STATE_UNKNOWN_UNOBSERVED = "unknown_unobserved"

QUOTA_SOURCE_MANUAL_OVERRIDE = "manual_override"
QUOTA_SOURCE_PROBE_CONFIRMED = "probe_confirmed"
QUOTA_SOURCE_BACKEND_OBSERVED = "backend_observed"
QUOTA_SOURCE_BACKEND_NOT_OBSERVED = "backend_not_observed"

PROBE_RESULT_SUCCESS = "success"


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
        status_code: Optional[int] = None,
        quota_id: Optional[str] = None,
        quota_metric: Optional[str] = None,
        quota_kind: Optional[str] = None,
        provider_expected_reset_at: Optional[str] = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.retry_after = retry_after
        self.project_alias = project_alias
        self.project_id = project_id
        self.model = model
        self.status_code = status_code
        self.quota_id = quota_id
        self.quota_metric = quota_metric
        self.quota_kind = quota_kind
        self.provider_expected_reset_at = provider_expected_reset_at


class GeminiQuotaExhaustedError(GeminiPoolError):
    pass


class GeminiUnavailableError(GeminiPoolError):
    pass


@dataclass
class GeminiAvailability:
    available: bool
    reason: Optional[str] = None
    state: str = STATE_UNKNOWN_UNOBSERVED
    quota_source: str = QUOTA_SOURCE_BACKEND_NOT_OBSERVED
    available_after: Optional[datetime] = None
    rpm_used: int = 0
    tpm_used: int = 0
    rpd_used: int = 0
    rpm_recovery_at: Optional[datetime] = None
    tpm_recovery_at: Optional[datetime] = None
    rpd_recovery_at: Optional[datetime] = None


@dataclass
class GeminiUsageEvent:
    request_id: str
    timestamp: datetime
    tokens: int

    def to_dict(self) -> Dict[str, Any]:
        return {
            "requestId": self.request_id,
            "timestamp": self.timestamp.isoformat(),
            "tokens": self.tokens,
        }

    @classmethod
    def from_dict(cls, payload: Dict[str, Any]) -> Optional["GeminiUsageEvent"]:
        try:
            request_id = str(payload.get("requestId", "")).strip()
            timestamp = _parse_retry_after(payload.get("timestamp"))
            tokens = int(payload.get("tokens", 0) or 0)
        except (TypeError, ValueError):
            return None

        if not request_id or timestamp is None:
            return None
        return cls(request_id=request_id, timestamp=timestamp, tokens=max(0, tokens))


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
    rolling_events: List[GeminiUsageEvent] = field(default_factory=list)
    day_window_key: Optional[str] = None
    day_request_count: int = 0
    total_request_count: int = 0
    total_token_count: int = 0
    last_used_at: Optional[datetime] = None
    last_recovered_at: Optional[datetime] = None
    last_recovered_reason: Optional[str] = None
    state: str = STATE_UNKNOWN_UNOBSERVED
    state_updated_at: Optional[datetime] = None
    last_provider_status_code: Optional[int] = None
    last_provider_quota_id: Optional[str] = None
    last_provider_quota_metric: Optional[str] = None
    last_probe_at: Optional[datetime] = None
    last_probe_result: Optional[str] = None
    next_probe_at: Optional[datetime] = None
    provider_expected_reset_at: Optional[datetime] = None
    probe_day_key: Optional[str] = None
    probe_count: int = 0

    def is_available(self, now: datetime) -> bool:
        if not self.enabled:
            return False
        if self.exhausted_until and now < self.exhausted_until:
            return False
        if self.cooldown_until and now < self.cooldown_until:
            return False
        return True

    def clear_expired(self, now: datetime) -> None:
        recovered_reason: Optional[str] = None
        previous_reason = self.disabled_reason
        previous_state = self.state or STATE_UNKNOWN_UNOBSERVED

        if self.cooldown_until and now >= self.cooldown_until:
            self.cooldown_until = None
            if previous_state in {
                STATE_PROVIDER_RPM_EXHAUSTED,
                STATE_PROVIDER_TPM_EXHAUSTED,
                STATE_TRANSIENT_BACKOFF,
            } or previous_reason in {
                "rpm_limit_reached",
                "tpm_limit_reached",
                "gemini_quota_exhausted",
                "gemini_transient_error",
                STATE_PROVIDER_RPM_EXHAUSTED,
                STATE_PROVIDER_TPM_EXHAUSTED,
            }:
                recovered_reason = previous_reason or "cooldown_expired"
                self.disabled_reason = None
                self.state = self._available_state()
                self.state_updated_at = now

        if self.exhausted_until and now >= self.exhausted_until:
            expired_until = self.exhausted_until
            self.exhausted_until = None
            if previous_state == STATE_MANUAL_OVERRIDE_ACTIVE or previous_reason == "pre_exhausted_from_env":
                self.state = STATE_MANUAL_OVERRIDE_EXPIRED_PENDING_PROBE
                self.disabled_reason = STATE_MANUAL_OVERRIDE_EXPIRED_PENDING_PROBE
                self.next_probe_at = self.next_probe_at or now
                self.provider_expected_reset_at = expired_until
                self.state_updated_at = now
            elif previous_state == STATE_PROVIDER_RPD_EXHAUSTED or previous_reason in {
                "rpd_limit_reached",
                STATE_PROVIDER_RPD_EXHAUSTED,
            }:
                self.state = STATE_PROVIDER_RPD_EXHAUSTED
                self.disabled_reason = previous_reason or STATE_PROVIDER_RPD_EXHAUSTED
                self.next_probe_at = self.next_probe_at or now
                self.provider_expected_reset_at = self.provider_expected_reset_at or expired_until
                self.state_updated_at = now

        if recovered_reason:
            self.last_recovered_at = now
            self.last_recovered_reason = recovered_reason

    def refresh_usage_windows(self, now: datetime) -> None:
        self._prune_rolling_events(now)
        day_key = _current_pacific_day_key(now)
        if self.day_window_key != day_key:
            self.day_window_key = day_key
            self.day_request_count = 0
        if self.probe_day_key != day_key:
            self.probe_day_key = day_key
            self.probe_count = 0

    def reserve_usage(self, now: datetime, estimated_tokens: int) -> str:
        self.refresh_usage_windows(now)
        request_id = uuid4().hex
        event = GeminiUsageEvent(
            request_id=request_id,
            timestamp=now,
            tokens=max(0, int(estimated_tokens)),
        )
        self.rolling_events.append(event)
        self.day_request_count += 1
        self.total_request_count += 1
        self.total_token_count += event.tokens
        self.last_used_at = now
        return request_id

    def reconcile_usage(
        self,
        now: datetime,
        request_id: str,
        estimated_tokens: int,
        actual_tokens: Optional[int],
    ) -> None:
        self.refresh_usage_windows(now)
        if actual_tokens is not None:
            actual_tokens = max(0, int(actual_tokens))
            estimated_tokens = max(0, int(estimated_tokens))
            for event in reversed(self.rolling_events):
                if event.request_id != request_id:
                    continue
                delta = actual_tokens - event.tokens
                event.tokens = actual_tokens
                self.total_token_count = max(0, self.total_token_count + delta)
                break
            else:
                delta = actual_tokens - estimated_tokens
                if delta != 0:
                    self.total_token_count = max(0, self.total_token_count + delta)

        self.cooldown_until = None
        self.exhausted_until = None
        self.disabled_reason = None
        self.state = STATE_AVAILABLE
        self.state_updated_at = now
        self.last_provider_status_code = 200
        self.last_provider_quota_id = None
        self.last_provider_quota_metric = None
        self.provider_expected_reset_at = None
        self.next_probe_at = None

    def evaluate_availability(
        self,
        now: datetime,
        *,
        rpm_limit: int,
        tpm_limit: int,
        rpd_limit: int,
        estimated_tokens: int = 0,
    ) -> GeminiAvailability:
        self.clear_expired(now)
        self.refresh_usage_windows(now)

        rolling_requests = len(self.rolling_events)
        rolling_tokens = sum(event.tokens for event in self.rolling_events)
        rpm_recovery_at = self._next_rpm_recovery_at(rpm_limit)
        tpm_recovery_at = self._next_tpm_recovery_at(tpm_limit, estimated_tokens)
        rpd_recovery_at = _parse_retry_after(_next_pacific_midnight_iso()) if rpd_limit > 0 else None
        current_state = self._current_state(now)
        quota_source = self._quota_source(current_state)
        unavailable_reason = self._availability_reason(current_state)

        if current_state == STATE_AUTH_INVALID:
            return GeminiAvailability(
                available=False,
                reason=unavailable_reason,
                state=current_state,
                quota_source=quota_source,
                rpm_used=rolling_requests,
                tpm_used=rolling_tokens,
                rpd_used=self.day_request_count,
                rpm_recovery_at=rpm_recovery_at,
                tpm_recovery_at=tpm_recovery_at,
                rpd_recovery_at=rpd_recovery_at,
            )

        if current_state == STATE_MANUAL_OVERRIDE_ACTIVE:
            return GeminiAvailability(
                available=False,
                reason=unavailable_reason,
                state=current_state,
                quota_source=quota_source,
                available_after=self.exhausted_until,
                rpm_used=rolling_requests,
                tpm_used=rolling_tokens,
                rpd_used=self.day_request_count,
                rpm_recovery_at=rpm_recovery_at,
                tpm_recovery_at=tpm_recovery_at,
                rpd_recovery_at=self.provider_expected_reset_at or self.exhausted_until,
            )

        if current_state == STATE_MANUAL_OVERRIDE_EXPIRED_PENDING_PROBE:
            return GeminiAvailability(
                available=False,
                reason=unavailable_reason,
                state=current_state,
                quota_source=quota_source,
                available_after=self.next_probe_at or now,
                rpm_used=rolling_requests,
                tpm_used=rolling_tokens,
                rpd_used=self.day_request_count,
                rpm_recovery_at=rpm_recovery_at,
                tpm_recovery_at=tpm_recovery_at,
                rpd_recovery_at=self.provider_expected_reset_at or rpd_recovery_at,
            )
        if current_state == STATE_PROVIDER_RPD_EXHAUSTED:
            return GeminiAvailability(
                available=False,
                reason=unavailable_reason,
                state=current_state,
                quota_source=quota_source,
                available_after=self.next_probe_at or self.provider_expected_reset_at or rpd_recovery_at,
                rpm_used=rolling_requests,
                tpm_used=rolling_tokens,
                rpd_used=self.day_request_count,
                rpm_recovery_at=rpm_recovery_at,
                tpm_recovery_at=tpm_recovery_at,
                rpd_recovery_at=self.provider_expected_reset_at or rpd_recovery_at,
            )
        if current_state in {STATE_PROVIDER_RPM_EXHAUSTED, STATE_PROVIDER_TPM_EXHAUSTED, STATE_TRANSIENT_BACKOFF}:
            return GeminiAvailability(
                available=False,
                reason=unavailable_reason,
                state=current_state,
                quota_source=quota_source,
                available_after=self.cooldown_until or self.next_probe_at,
                rpm_used=rolling_requests,
                tpm_used=rolling_tokens,
                rpd_used=self.day_request_count,
                rpm_recovery_at=rpm_recovery_at,
                tpm_recovery_at=tpm_recovery_at,
                rpd_recovery_at=self.provider_expected_reset_at or rpd_recovery_at,
            )

        if rpd_limit > 0 and self.day_request_count >= rpd_limit:
            self.exhausted_until = rpd_recovery_at
            self.disabled_reason = "rpd_limit_reached"
            self.state = STATE_PROVIDER_RPD_EXHAUSTED
            self.provider_expected_reset_at = rpd_recovery_at
            self.next_probe_at = rpd_recovery_at
            self.state_updated_at = now
            return GeminiAvailability(
                available=False,
                reason="rpd_limit_reached",
                state=STATE_PROVIDER_RPD_EXHAUSTED,
                quota_source="backend_observed",
                available_after=rpd_recovery_at,
                rpm_used=rolling_requests,
                tpm_used=rolling_tokens,
                rpd_used=self.day_request_count,
                rpm_recovery_at=rpm_recovery_at,
                tpm_recovery_at=tpm_recovery_at,
                rpd_recovery_at=rpd_recovery_at,
            )

        if rpm_limit > 0 and rolling_requests >= rpm_limit:
            self.cooldown_until = rpm_recovery_at
            self.disabled_reason = "rpm_limit_reached"
            self.state = STATE_PROVIDER_RPM_EXHAUSTED
            self.provider_expected_reset_at = None
            self.next_probe_at = None
            self.state_updated_at = now
            return GeminiAvailability(
                available=False,
                reason="rpm_limit_reached",
                state=STATE_PROVIDER_RPM_EXHAUSTED,
                quota_source="backend_observed",
                available_after=rpm_recovery_at,
                rpm_used=rolling_requests,
                tpm_used=rolling_tokens,
                rpd_used=self.day_request_count,
                rpm_recovery_at=rpm_recovery_at,
                tpm_recovery_at=tpm_recovery_at,
                rpd_recovery_at=rpd_recovery_at,
            )

        if tpm_limit > 0 and estimated_tokens > tpm_limit:
            return GeminiAvailability(
                available=False,
                reason="request_tpm_exceeds_project_limit",
                state=current_state,
                quota_source=quota_source,
                rpm_used=rolling_requests,
                tpm_used=rolling_tokens,
                rpd_used=self.day_request_count,
                rpm_recovery_at=rpm_recovery_at,
                tpm_recovery_at=tpm_recovery_at,
                rpd_recovery_at=rpd_recovery_at,
            )

        if tpm_limit > 0 and rolling_tokens + max(0, estimated_tokens) > tpm_limit:
            self.cooldown_until = tpm_recovery_at
            self.disabled_reason = "tpm_limit_reached"
            self.state = STATE_PROVIDER_TPM_EXHAUSTED
            self.provider_expected_reset_at = None
            self.next_probe_at = None
            self.state_updated_at = now
            return GeminiAvailability(
                available=False,
                reason="tpm_limit_reached",
                state=STATE_PROVIDER_TPM_EXHAUSTED,
                quota_source="backend_observed",
                available_after=tpm_recovery_at,
                rpm_used=rolling_requests,
                tpm_used=rolling_tokens,
                rpd_used=self.day_request_count,
                rpm_recovery_at=rpm_recovery_at,
                tpm_recovery_at=tpm_recovery_at,
                rpd_recovery_at=rpd_recovery_at,
            )

        self.state = self._available_state()
        self.state_updated_at = self.state_updated_at or now

        return GeminiAvailability(
            available=True,
            reason=None,
            state=self.state,
            quota_source=quota_source,
            rpm_used=rolling_requests,
            tpm_used=rolling_tokens,
            rpd_used=self.day_request_count,
            rpm_recovery_at=rpm_recovery_at,
            tpm_recovery_at=tpm_recovery_at,
            rpd_recovery_at=rpd_recovery_at,
        )

    def usage_snapshot(self, now: datetime, rpm_limit: int, tpm_limit: int, rpd_limit: int) -> Dict[str, Any]:
        availability = self.evaluate_availability(
            now,
            rpm_limit=rpm_limit,
            tpm_limit=tpm_limit,
            rpd_limit=rpd_limit,
            estimated_tokens=1,
        )
        available_after = availability.available_after
        return {
            "projectAlias": self.project_alias,
            "projectId": self.project_id,
            "keyAlias": self.key_alias,
            "model": self.model,
            "rateLimitScope": PROJECT_RATE_LIMIT_SCOPE,
            "rollingWindowSeconds": ROLLING_WINDOW_SECONDS,
            "state": availability.state,
            "available": availability.available,
            "availabilityReason": availability.reason or "available",
            "quotaSource": availability.quota_source,
            "availableAfter": available_after.isoformat() if available_after else None,
            "rpmUsed": availability.rpm_used,
            "rpmRemaining": max(0, rpm_limit - availability.rpm_used) if rpm_limit > 0 else None,
            "rpmRecoveryAt": availability.rpm_recovery_at.isoformat() if availability.rpm_recovery_at else None,
            "tpmUsed": availability.tpm_used,
            "tpmRemaining": max(0, tpm_limit - availability.tpm_used) if tpm_limit > 0 else None,
            "tpmRecoveryAt": availability.tpm_recovery_at.isoformat() if availability.tpm_recovery_at else None,
            "rpdUsed": availability.rpd_used,
            "rpdRemaining": max(0, rpd_limit - availability.rpd_used) if rpd_limit > 0 else None,
            "rpdRecoveryAt": availability.rpd_recovery_at.isoformat() if availability.rpd_recovery_at else None,
            "rollingEventsCount": len(self.rolling_events),
            "totalRequests": self.total_request_count,
            "totalTokens": self.total_token_count,
            "lastUsedAt": self.last_used_at.isoformat() if self.last_used_at else None,
            "lastRecoveredAt": self.last_recovered_at.isoformat() if self.last_recovered_at else None,
            "lastRecoveredReason": self.last_recovered_reason,
            "cooldownUntil": self.cooldown_until.isoformat() if self.cooldown_until else None,
            "exhaustedUntil": self.exhausted_until.isoformat() if self.exhausted_until else None,
            "disabledReason": self.disabled_reason,
            "lastProviderStatusCode": self.last_provider_status_code,
            "lastProviderQuotaId": self.last_provider_quota_id,
            "lastProviderQuotaMetric": self.last_provider_quota_metric,
            "lastProbeAt": self.last_probe_at.isoformat() if self.last_probe_at else None,
            "lastProbeResult": self.last_probe_result,
            "nextProbeAt": self.next_probe_at.isoformat() if self.next_probe_at else None,
            "providerExpectedResetAt": self.provider_expected_reset_at.isoformat()
            if self.provider_expected_reset_at
            else None,
        }

    def _has_runtime_observations(self) -> bool:
        if (
            self.day_request_count > 0
            or self.total_request_count > 0
            or self.total_token_count > 0
            or self.last_used_at is not None
            or self.last_recovered_at is not None
            or self.last_provider_status_code is not None
            or self.last_probe_at is not None
            or bool(self.rolling_events)
        ):
            return True
        return False

    def _available_state(self) -> str:
        return STATE_AVAILABLE if self._has_runtime_observations() else STATE_UNKNOWN_UNOBSERVED

    def _current_state(self, now: datetime) -> str:
        if not self.enabled or self.state == STATE_AUTH_INVALID or self.disabled_reason == "gemini_auth_error":
            return STATE_AUTH_INVALID
        if self.state == STATE_MANUAL_OVERRIDE_EXPIRED_PENDING_PROBE:
            return STATE_MANUAL_OVERRIDE_EXPIRED_PENDING_PROBE
        if (self.state == STATE_MANUAL_OVERRIDE_ACTIVE or self.disabled_reason == "pre_exhausted_from_env") and (
            self.exhausted_until or self.next_probe_at
        ):
            if self.exhausted_until and now < self.exhausted_until:
                return STATE_MANUAL_OVERRIDE_ACTIVE
            return STATE_MANUAL_OVERRIDE_EXPIRED_PENDING_PROBE
        if self.state == STATE_PROVIDER_RPD_EXHAUSTED or self.disabled_reason in {
            "rpd_limit_reached",
            STATE_PROVIDER_RPD_EXHAUSTED,
        }:
            if self.exhausted_until or self.provider_expected_reset_at or self.next_probe_at:
                return STATE_PROVIDER_RPD_EXHAUSTED
        if (self.state == STATE_PROVIDER_RPM_EXHAUSTED or self.disabled_reason in {
            "rpm_limit_reached",
            STATE_PROVIDER_RPM_EXHAUSTED,
        }) and self.cooldown_until and now < self.cooldown_until:
            return STATE_PROVIDER_RPM_EXHAUSTED
        if (self.state == STATE_PROVIDER_TPM_EXHAUSTED or self.disabled_reason in {
            "tpm_limit_reached",
            STATE_PROVIDER_TPM_EXHAUSTED,
        }) and self.cooldown_until and now < self.cooldown_until:
            return STATE_PROVIDER_TPM_EXHAUSTED
        if (self.state == STATE_TRANSIENT_BACKOFF or self.disabled_reason in {
            "gemini_transient_error",
            "gemini_quota_exhausted",
        }) and self.cooldown_until and now < self.cooldown_until:
            return STATE_TRANSIENT_BACKOFF
        if self.state == STATE_AVAILABLE:
            return STATE_AVAILABLE
        return self._available_state()

    def _availability_reason(self, state: str) -> Optional[str]:
        if state == STATE_MANUAL_OVERRIDE_ACTIVE:
            return "pre_exhausted_from_env"
        if state == STATE_UNKNOWN_UNOBSERVED:
            return None
        if state == STATE_AVAILABLE:
            return None
        return self.disabled_reason or state

    def _quota_source(self, state: str) -> str:
        if state in {STATE_MANUAL_OVERRIDE_ACTIVE, STATE_MANUAL_OVERRIDE_EXPIRED_PENDING_PROBE}:
            return QUOTA_SOURCE_MANUAL_OVERRIDE
        if self.last_probe_result == PROBE_RESULT_SUCCESS and state == STATE_AVAILABLE:
            return QUOTA_SOURCE_PROBE_CONFIRMED
        if state in {
            STATE_PROVIDER_RPD_EXHAUSTED,
            STATE_PROVIDER_RPM_EXHAUSTED,
            STATE_PROVIDER_TPM_EXHAUSTED,
            STATE_AUTH_INVALID,
            STATE_TRANSIENT_BACKOFF,
        }:
            return QUOTA_SOURCE_BACKEND_OBSERVED
        if self._has_runtime_observations():
            return QUOTA_SOURCE_BACKEND_OBSERVED
        return QUOTA_SOURCE_BACKEND_NOT_OBSERVED

    def _prune_rolling_events(self, now: datetime) -> None:
        cutoff = now - timedelta(seconds=ROLLING_WINDOW_SECONDS)
        self.rolling_events = [event for event in self.rolling_events if event.timestamp > cutoff]

    def _next_rpm_recovery_at(self, rpm_limit: int) -> Optional[datetime]:
        if rpm_limit <= 0 or len(self.rolling_events) < rpm_limit:
            return None
        return self.rolling_events[0].timestamp + timedelta(seconds=ROLLING_WINDOW_SECONDS)

    def _next_tpm_recovery_at(self, tpm_limit: int, estimated_tokens: int) -> Optional[datetime]:
        if tpm_limit <= 0:
            return None

        estimated_tokens = max(0, int(estimated_tokens))
        current_total = sum(event.tokens for event in self.rolling_events)
        if current_total + estimated_tokens <= tpm_limit:
            return None
        if estimated_tokens > tpm_limit:
            return None

        running_total = current_total
        for event in self.rolling_events:
            running_total -= event.tokens
            if running_total + estimated_tokens <= tpm_limit:
                return event.timestamp + timedelta(seconds=ROLLING_WINDOW_SECONDS)
        return None


class GeminiPoolManager:
    def __init__(
        self,
        entries: Iterable[GeminiPoolEntry],
        *,
        default_model: str = DEFAULT_MODEL,
        timeout_seconds: int = DEFAULT_TIMEOUT_SECONDS,
        short_cooldown_seconds: int = DEFAULT_SHORT_COOLDOWN_SECONDS,
        rpm_limit: int = DEFAULT_RPM_LIMIT,
        tpm_limit: int = DEFAULT_TPM_LIMIT,
        rpd_limit: int = DEFAULT_RPD_LIMIT,
        usage_state_path: Optional[str] = None,
        probe_min_interval_seconds: int = DEFAULT_PROBE_MIN_INTERVAL_SECONDS,
        probe_max_per_project_per_day: int = DEFAULT_PROBE_MAX_PER_PROJECT_PER_DAY,
        probe_prompt: str = DEFAULT_PROBE_PROMPT,
        requester: Optional[Callable[..., requests.Response]] = None,
    ) -> None:
        self.default_model = default_model or DEFAULT_MODEL
        self.timeout_seconds = timeout_seconds
        self.short_cooldown_seconds = short_cooldown_seconds
        self.rpm_limit = rpm_limit
        self.tpm_limit = tpm_limit
        self.rpd_limit = rpd_limit
        self.usage_state_path = usage_state_path
        self.probe_min_interval_seconds = max(1, probe_min_interval_seconds)
        self.probe_max_per_project_per_day = max(1, probe_max_per_project_per_day)
        self.probe_prompt = probe_prompt or DEFAULT_PROBE_PROMPT
        self._requester = requester or requests.post
        self._lock = RLock()
        self._duplicates_filtered = 0
        self._last_failover_reason: Optional[str] = None
        self._last_retry_after: Optional[str] = None
        self._entries = self._dedupe_entries(list(entries))
        self._active_project_id = self._entries[0].project_id if self._entries else None
        self._load_usage_state_locked()

    @classmethod
    def from_env(cls) -> "GeminiPoolManager":
        default_model = os.getenv("GEMINI_MODEL", DEFAULT_MODEL).strip() or DEFAULT_MODEL
        timeout_seconds = _safe_int(os.getenv("GEMINI_TIMEOUT_SECONDS"), DEFAULT_TIMEOUT_SECONDS)
        short_cooldown_seconds = _safe_int(
            os.getenv("GEMINI_SHORT_COOLDOWN_SECONDS"),
            DEFAULT_SHORT_COOLDOWN_SECONDS,
        )
        rpm_limit = _safe_int(os.getenv("GEMINI_RPM_LIMIT"), DEFAULT_RPM_LIMIT)
        tpm_limit = _safe_int(os.getenv("GEMINI_TPM_LIMIT"), DEFAULT_TPM_LIMIT)
        rpd_limit = _safe_int(os.getenv("GEMINI_RPD_LIMIT"), DEFAULT_RPD_LIMIT)
        usage_state_path = os.getenv("GEMINI_USAGE_STATE_PATH", "").strip() or DEFAULT_USAGE_STATE_PATH
        probe_min_interval_seconds = _safe_int(
            os.getenv("GEMINI_PROBE_MIN_INTERVAL_SECONDS"),
            DEFAULT_PROBE_MIN_INTERVAL_SECONDS,
        )
        probe_max_per_project_per_day = _safe_int(
            os.getenv("GEMINI_PROBE_MAX_PER_PROJECT_PER_DAY"),
            DEFAULT_PROBE_MAX_PER_PROJECT_PER_DAY,
        )
        probe_prompt = os.getenv("GEMINI_PROBE_PROMPT", DEFAULT_PROBE_PROMPT).strip() or DEFAULT_PROBE_PROMPT

        entries: List[GeminiPoolEntry] = []
        entries.extend(
            _load_pool_entries_from_json(
                os.getenv("GEMINI_KEY_POOL_JSON", "").strip(),
                env_name="GEMINI_KEY_POOL_JSON",
                default_model=default_model,
            )
        )
        entries.extend(
            _load_pool_entries_from_json(
                os.getenv("GEMINI_EXTRA_KEY_POOL_JSON", "").strip(),
                env_name="GEMINI_EXTRA_KEY_POOL_JSON",
                default_model=default_model,
            )
        )

        legacy_key = os.getenv("GEMINI_API_KEY", "").strip()
        legacy_project_id = os.getenv("GEMINI_API_KEY_PROJECT_ID", "").strip() or "legacy-default"
        legacy_project_alias = os.getenv("GEMINI_API_KEY_PROJECT_ALIAS", "").strip() or legacy_project_id
        legacy_key_alias = os.getenv("GEMINI_API_KEY_ALIAS", "").strip() or "legacy-primary"
        if legacy_key:
            entries.append(
                GeminiPoolEntry(
                    project_alias=legacy_project_alias,
                    project_id=legacy_project_id,
                    key_alias=legacy_key_alias,
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
            rpm_limit=rpm_limit,
            tpm_limit=tpm_limit,
            rpd_limit=rpd_limit,
            usage_state_path=usage_state_path,
            probe_min_interval_seconds=probe_min_interval_seconds,
            probe_max_per_project_per_day=probe_max_per_project_per_day,
            probe_prompt=probe_prompt,
        )
        manager._apply_pre_exhausted_projects_from_env()
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
            candidates = self._candidate_entries_locked(now, estimated_tokens=1)
            self._refresh_retry_after_locked(now, estimated_tokens=1)
            return bool(candidates)

    def is_exhausted(self) -> bool:
        with self._lock:
            now = _utcnow()
            self._refresh_locked(now)
            candidates = self._candidate_entries_locked(now, estimated_tokens=1)
            self._refresh_retry_after_locked(now, estimated_tokens=1)
            return bool(self._entries) and not candidates

    def get_runtime_status(self) -> Dict[str, Any]:
        with self._lock:
            now = _utcnow()
            self._refresh_locked(now)
            self._refresh_retry_after_locked(now, estimated_tokens=1)
            active = self._get_active_entry_locked(now, estimated_tokens=1)
            usage_entries = [
                entry.usage_snapshot(now, self.rpm_limit, self.tpm_limit, self.rpd_limit)
                for entry in self._entries
            ]
            states = [item["state"] for item in usage_entries]
            return {
                "gemini_configured": bool(self._entries),
                "gemini_model": active.model if active else self.default_model,
                "gemini_active_project": active.project_alias if active else None,
                "gemini_pool_size": len(self._entries),
                "gemini_distinct_project_count": len({entry.project_id for entry in self._entries}),
                "gemini_duplicates_filtered": self._duplicates_filtered,
                "gemini_last_failover_reason": self._last_failover_reason,
                "gemini_retry_after": self._last_retry_after,
                "gemini_rate_limit_scope": PROJECT_RATE_LIMIT_SCOPE,
                "gemini_quota_truth_source": "backend_runtime_state_plus_manual_overrides",
                "gemini_manual_override_project_count": sum(
                    1 for item in usage_entries if item["quotaSource"] == "manual_override"
                ),
                "gemini_probe_pending_project_count": sum(
                    1 for item in usage_entries if item["nextProbeAt"]
                ),
                "gemini_provider_exhausted_project_count": sum(
                    1
                    for state in states
                    if state in {
                        STATE_PROVIDER_RPD_EXHAUSTED,
                        STATE_PROVIDER_RPM_EXHAUSTED,
                        STATE_PROVIDER_TPM_EXHAUSTED,
                    }
                ),
                "gemini_auth_invalid_project_count": sum(1 for state in states if state == STATE_AUTH_INVALID),
                "gemini_rolling_window_seconds": ROLLING_WINDOW_SECONDS,
                "gemini_limits": {
                    "rpm": self.rpm_limit,
                    "tpm": self.tpm_limit,
                    "rpd": self.rpd_limit,
                },
                "gemini_available_project_count": sum(1 for item in usage_entries if item["available"]),
                "gemini_usage_entries": usage_entries,
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
        probe_targets: List[GeminiPoolEntry] = []
        with self._lock:
            now = _utcnow()
            self._refresh_locked(now)
            estimated_tokens = _estimate_total_tokens(prompt, max_output_tokens)
            if self.tpm_limit > 0 and estimated_tokens > self.tpm_limit:
                raise GeminiPoolError(
                    "gemini_request_invalid",
                    "Estimated request size exceeds configured TPM limit",
                    model=self.default_model,
                )
            candidates = self._candidate_entries_locked(now, estimated_tokens)
            self._refresh_retry_after_locked(now, estimated_tokens)
            if not self._entries:
                raise GeminiUnavailableError(
                    "gemini_not_configured",
                    "Gemini key pool chưa được cấu hình",
                    model=self.default_model,
                )
            if not candidates:
                probe_targets = self._probe_targets_locked(now)
                if not probe_targets:
                    raise GeminiQuotaExhaustedError(
                        "gemini_quota_exhausted",
                        "Toàn bộ Gemini project đã chạm quota hoặc đang cooldown",
                        retry_after=self._last_retry_after,
                        model=self.default_model,
                    )

        if probe_targets:
            self._run_probe_pass(probe_targets)
            with self._lock:
                now = _utcnow()
                self._refresh_locked(now)
                candidates = self._candidate_entries_locked(now, estimated_tokens)
                self._refresh_retry_after_locked(now, estimated_tokens)
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
            with self._lock:
                request_id = entry.reserve_usage(_utcnow(), estimated_tokens)
                self._save_usage_state_locked()
            try:
                text = self._generate_with_entry(
                    entry,
                    prompt,
                    temperature=temperature,
                    max_output_tokens=max_output_tokens,
                    estimated_tokens=estimated_tokens,
                    request_id=request_id,
                )
                with self._lock:
                    self._active_project_id = entry.project_id
                    if last_failed_entry and previous_active_project != entry.project_id:
                        self._last_failover_reason = (
                            f"{last_failed_kind}:{last_failed_entry.project_alias}->{entry.project_alias}"
                        )
                    self._last_retry_after = None
                    self._save_usage_state_locked()
                return text
            except GeminiPoolError as exc:
                with self._lock:
                    self._apply_error_state_locked(entry, exc)
                    self._refresh_retry_after_locked(_utcnow(), estimated_tokens)
                    self._save_usage_state_locked()
                last_failed_entry = entry
                last_failed_kind = exc.code
                last_retry_after = exc.retry_after or last_retry_after
                if exc.code == "gemini_quota_exhausted":
                    saw_quota_issue = True
                if exc.code == "gemini_request_invalid":
                    raise

        with self._lock:
            self._last_retry_after = last_retry_after or self._last_retry_after
        if saw_quota_issue:
            raise GeminiQuotaExhaustedError(
                "gemini_quota_exhausted",
                "Toàn bộ Gemini project đã chạm quota hoặc đang cooldown",
                retry_after=self._last_retry_after,
                model=self.default_model,
            )
        raise GeminiUnavailableError(
            "gemini_unavailable",
            "Gemini hiện không khả dụng trên tất cả project trong pool",
            retry_after=self._last_retry_after,
            model=self.default_model,
        )

    def generate_parts(
        self,
        parts: List[Dict[str, Any]],
        *,
        estimated_prompt_tokens: int = 1200,
        temperature: float = 0.1,
        max_output_tokens: int = 500,
    ) -> str:
        if not parts:
            raise GeminiPoolError(
                "gemini_request_invalid",
                "Gemini parts request cannot be empty",
                model=self.default_model,
            )

        probe_targets: List[GeminiPoolEntry] = []
        with self._lock:
            now = _utcnow()
            self._refresh_locked(now)
            estimated_tokens = max(1, int(estimated_prompt_tokens)) + max(0, int(max_output_tokens))
            if self.tpm_limit > 0 and estimated_tokens > self.tpm_limit:
                raise GeminiPoolError(
                    "gemini_request_invalid",
                    "Estimated request size exceeds configured TPM limit",
                    model=self.default_model,
                )
            candidates = self._candidate_entries_locked(now, estimated_tokens)
            self._refresh_retry_after_locked(now, estimated_tokens)
            if not self._entries:
                raise GeminiUnavailableError(
                    "gemini_not_configured",
                    "Gemini key pool is not configured",
                    model=self.default_model,
                )
            if not candidates:
                probe_targets = self._probe_targets_locked(now)
                if not probe_targets:
                    raise GeminiQuotaExhaustedError(
                        "gemini_quota_exhausted",
                        "All Gemini projects are quota-exhausted or cooling down",
                        retry_after=self._last_retry_after,
                        model=self.default_model,
                    )

        if probe_targets:
            self._run_probe_pass(probe_targets)
            with self._lock:
                now = _utcnow()
                self._refresh_locked(now)
                candidates = self._candidate_entries_locked(now, estimated_tokens)
                self._refresh_retry_after_locked(now, estimated_tokens)
                if not candidates:
                    raise GeminiQuotaExhaustedError(
                        "gemini_quota_exhausted",
                        "All Gemini projects are quota-exhausted or cooling down",
                        retry_after=self._last_retry_after,
                        model=self.default_model,
                    )

        previous_active_project = self._active_project_id
        last_failed_entry: Optional[GeminiPoolEntry] = None
        last_failed_kind: Optional[str] = None
        last_retry_after: Optional[str] = None
        saw_quota_issue = False

        for entry in candidates:
            with self._lock:
                request_id = entry.reserve_usage(_utcnow(), estimated_tokens)
                self._save_usage_state_locked()
            try:
                text = self._generate_parts_with_entry(
                    entry,
                    parts,
                    temperature=temperature,
                    max_output_tokens=max_output_tokens,
                    estimated_tokens=estimated_tokens,
                    request_id=request_id,
                )
                with self._lock:
                    self._active_project_id = entry.project_id
                    if last_failed_entry and previous_active_project != entry.project_id:
                        self._last_failover_reason = (
                            f"{last_failed_kind}:{last_failed_entry.project_alias}->{entry.project_alias}"
                        )
                    self._last_retry_after = None
                    self._save_usage_state_locked()
                return text
            except GeminiPoolError as exc:
                with self._lock:
                    self._apply_error_state_locked(entry, exc)
                    self._refresh_retry_after_locked(_utcnow(), estimated_tokens)
                    self._save_usage_state_locked()
                last_failed_entry = entry
                last_failed_kind = exc.code
                last_retry_after = exc.retry_after or last_retry_after
                if exc.code == "gemini_quota_exhausted":
                    saw_quota_issue = True
                if exc.code == "gemini_request_invalid":
                    raise

        with self._lock:
            self._last_retry_after = last_retry_after or self._last_retry_after
        if saw_quota_issue:
            raise GeminiQuotaExhaustedError(
                "gemini_quota_exhausted",
                "All Gemini projects are quota-exhausted or cooling down",
                retry_after=self._last_retry_after,
                model=self.default_model,
            )
        raise GeminiUnavailableError(
            "gemini_unavailable",
            "Gemini is unavailable on every configured project",
            retry_after=self._last_retry_after,
            model=self.default_model,
        )

    def _generate_with_entry(
        self,
        entry: GeminiPoolEntry,
        prompt: str,
        *,
        temperature: float,
        max_output_tokens: int,
        estimated_tokens: int,
        request_id: str,
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
                    estimated_tokens=estimated_tokens,
                    request_id=request_id,
                )
            except GeminiPoolError as exc:
                last_exc = exc
                if exc.code == "gemini_transient_error" and attempt < attempts - 1:
                    continue
                raise
        assert last_exc is not None
        raise last_exc

    def _generate_parts_with_entry(
        self,
        entry: GeminiPoolEntry,
        parts: List[Dict[str, Any]],
        *,
        temperature: float,
        max_output_tokens: int,
        estimated_tokens: int,
        request_id: str,
    ) -> str:
        attempts = 2
        last_exc: Optional[GeminiPoolError] = None
        for attempt in range(attempts):
            try:
                return self._perform_parts_request(
                    entry,
                    parts,
                    temperature=temperature,
                    max_output_tokens=max_output_tokens,
                    estimated_tokens=estimated_tokens,
                    request_id=request_id,
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
        estimated_tokens: int,
        request_id: str,
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
        actual_tokens = _extract_total_tokens(data)
        with self._lock:
            entry.reconcile_usage(_utcnow(), request_id, estimated_tokens, actual_tokens)
            self._save_usage_state_locked()
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

    def _perform_parts_request(
        self,
        entry: GeminiPoolEntry,
        parts: List[Dict[str, Any]],
        *,
        temperature: float,
        max_output_tokens: int,
        estimated_tokens: int,
        request_id: str,
    ) -> str:
        url = GENERATE_URL_TEMPLATE.format(model=quote(entry.model, safe="-_."))
        payload = {
            "contents": [{"parts": parts}],
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
        actual_tokens = _extract_total_tokens(data)
        with self._lock:
            entry.reconcile_usage(_utcnow(), request_id, estimated_tokens, actual_tokens)
            self._save_usage_state_locked()
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
        payload: Dict[str, Any] = {}
        message = ""
        retry_after = response.headers.get("Retry-After")
        try:
            payload = response.json()
            message = payload.get("error", {}).get("message") or payload.get("message") or response.text
        except ValueError:
            message = response.text

        retry_after = retry_after or _extract_retry_after_from_google_error(payload)
        message = (message or "").strip()
        status_code = response.status_code
        code = "gemini_unavailable"
        quota_id: Optional[str] = None
        quota_metric: Optional[str] = None
        quota_kind: Optional[str] = None
        provider_expected_reset_at: Optional[str] = None

        if status_code in (401, 403):
            code = "gemini_auth_error"
        elif status_code == 429:
            quota_id, quota_metric, quota_kind = _pick_primary_quota_signal(
                _extract_google_quota_violations(payload),
                message,
            )
            if quota_kind == "rpd":
                provider_expected_reset_at = _next_pacific_midnight_iso()
            elif quota_kind in {"rpm", "tpm"}:
                retry_after = retry_after or (_utcnow() + timedelta(seconds=ROLLING_WINDOW_SECONDS)).isoformat()
            else:
                lower = message.lower()
                if any(token in lower for token in ("daily", "per day", "rpd", "quota")):
                    quota_kind = quota_kind or "rpd"
                    provider_expected_reset_at = _next_pacific_midnight_iso()
                elif any(
                    token in lower for token in ("per minute", "rpm", "tpm", "rate limit", "resource exhausted")
                ):
                    quota_kind = quota_kind or "rpm"
                    retry_after = retry_after or (_utcnow() + timedelta(seconds=ROLLING_WINDOW_SECONDS)).isoformat()
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
            status_code=status_code,
            quota_id=quota_id,
            quota_metric=quota_metric,
            quota_kind=quota_kind,
            provider_expected_reset_at=provider_expected_reset_at,
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
            entry.refresh_usage_windows(now)

    def _candidate_entries_locked(self, now: datetime, estimated_tokens: int) -> List[GeminiPoolEntry]:
        entries = self._entries[:]
        if self._active_project_id:
            entries.sort(key=lambda item: item.project_id != self._active_project_id)
        candidates: List[GeminiPoolEntry] = []
        for entry in entries:
            if self._entry_within_budget_locked(entry, now, estimated_tokens):
                candidates.append(entry)
        return candidates

    def _get_active_entry_locked(self, now: datetime, estimated_tokens: int) -> Optional[GeminiPoolEntry]:
        active = next((entry for entry in self._entries if entry.project_id == self._active_project_id), None)
        if active and self._entry_within_budget_locked(active, now, estimated_tokens=estimated_tokens):
            return active
        for entry in self._entries:
            if self._entry_within_budget_locked(entry, now, estimated_tokens=estimated_tokens):
                return entry
        return active

    def _probe_targets_locked(self, now: datetime) -> List[GeminiPoolEntry]:
        targets: List[GeminiPoolEntry] = []
        for entry in self._entries:
            state = entry._current_state(now)
            if state == STATE_MANUAL_OVERRIDE_EXPIRED_PENDING_PROBE and self._probe_due_locked(entry, now):
                targets.append(entry)
            elif (
                state == STATE_PROVIDER_RPD_EXHAUSTED
                and entry.provider_expected_reset_at
                and now >= entry.provider_expected_reset_at
                and self._probe_due_locked(entry, now)
            ):
                targets.append(entry)
        return targets

    def _probe_due_locked(self, entry: GeminiPoolEntry, now: datetime) -> bool:
        entry.refresh_usage_windows(now)
        if entry.next_probe_at and now < entry.next_probe_at:
            return False
        if entry.probe_count >= self.probe_max_per_project_per_day:
            entry.next_probe_at = _parse_retry_after(_next_pacific_midnight_iso())
            return False
        return True

    def _run_probe_pass(self, targets: List[GeminiPoolEntry]) -> None:
        for entry in targets:
            self._probe_entry(entry)

    def _probe_entry(self, entry: GeminiPoolEntry) -> None:
        estimated_tokens = _estimate_total_tokens(self.probe_prompt, PROBE_MAX_OUTPUT_TOKENS)
        with self._lock:
            now = _utcnow()
            entry.refresh_usage_windows(now)
            request_id = entry.reserve_usage(now, estimated_tokens)
            self._save_usage_state_locked()

        url = GENERATE_URL_TEMPLATE.format(model=quote(entry.model, safe="-_."))
        payload = {
            "contents": [{"parts": [{"text": self.probe_prompt}]}],
            "generationConfig": {
                "temperature": 0,
                "maxOutputTokens": PROBE_MAX_OUTPUT_TOKENS,
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
            error = GeminiPoolError(
                "gemini_transient_error",
                "Gemini probe timed out",
                project_alias=entry.project_alias,
                project_id=entry.project_id,
                model=entry.model,
            )
        except requests.RequestException as exc:
            error = GeminiPoolError(
                "gemini_transient_error",
                "Gemini probe failed",
                project_alias=entry.project_alias,
                project_id=entry.project_id,
                model=entry.model,
            )
        else:
            if response.status_code >= 400:
                try:
                    self._raise_for_error_response(entry, response)
                except GeminiPoolError as exc:
                    error = exc
                else:
                    error = None
            else:
                data = response.json()
                actual_tokens = _extract_total_tokens(data)
                with self._lock:
                    now = _utcnow()
                    entry.refresh_usage_windows(now)
                    entry.probe_count += 1
                    entry.last_probe_at = now
                    entry.last_probe_result = PROBE_RESULT_SUCCESS
                    entry.reconcile_usage(now, request_id, estimated_tokens, actual_tokens)
                    entry.state = STATE_AVAILABLE
                    entry.state_updated_at = now
                    self._save_usage_state_locked()
                return

        with self._lock:
            self._apply_error_state_locked(entry, error, is_probe=True)
            self._refresh_retry_after_locked(_utcnow(), estimated_tokens=1)
            self._save_usage_state_locked()

    def _apply_error_state_locked(
        self,
        entry: GeminiPoolEntry,
        error: GeminiPoolError,
        *,
        is_probe: bool = False,
    ) -> None:
        now = _utcnow()
        entry.refresh_usage_windows(now)
        entry.last_provider_status_code = error.status_code
        entry.last_provider_quota_id = error.quota_id
        entry.last_provider_quota_metric = error.quota_metric
        if is_probe:
            entry.probe_count += 1
            entry.last_probe_at = now
            quota_suffix = error.quota_kind or error.code
            entry.last_probe_result = f"error:{quota_suffix}"

        if error.code == "gemini_auth_error":
            entry.enabled = False
            entry.disabled_reason = error.code
            entry.state = STATE_AUTH_INVALID
            entry.next_probe_at = None
            entry.provider_expected_reset_at = None
            entry.state_updated_at = now
            return

        if error.code == "gemini_quota_exhausted":
            retry_at = _parse_retry_after(error.retry_after)
            if error.quota_kind == "rpd":
                provider_reset_at = _parse_retry_after(error.provider_expected_reset_at) or _parse_retry_after(
                    _next_pacific_midnight_iso()
                )
                entry.state = STATE_PROVIDER_RPD_EXHAUSTED
                entry.disabled_reason = STATE_PROVIDER_RPD_EXHAUSTED
                entry.exhausted_until = provider_reset_at
                entry.provider_expected_reset_at = provider_reset_at
                entry.cooldown_until = None
                entry.next_probe_at = _max_datetime(
                    retry_at,
                    now + timedelta(seconds=self.probe_min_interval_seconds),
                )
                entry.state_updated_at = now
                return
            if error.quota_kind == "tpm":
                entry.state = STATE_PROVIDER_TPM_EXHAUSTED
                entry.disabled_reason = STATE_PROVIDER_TPM_EXHAUSTED
                entry.cooldown_until = retry_at or (now + timedelta(seconds=ROLLING_WINDOW_SECONDS))
                entry.exhausted_until = None
                entry.provider_expected_reset_at = None
                entry.next_probe_at = None
                entry.state_updated_at = now
                return
            if error.quota_kind == "rpm":
                entry.state = STATE_PROVIDER_RPM_EXHAUSTED
                entry.disabled_reason = STATE_PROVIDER_RPM_EXHAUSTED
                entry.cooldown_until = retry_at or (now + timedelta(seconds=ROLLING_WINDOW_SECONDS))
                entry.exhausted_until = None
                entry.provider_expected_reset_at = None
                entry.next_probe_at = None
                entry.state_updated_at = now
                return

            entry.state = STATE_TRANSIENT_BACKOFF
            entry.cooldown_until = retry_at or (now + timedelta(seconds=ROLLING_WINDOW_SECONDS))
            entry.disabled_reason = error.code
            entry.exhausted_until = None
            entry.provider_expected_reset_at = None
            entry.next_probe_at = None
            entry.state_updated_at = now
            return

        if error.code == "gemini_transient_error":
            entry.state = STATE_TRANSIENT_BACKOFF
            entry.cooldown_until = now + timedelta(seconds=self.short_cooldown_seconds)
            entry.disabled_reason = error.code
            entry.exhausted_until = None
            entry.provider_expected_reset_at = None
            entry.next_probe_at = None
            entry.state_updated_at = now

    def _apply_pre_exhausted_projects_from_env(self) -> None:
        raw_ids = os.getenv("GEMINI_EXHAUSTED_PROJECT_IDS", "").strip()
        exhausted_project_ids = {item.strip() for item in raw_ids.replace(";", ",").split(",") if item.strip()}

        exhausted_until = _parse_retry_after(os.getenv("GEMINI_EXHAUSTED_UNTIL", "").strip())
        if exhausted_until is None:
            exhausted_until = _parse_retry_after(_next_pacific_midnight_iso())

        with self._lock:
            now = _utcnow()
            for entry in self._entries:
                current_state = entry._current_state(now)
                has_manual_override = current_state in {
                    STATE_MANUAL_OVERRIDE_ACTIVE,
                    STATE_MANUAL_OVERRIDE_EXPIRED_PENDING_PROBE,
                }
                newer_runtime_state = (
                    entry.last_probe_result == PROBE_RESULT_SUCCESS
                    or entry.last_provider_status_code is not None
                    or current_state
                    in {
                        STATE_AVAILABLE,
                        STATE_PROVIDER_RPD_EXHAUSTED,
                        STATE_PROVIDER_RPM_EXHAUSTED,
                        STATE_PROVIDER_TPM_EXHAUSTED,
                        STATE_AUTH_INVALID,
                        STATE_TRANSIENT_BACKOFF,
                    }
                )

                if entry.project_id not in exhausted_project_ids:
                    if has_manual_override and entry.disabled_reason in {
                        "pre_exhausted_from_env",
                        STATE_MANUAL_OVERRIDE_EXPIRED_PENDING_PROBE,
                    }:
                        entry.exhausted_until = None
                        entry.cooldown_until = None
                        entry.disabled_reason = None
                        entry.next_probe_at = None
                        entry.provider_expected_reset_at = None
                        entry.state = entry._available_state()
                        entry.state_updated_at = now
                    continue

                if newer_runtime_state and not has_manual_override:
                    continue

                entry.cooldown_until = None
                entry.provider_expected_reset_at = exhausted_until
                entry.state_updated_at = now
                if exhausted_until and now < exhausted_until:
                    entry.exhausted_until = exhausted_until
                    entry.disabled_reason = "pre_exhausted_from_env"
                    entry.state = STATE_MANUAL_OVERRIDE_ACTIVE
                    entry.next_probe_at = None
                else:
                    entry.exhausted_until = None
                    entry.disabled_reason = STATE_MANUAL_OVERRIDE_EXPIRED_PENDING_PROBE
                    entry.state = STATE_MANUAL_OVERRIDE_EXPIRED_PENDING_PROBE
                    entry.next_probe_at = now
            self._refresh_retry_after_locked(now, estimated_tokens=1)
            self._save_usage_state_locked()

    def _entry_within_budget_locked(self, entry: GeminiPoolEntry, now: datetime, estimated_tokens: int) -> bool:
        availability = entry.evaluate_availability(
            now,
            rpm_limit=self.rpm_limit,
            tpm_limit=self.tpm_limit,
            rpd_limit=self.rpd_limit,
            estimated_tokens=estimated_tokens,
        )
        return availability.available

    def _refresh_retry_after_locked(self, now: datetime, estimated_tokens: int) -> None:
        retry_after_candidates: List[datetime] = []
        for entry in self._entries:
            availability = entry.evaluate_availability(
                now,
                rpm_limit=self.rpm_limit,
                tpm_limit=self.tpm_limit,
                rpd_limit=self.rpd_limit,
                estimated_tokens=estimated_tokens,
            )
            if availability.available_after:
                retry_after_candidates.append(availability.available_after)
        self._last_retry_after = min(retry_after_candidates).isoformat() if retry_after_candidates else None

    def _load_usage_state_locked(self) -> None:
        if not self.usage_state_path:
            return

        state_path = Path(self.usage_state_path)
        if not state_path.is_absolute():
            state_path = Path.cwd() / state_path
        if not state_path.exists():
            return

        try:
            payload = json.loads(state_path.read_text(encoding="utf8"))
        except Exception as exc:
            logger.warning("Failed to load Gemini usage state: %s", exc)
            return

        entries_by_project = {
            str(item.get("projectId", "")).strip(): item
            for item in payload.get("entries", [])
            if isinstance(item, dict)
        }
        now = _utcnow()
        for entry in self._entries:
            saved = entries_by_project.get(entry.project_id)
            if not saved:
                continue
            entry.day_window_key = saved.get("dayWindowKey")
            entry.day_request_count = int(saved.get("dayRequestCount", 0) or 0)
            entry.total_request_count = int(saved.get("totalRequestCount", 0) or 0)
            entry.total_token_count = int(saved.get("totalTokenCount", 0) or 0)
            entry.cooldown_until = _parse_retry_after(saved.get("cooldownUntil"))
            entry.exhausted_until = _parse_retry_after(saved.get("exhaustedUntil"))
            entry.disabled_reason = saved.get("disabledReason")
            entry.state = str(saved.get("state", entry.state)).strip() or entry.state
            entry.state_updated_at = _parse_retry_after(saved.get("stateUpdatedAt"))
            last_provider_status_code = saved.get("lastProviderStatusCode")
            entry.last_provider_status_code = (
                int(last_provider_status_code) if last_provider_status_code not in (None, "") else None
            )
            entry.last_provider_quota_id = saved.get("lastProviderQuotaId")
            entry.last_provider_quota_metric = saved.get("lastProviderQuotaMetric")
            entry.last_used_at = _parse_retry_after(saved.get("lastUsedAt"))
            entry.last_recovered_at = _parse_retry_after(saved.get("lastRecoveredAt"))
            entry.last_recovered_reason = saved.get("lastRecoveredReason")
            entry.last_probe_at = _parse_retry_after(saved.get("lastProbeAt"))
            entry.last_probe_result = saved.get("lastProbeResult")
            entry.next_probe_at = _parse_retry_after(saved.get("nextProbeAt"))
            entry.provider_expected_reset_at = _parse_retry_after(saved.get("providerExpectedResetAt"))
            entry.probe_day_key = saved.get("probeDayKey")
            entry.probe_count = int(saved.get("probeCount", 0) or 0)
            entry.rolling_events = []
            for event_payload in saved.get("rollingEvents", []):
                if not isinstance(event_payload, dict):
                    continue
                event = GeminiUsageEvent.from_dict(event_payload)
                if event is not None:
                    entry.rolling_events.append(event)
            entry.clear_expired(now)
            entry.refresh_usage_windows(now)

    def _save_usage_state_locked(self) -> None:
        if not self.usage_state_path:
            return

        state_path = Path(self.usage_state_path)
        if not state_path.is_absolute():
            state_path = Path.cwd() / state_path
        state_path.parent.mkdir(parents=True, exist_ok=True)

        payload = {
            "generatedAt": _utcnow().isoformat(),
            "rateLimitScope": PROJECT_RATE_LIMIT_SCOPE,
            "rollingWindowSeconds": ROLLING_WINDOW_SECONDS,
            "limits": {
                "rpm": self.rpm_limit,
                "tpm": self.tpm_limit,
                "rpd": self.rpd_limit,
            },
            "entries": [
                {
                    "projectId": entry.project_id,
                    "projectAlias": entry.project_alias,
                    "keyAlias": entry.key_alias,
                    "rollingEvents": [event.to_dict() for event in entry.rolling_events],
                    "dayWindowKey": entry.day_window_key,
                    "dayRequestCount": entry.day_request_count,
                    "totalRequestCount": entry.total_request_count,
                    "totalTokenCount": entry.total_token_count,
                    "cooldownUntil": entry.cooldown_until.isoformat() if entry.cooldown_until else None,
                    "exhaustedUntil": entry.exhausted_until.isoformat() if entry.exhausted_until else None,
                    "disabledReason": entry.disabled_reason,
                    "state": entry.state,
                    "stateUpdatedAt": entry.state_updated_at.isoformat() if entry.state_updated_at else None,
                    "lastUsedAt": entry.last_used_at.isoformat() if entry.last_used_at else None,
                    "lastRecoveredAt": entry.last_recovered_at.isoformat() if entry.last_recovered_at else None,
                    "lastRecoveredReason": entry.last_recovered_reason,
                    "lastProviderStatusCode": entry.last_provider_status_code,
                    "lastProviderQuotaId": entry.last_provider_quota_id,
                    "lastProviderQuotaMetric": entry.last_provider_quota_metric,
                    "lastProbeAt": entry.last_probe_at.isoformat() if entry.last_probe_at else None,
                    "lastProbeResult": entry.last_probe_result,
                    "nextProbeAt": entry.next_probe_at.isoformat() if entry.next_probe_at else None,
                    "providerExpectedResetAt": entry.provider_expected_reset_at.isoformat()
                    if entry.provider_expected_reset_at
                    else None,
                    "probeDayKey": entry.probe_day_key,
                    "probeCount": entry.probe_count,
                }
                for entry in self._entries
            ],
        }
        state_path.write_text(json.dumps(payload, indent=2), encoding="utf8")


def _safe_int(raw: Optional[str], default: int) -> int:
    try:
        return int(raw or default)
    except (TypeError, ValueError):
        return default


def _utcnow() -> datetime:
    return datetime.utcnow()


def _current_pacific_day_key(now: datetime) -> str:
    now_utc = now.replace(tzinfo=timezone.utc)
    if PACIFIC_TZ is not None:
        return now_utc.astimezone(PACIFIC_TZ).strftime("%Y-%m-%d")

    offset_hours = _pacific_offset_hours_for_utc(now_utc)
    local_dt = now_utc + timedelta(hours=offset_hours)
    return local_dt.strftime("%Y-%m-%d")


def _estimate_total_tokens(prompt: str, max_output_tokens: int) -> int:
    prompt_tokens = max(1, (len(prompt or "") + 3) // 4)
    return prompt_tokens + max(0, int(max_output_tokens))


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
    next_midnight_utc = (next_midnight_local - timedelta(hours=next_offset_hours)).replace(
        tzinfo=timezone.utc
    )
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
        if isinstance(retry_after, str) and retry_after.isdigit():
            return _utcnow() + timedelta(seconds=int(retry_after))
        return datetime.fromisoformat(str(retry_after).replace("Z", "+00:00")).replace(tzinfo=None)
    except (TypeError, ValueError):
        return None


def _max_datetime(*values: Optional[datetime]) -> Optional[datetime]:
    candidates = [value for value in values if value is not None]
    if not candidates:
        return None
    return max(candidates)


def _extract_retry_after_from_google_error(payload: Dict[str, Any]) -> Optional[str]:
    error = payload.get("error") if isinstance(payload, dict) else None
    details = error.get("details") if isinstance(error, dict) else None
    if not isinstance(details, list):
        return None

    for detail in details:
        if not isinstance(detail, dict):
            continue
        retry_delay = detail.get("retryDelay") or detail.get("retry_delay")
        if isinstance(retry_delay, str):
            parsed = _parse_google_duration_seconds(retry_delay)
            if parsed is not None:
                return (_utcnow() + timedelta(seconds=parsed)).isoformat()
        retry_after = detail.get("retryAfter")
        if isinstance(retry_after, str):
            parsed_retry_after = _parse_retry_after(retry_after)
            if parsed_retry_after is not None:
                return parsed_retry_after.isoformat()
    return None


def _extract_google_quota_violations(payload: Dict[str, Any]) -> List[Dict[str, Optional[str]]]:
    error = payload.get("error") if isinstance(payload, dict) else None
    details = error.get("details") if isinstance(error, dict) else None
    if not isinstance(details, list):
        return []

    violations: List[Dict[str, Optional[str]]] = []
    for detail in details:
        if not isinstance(detail, dict):
            continue
        detail_type = str(detail.get("@type", "") or detail.get("type", "")).strip()
        raw_violations = detail.get("violations")
        if "QuotaFailure" not in detail_type and not isinstance(raw_violations, list):
            continue
        if not isinstance(raw_violations, list):
            continue
        for violation in raw_violations:
            if not isinstance(violation, dict):
                continue
            violations.append(
                {
                    "quotaId": str(violation.get("quotaId", "")).strip() or None,
                    "quotaMetric": str(violation.get("quotaMetric", "")).strip() or None,
                }
            )
    return violations


def _classify_quota_kind(
    quota_id: Optional[str],
    quota_metric: Optional[str],
    message: str,
) -> Optional[str]:
    lower_id = (quota_id or "").lower()
    lower_metric = (quota_metric or "").lower()
    lower_message = (message or "").lower()
    normalized_id = lower_id.replace("-", "").replace("_", "").replace(" ", "")
    normalized_metric = lower_metric.replace("-", "").replace("_", "").replace(" ", "")
    normalized_message = lower_message.replace("-", "").replace("_", "").replace(" ", "")

    if (
        "perday" in normalized_id
        or "perday" in normalized_metric
        or "requestsperday" in normalized_message
        or "inputtokensperday" in normalized_message
        or " rpd" in lower_message
    ):
        return "rpd"

    if "inputtokens" in normalized_id or "inputtokencount" in normalized_metric or "input token" in lower_message:
        if "perday" in normalized_id or "perday" in normalized_metric or "perday" in normalized_message:
            return "rpd"
        return "tpm"

    if (
        "perminute" in normalized_id
        or "perminute" in normalized_metric
        or "requestsperminute" in normalized_message
        or "rate limit" in lower_message
        or "resource exhausted" in lower_message
    ):
        return "rpm"

    if "quota exceeded" in lower_message or "daily quota" in lower_message:
        return "rpd"
    return None


def _pick_primary_quota_signal(
    violations: List[Dict[str, Optional[str]]],
    message: str,
) -> tuple[Optional[str], Optional[str], Optional[str]]:
    if not violations:
        inferred_kind = _classify_quota_kind(None, None, message)
        return None, None, inferred_kind

    ranked: Dict[str, tuple[Optional[str], Optional[str], Optional[str]]] = {}
    fallback_id = violations[0].get("quotaId")
    fallback_metric = violations[0].get("quotaMetric")
    for violation in violations:
        quota_id = violation.get("quotaId")
        quota_metric = violation.get("quotaMetric")
        quota_kind = _classify_quota_kind(quota_id, quota_metric, message)
        if quota_kind and quota_kind not in ranked:
            ranked[quota_kind] = (quota_id, quota_metric, quota_kind)

    for desired_kind in ("rpd", "tpm", "rpm"):
        if desired_kind in ranked:
            return ranked[desired_kind]

    return fallback_id, fallback_metric, _classify_quota_kind(fallback_id, fallback_metric, message)


def _parse_google_duration_seconds(raw_duration: str) -> Optional[float]:
    raw_duration = (raw_duration or "").strip()
    if not raw_duration.endswith("s"):
        return None
    try:
        return float(raw_duration[:-1])
    except ValueError:
        return None


def _extract_text(payload: Dict[str, Any]) -> Optional[str]:
    candidates = payload.get("candidates") or []
    for candidate in candidates:
        content = candidate.get("content") or {}
        parts = content.get("parts") or []
        text_parts = [part.get("text", "") for part in parts if part.get("text")]
        if text_parts:
            return "".join(text_parts).strip()
    return None


def _extract_total_tokens(payload: Dict[str, Any]) -> Optional[int]:
    usage = payload.get("usageMetadata") or {}
    total = usage.get("totalTokenCount")
    if isinstance(total, int):
        return total

    prompt_tokens = usage.get("promptTokenCount")
    candidate_tokens = usage.get("candidatesTokenCount")
    if isinstance(prompt_tokens, int) or isinstance(candidate_tokens, int):
        return int(prompt_tokens or 0) + int(candidate_tokens or 0)

    return None


def _load_pool_entries_from_json(raw_pool: str, *, env_name: str, default_model: str) -> List[GeminiPoolEntry]:
    entries: List[GeminiPoolEntry] = []
    if not raw_pool:
        return entries

    try:
        payload = json.loads(raw_pool)
        if not isinstance(payload, list):
            raise ValueError(f"{env_name} must be a JSON array")
        for index, item in enumerate(payload):
            if not isinstance(item, dict):
                logger.warning("Skipping Gemini pool entry %s from %s: expected object", index, env_name)
                continue
            api_key = str(item.get("apiKey", "")).strip()
            project_id = str(item.get("projectId", "")).strip()
            if not api_key or not project_id:
                logger.warning(
                    "Skipping Gemini pool entry %s from %s: apiKey/projectId missing",
                    index,
                    env_name,
                )
                continue

            entries.append(
                GeminiPoolEntry(
                    project_alias=str(item.get("projectAlias", f"project-{index + 1}")).strip()
                    or f"project-{index + 1}",
                    project_id=project_id,
                    key_alias=str(item.get("keyAlias", f"slot-{index + 1}")).strip() or f"slot-{index + 1}",
                    api_key=api_key,
                    model=str(item.get("model", default_model)).strip() or default_model,
                    enabled=bool(item.get("enabled", True)),
                )
            )
    except Exception as exc:
        logger.error("Failed to parse %s: %s", env_name, exc)

    return entries
