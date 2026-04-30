from __future__ import annotations

import json
import os
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from gemini_state_store import FileGeminiUsageStateStore, PostgresGeminiUsageStateStore


class FakeCursor:
    def __init__(self, connection: "FakeConnection") -> None:
        self.connection = connection
        self.rows = []

    def __enter__(self) -> "FakeCursor":
        return self

    def __exit__(self, *args) -> None:
        return None

    def execute(self, sql: str, params=None) -> None:
        self.connection.statements.append((sql, params))
        normalized = " ".join(sql.split()).lower()
        if normalized.startswith("select"):
            self.rows = list(self.connection.rows)
            return

        if "insert into" in normalized and params:
            project_id, project_alias, key_alias, entry_json, limits_json, generated_at = params
            self.connection.saved[project_id] = {
                "generatedAt": generated_at,
                "limitsJson": limits_json,
                "entryJson": entry_json,
                "projectAlias": project_alias,
                "keyAlias": key_alias,
            }

    def fetchall(self):
        return self.rows


class FakeConnection:
    def __init__(self) -> None:
        self.statements = []
        self.rows = []
        self.saved = {}
        self.commits = 0

    def __enter__(self) -> "FakeConnection":
        return self

    def __exit__(self, *args) -> None:
        return None

    def cursor(self) -> FakeCursor:
        return FakeCursor(self)

    def commit(self) -> None:
        self.commits += 1


class GeminiStateStoreTests(unittest.TestCase):
    def test_file_store_round_trips_payload(self) -> None:
        payload = {
            "generatedAt": "2026-04-10T12:00:00",
            "limits": {"rpm": 5, "tpm": 250000, "rpd": 20},
            "entries": [{"projectId": "project-a", "state": "available"}],
        }
        with tempfile.TemporaryDirectory() as temp_dir:
            path = os.path.join(temp_dir, "state", "gemini.json")
            store = FileGeminiUsageStateStore(path)

            store.save(payload)

            self.assertEqual(store.load(), payload)
            self.assertFalse(store.status()["degraded"])

    def test_postgres_store_upserts_entries_and_loads_payload(self) -> None:
        payload = {
            "generatedAt": "2026-04-10T12:00:00",
            "limits": {"rpm": 5, "tpm": 250000, "rpd": 20},
            "entries": [
                {
                    "projectId": "project-a",
                    "projectAlias": "primary",
                    "keyAlias": "slot-1",
                    "state": "provider_rpd_exhausted",
                    "dayRequestCount": 20,
                }
            ],
        }
        fake_connection = FakeConnection()
        store = PostgresGeminiUsageStateStore(
            "postgres://example",
            connect_factory=lambda _: fake_connection,
        )

        store.save(payload)
        saved = fake_connection.saved["project-a"]
        fake_connection.rows = [
            (
                "project-a",
                "primary",
                "slot-1",
                saved["entryJson"],
                saved["limitsJson"],
                saved["generatedAt"],
            )
        ]

        loaded = store.load()

        self.assertEqual(loaded["limits"], payload["limits"])
        self.assertEqual(loaded["entries"][0]["projectId"], "project-a")
        self.assertEqual(loaded["entries"][0]["state"], "provider_rpd_exhausted")
        self.assertGreaterEqual(fake_connection.commits, 2)
        self.assertFalse(store.status()["degraded"])

    def test_postgres_store_reports_degraded_when_database_is_unavailable(self) -> None:
        store = PostgresGeminiUsageStateStore(
            "postgres://example",
            connect_factory=lambda _: (_ for _ in ()).throw(RuntimeError("db unavailable")),
        )

        self.assertIsNone(store.load())
        store.save({"entries": []})

        status = store.status()
        self.assertTrue(status["degraded"])
        self.assertIn("db unavailable", status["error"])

    def test_postgres_store_normalizes_dotnet_connection_string_before_connecting(self) -> None:
        captured = []
        fake_connection = FakeConnection()
        store = PostgresGeminiUsageStateStore(
            "Host=db.example.com;Port=5432;Database=eatfit;Username=app;Password=secret;SSL Mode=Require;Trust Server Certificate=true",
            connect_factory=lambda value: captured.append(value) or fake_connection,
        )

        store.save({"entries": []})

        self.assertEqual(len(captured), 1)
        dsn = captured[0]
        self.assertIn("host=db.example.com", dsn)
        self.assertIn("port=5432", dsn)
        self.assertIn("dbname=eatfit", dsn)
        self.assertIn("user=app", dsn)
        self.assertIn("password=secret", dsn)
        self.assertIn("sslmode=require", dsn)
        self.assertNotIn("Host=", dsn)

    def test_default_postgres_connect_disables_prepared_statements(self) -> None:
        captured = {}

        def fake_connect(*args, **kwargs):
            captured["args"] = args
            captured["kwargs"] = kwargs
            return FakeConnection()

        fake_psycopg = SimpleNamespace(connect=fake_connect)
        with patch.dict(sys.modules, {"psycopg": fake_psycopg}):
            connection = PostgresGeminiUsageStateStore._default_connect("postgres://example")

        self.assertIsInstance(connection, FakeConnection)
        self.assertEqual(captured["args"], ("postgres://example",))
        self.assertIn("prepare_threshold", captured["kwargs"])
        self.assertIsNone(captured["kwargs"].get("prepare_threshold"))


if __name__ == "__main__":
    unittest.main()
