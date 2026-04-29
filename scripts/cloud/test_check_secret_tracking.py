from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().with_name("check_secret_tracking.py")
MODULE_SPEC = importlib.util.spec_from_file_location("check_secret_tracking", MODULE_PATH)
check_secret_tracking = importlib.util.module_from_spec(MODULE_SPEC)
assert MODULE_SPEC.loader is not None
MODULE_SPEC.loader.exec_module(check_secret_tracking)


class SecretTrackingGuardTests(unittest.TestCase):
    def test_scan_tracked_paths_flags_runtime_secret_files(self) -> None:
        findings = check_secret_tracking.scan_tracked_paths(
            [
                "eatfitai-mobile/android/app/google-services.json",
                "eatfitai-mobile/.env.development",
                "eatfitai-mobile/.env.development.example",
                "eatfitai-mobile/android/release.jks",
            ]
        )

        self.assertEqual(len(findings), 4)
        self.assertTrue(any("google-services.json" in finding for finding in findings))
        self.assertTrue(any(".env.development:" in finding for finding in findings))
        self.assertFalse(any(".env.development.example" in finding for finding in findings))
        self.assertTrue(any("release.jks" in finding for finding in findings))

    def test_placeholder_detection_allows_committed_templates(self) -> None:
        allowed_values = (
            "",
            "SET_IN_USER_SECRETS",
            "SET_IN_ENV_OR_SECRET_STORE",
            "YOUR_VALUE_HERE",
            "YOUR_SECRET_HERE",
            "YOUR_RENDER_KEY",
        )

        for value in allowed_values:
            with self.subTest(value=value):
                self.assertTrue(check_secret_tracking.is_placeholder(value))

    def test_placeholder_detection_rejects_live_values(self) -> None:
        rejected_values = (
            "postgres-password",
            "super-long-local-jwt-key-that-should-not-be-committed",
            "sk_live_example",
        )

        for value in rejected_values:
            with self.subTest(value=value):
                self.assertFalse(check_secret_tracking.is_placeholder(value))

    def test_extract_connection_password(self) -> None:
        connection_string = (
            "Host=db.example.com;Port=5432;Database=postgres;"
            "Username=postgres;Password=secret-value;SSL Mode=Require;"
        )

        self.assertEqual(
            check_secret_tracking.extract_connection_password(connection_string),
            "secret-value",
        )


if __name__ == "__main__":
    unittest.main()
