from __future__ import annotations

from datetime import datetime, timedelta
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from gemini_pool import (
    DEFAULT_MODEL,
    GeminiPoolEntry,
    GeminiPoolManager,
    GeminiQuotaExhaustedError,
)


class FakeResponse:
    def __init__(self, status_code: int, payload: dict, headers: dict | None = None) -> None:
        self.status_code = status_code
        self._payload = payload
        self.headers = headers or {}
        self.text = ""

    def json(self) -> dict:
        return self._payload


class MutableClock:
    def __init__(self, start: datetime) -> None:
        self.now = start

    def __call__(self) -> datetime:
        return self.now


def ok_response(text: str, total_tokens: int = 10) -> FakeResponse:
    return FakeResponse(
        200,
        {
            "candidates": [{"content": {"parts": [{"text": text}]}}],
            "usageMetadata": {"totalTokenCount": total_tokens},
        },
    )


class GeminiPoolTests(unittest.TestCase):
    def test_dedupes_same_project(self) -> None:
        pool = GeminiPoolManager(
            [
                GeminiPoolEntry("primary", "project-a", "slot-1", "key-1", DEFAULT_MODEL),
                GeminiPoolEntry("duplicate", "project-a", "slot-2", "key-2", DEFAULT_MODEL),
                GeminiPoolEntry("backup", "project-b", "slot-3", "key-3", DEFAULT_MODEL),
            ]
        )

        status = pool.get_runtime_status()
        self.assertEqual(status["gemini_pool_size"], 2)
        self.assertEqual(status["gemini_distinct_project_count"], 2)
        self.assertEqual(status["gemini_duplicates_filtered"], 1)

    def test_defaults_model_to_25_flash(self) -> None:
        pool = GeminiPoolManager([GeminiPoolEntry("primary", "project-a", "slot-1", "key-1", DEFAULT_MODEL)])
        self.assertEqual(pool.get_runtime_status()["gemini_model"], "gemini-2.5-flash")

    def test_fails_over_on_429(self) -> None:
        responses = [
            FakeResponse(429, {"error": {"message": "quota exceeded"}}),
            ok_response("ok from backup"),
        ]

        pool = GeminiPoolManager(
            [
                GeminiPoolEntry("primary", "project-a", "slot-1", "key-1", DEFAULT_MODEL),
                GeminiPoolEntry("backup", "project-b", "slot-2", "key-2", DEFAULT_MODEL),
            ],
            requester=lambda *args, **kwargs: responses.pop(0),
        )

        result = pool.generate_text("hello")
        status = pool.get_runtime_status()
        self.assertEqual(result, "ok from backup")
        self.assertEqual(status["gemini_active_project"], "backup")
        self.assertIn("primary->backup", status["gemini_last_failover_reason"])

    def test_disables_project_on_auth_error(self) -> None:
        responses = [
            FakeResponse(403, {"error": {"message": "forbidden"}}),
            ok_response("ok from backup"),
        ]

        pool = GeminiPoolManager(
            [
                GeminiPoolEntry("primary", "project-a", "slot-1", "key-1", DEFAULT_MODEL),
                GeminiPoolEntry("backup", "project-b", "slot-2", "key-2", DEFAULT_MODEL),
            ],
            requester=lambda *args, **kwargs: responses.pop(0),
        )

        result = pool.generate_text("hello")
        status = pool.get_runtime_status()
        self.assertEqual(result, "ok from backup")
        self.assertEqual(status["gemini_active_project"], "backup")
        self.assertTrue(pool.has_available_entry())

    def test_stops_when_all_projects_exhausted(self) -> None:
        responses = [
            FakeResponse(429, {"error": {"message": "daily quota exceeded"}}),
            FakeResponse(429, {"error": {"message": "daily quota exceeded"}}),
        ]

        pool = GeminiPoolManager(
            [
                GeminiPoolEntry("primary", "project-a", "slot-1", "key-1", DEFAULT_MODEL),
                GeminiPoolEntry("backup", "project-b", "slot-2", "key-2", DEFAULT_MODEL),
            ],
            requester=lambda *args, **kwargs: responses.pop(0),
        )

        with self.assertRaises(GeminiQuotaExhaustedError):
            pool.generate_text("hello")

    def test_builds_six_distinct_projects_from_env(self) -> None:
        with patch.dict(
            os.environ,
            {
                "GEMINI_MODEL": DEFAULT_MODEL,
                "GEMINI_KEY_POOL_JSON": (
                    "["
                    '{"projectAlias":"p1","projectId":"project-1","keyAlias":"slot-1","apiKey":"key-1","model":"gemini-2.5-flash","enabled":true},'
                    '{"projectAlias":"p2","projectId":"project-2","keyAlias":"slot-2","apiKey":"key-2","model":"gemini-2.5-flash","enabled":true},'
                    '{"projectAlias":"p3","projectId":"project-3","keyAlias":"slot-3","apiKey":"key-3","model":"gemini-2.5-flash","enabled":true},'
                    '{"projectAlias":"p4","projectId":"project-4","keyAlias":"slot-4","apiKey":"key-4","model":"gemini-2.5-flash","enabled":true}'
                    "]"
                ),
                "GEMINI_API_KEY": "key-5",
                "GEMINI_API_KEY_PROJECT_ID": "project-5",
                "GEMINI_API_KEY_PROJECT_ALIAS": "p5",
                "GEMINI_API_KEY_ALIAS": "slot-5",
                "GEMINI_EXTRA_KEY_POOL_JSON": (
                    '[{"projectAlias":"p6","projectId":"project-6","keyAlias":"slot-6","apiKey":"key-6","model":"gemini-2.5-flash","enabled":true}]'
                ),
            },
            clear=True,
        ):
            pool = GeminiPoolManager.from_env()

        status = pool.get_runtime_status()
        self.assertEqual(status["gemini_pool_size"], 6)
        self.assertEqual(status["gemini_distinct_project_count"], 6)
        self.assertEqual(status["gemini_rate_limit_scope"], "project")

    def test_pre_exhausted_projects_are_skipped_on_boot(self) -> None:
        with patch.dict(
            os.environ,
            {
                "GEMINI_MODEL": DEFAULT_MODEL,
                "GEMINI_KEY_POOL_JSON": (
                    "["
                    '{"projectAlias":"primary","projectId":"project-a","keyAlias":"slot-1","apiKey":"key-1","model":"gemini-2.5-flash","enabled":true},'
                    '{"projectAlias":"backup","projectId":"project-b","keyAlias":"slot-2","apiKey":"key-2","model":"gemini-2.5-flash","enabled":true}'
                    "]"
                ),
                "GEMINI_EXHAUSTED_PROJECT_IDS": "project-a",
            },
            clear=True,
        ):
            pool = GeminiPoolManager.from_env()

        self.assertEqual(pool.get_runtime_status()["gemini_active_project"], "backup")

    def test_rotates_on_rolling_rpm_and_marks_recovery(self) -> None:
        clock = MutableClock(datetime(2026, 4, 10, 12, 0, 0))
        responses = [ok_response("primary"), ok_response("backup")]
        pool = GeminiPoolManager(
            [
                GeminiPoolEntry("primary", "project-a", "slot-1", "key-1", DEFAULT_MODEL),
                GeminiPoolEntry("backup", "project-b", "slot-2", "key-2", DEFAULT_MODEL),
            ],
            rpm_limit=1,
            requester=lambda *args, **kwargs: responses.pop(0),
        )

        with patch("gemini_pool._utcnow", side_effect=clock):
            self.assertEqual(pool.generate_text("hello", max_output_tokens=1), "primary")
            clock.now += timedelta(seconds=10)
            self.assertEqual(pool.generate_text("hello", max_output_tokens=1), "backup")
            primary = pool.get_runtime_status()["gemini_usage_entries"][0]
            self.assertEqual(primary["availabilityReason"], "rpm_limit_reached")
            self.assertIsNotNone(primary["rpmRecoveryAt"])
            clock.now += timedelta(seconds=51)
            refreshed = pool.get_runtime_status()["gemini_usage_entries"][0]
            self.assertTrue(refreshed["available"])
            self.assertIsNotNone(refreshed["lastRecoveredAt"])

    def test_rotates_on_rolling_tpm(self) -> None:
        clock = MutableClock(datetime(2026, 4, 10, 12, 0, 0))
        responses = [ok_response("primary", total_tokens=5), ok_response("backup", total_tokens=5)]
        pool = GeminiPoolManager(
            [
                GeminiPoolEntry("primary", "project-a", "slot-1", "key-1", DEFAULT_MODEL),
                GeminiPoolEntry("backup", "project-b", "slot-2", "key-2", DEFAULT_MODEL),
            ],
            tpm_limit=5,
            requester=lambda *args, **kwargs: responses.pop(0),
        )

        with patch("gemini_pool._utcnow", side_effect=clock):
            self.assertEqual(pool.generate_text("a", max_output_tokens=4), "primary")
            clock.now += timedelta(seconds=5)
            self.assertEqual(pool.generate_text("a", max_output_tokens=4), "backup")
            primary = pool.get_runtime_status()["gemini_usage_entries"][0]
            self.assertEqual(primary["availabilityReason"], "tpm_limit_reached")
            self.assertIsNotNone(primary["tpmRecoveryAt"])

    def test_rotates_on_rpd_limit(self) -> None:
        clock = MutableClock(datetime(2026, 4, 10, 12, 0, 0))
        responses = [ok_response("primary"), ok_response("backup")]
        pool = GeminiPoolManager(
            [
                GeminiPoolEntry("primary", "project-a", "slot-1", "key-1", DEFAULT_MODEL),
                GeminiPoolEntry("backup", "project-b", "slot-2", "key-2", DEFAULT_MODEL),
            ],
            rpd_limit=1,
            requester=lambda *args, **kwargs: responses.pop(0),
        )

        with patch("gemini_pool._utcnow", side_effect=clock):
            self.assertEqual(pool.generate_text("hello"), "primary")
            clock.now += timedelta(seconds=5)
            self.assertEqual(pool.generate_text("hello"), "backup")
            primary = pool.get_runtime_status()["gemini_usage_entries"][0]
            self.assertEqual(primary["availabilityReason"], "rpd_limit_reached")
            self.assertIsNotNone(primary["rpdRecoveryAt"])

    def test_persists_project_usage_state(self) -> None:
        clock = MutableClock(datetime(2026, 4, 10, 12, 0, 0))
        with tempfile.TemporaryDirectory() as temp_dir:
            state_path = os.path.join(temp_dir, "gemini-state.json")
            responses = [ok_response("primary", total_tokens=7)]
            pool = GeminiPoolManager(
                [GeminiPoolEntry("primary", "project-a", "slot-1", "key-1", DEFAULT_MODEL)],
                usage_state_path=state_path,
                requester=lambda *args, **kwargs: responses.pop(0),
            )

            with patch("gemini_pool._utcnow", side_effect=clock):
                self.assertEqual(pool.generate_text("hello", max_output_tokens=3), "primary")

            reloaded = GeminiPoolManager(
                [GeminiPoolEntry("primary", "project-a", "slot-1", "key-1", DEFAULT_MODEL)],
                usage_state_path=state_path,
            )
            status = reloaded.get_runtime_status()["gemini_usage_entries"][0]
            self.assertEqual(status["totalRequests"], 1)
            self.assertEqual(status["totalTokens"], 7)
            self.assertEqual(status["rollingEventsCount"], 1)


if __name__ == "__main__":
    unittest.main()
