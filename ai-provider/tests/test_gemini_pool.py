from __future__ import annotations

import unittest

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
        pool = GeminiPoolManager(
            [
                GeminiPoolEntry("primary", "project-a", "slot-1", "key-1", DEFAULT_MODEL),
            ]
        )
        status = pool.get_runtime_status()
        self.assertEqual(status["gemini_model"], "gemini-2.5-flash")

    def test_fails_over_on_429(self) -> None:
        responses = [
            FakeResponse(429, {"error": {"message": "quota exceeded"}}),
            FakeResponse(
                200,
                {"candidates": [{"content": {"parts": [{"text": "ok from backup"}]}}]},
            ),
        ]

        def requester(*args, **kwargs):
            return responses.pop(0)

        pool = GeminiPoolManager(
            [
                GeminiPoolEntry("primary", "project-a", "slot-1", "key-1", DEFAULT_MODEL),
                GeminiPoolEntry("backup", "project-b", "slot-2", "key-2", DEFAULT_MODEL),
            ],
            requester=requester,
        )

        result = pool.generate_text("hello")
        status = pool.get_runtime_status()
        self.assertEqual(result, "ok from backup")
        self.assertEqual(status["gemini_active_project"], "backup")
        self.assertIn("primary->backup", status["gemini_last_failover_reason"])

    def test_disables_project_on_auth_error(self) -> None:
        responses = [
            FakeResponse(403, {"error": {"message": "forbidden"}}),
            FakeResponse(
                200,
                {"candidates": [{"content": {"parts": [{"text": "ok from backup"}]}}]},
            ),
        ]

        def requester(*args, **kwargs):
            return responses.pop(0)

        pool = GeminiPoolManager(
            [
                GeminiPoolEntry("primary", "project-a", "slot-1", "key-1", DEFAULT_MODEL),
                GeminiPoolEntry("backup", "project-b", "slot-2", "key-2", DEFAULT_MODEL),
            ],
            requester=requester,
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

        def requester(*args, **kwargs):
            return responses.pop(0)

        pool = GeminiPoolManager(
            [
                GeminiPoolEntry("primary", "project-a", "slot-1", "key-1", DEFAULT_MODEL),
                GeminiPoolEntry("backup", "project-b", "slot-2", "key-2", DEFAULT_MODEL),
            ],
            requester=requester,
        )

        with self.assertRaises(GeminiQuotaExhaustedError):
            pool.generate_text("hello")


if __name__ == "__main__":
    unittest.main()
