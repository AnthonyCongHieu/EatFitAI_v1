from __future__ import annotations

import re
import unittest
import json
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
CLOUD_SMOKE_SCRIPT = REPO_ROOT / "start-mobile-cloud-smoke.ps1"
MOBILE_ROOT = REPO_ROOT / "eatfitai-mobile"
DUCKDNS_BACKEND_URL = "https://eatfitai-api.duckdns.org"
DUCKDNS_AI_PROVIDER_URL = "https://eatfitai-ai.duckdns.org"
ACTIVE_SMOKE_SCRIPTS = [
    MOBILE_ROOT / "scripts" / "production-smoke-preflight.js",
    MOBILE_ROOT / "scripts" / "production-smoke-auth-api.js",
    MOBILE_ROOT / "scripts" / "production-smoke-ai-api.js",
    MOBILE_ROOT / "scripts" / "production-smoke-cleanup.js",
    MOBILE_ROOT / "scripts" / "production-smoke-regression.js",
    MOBILE_ROOT / "scripts" / "production-smoke-seed-cloud.js",
    MOBILE_ROOT / "scripts" / "production-smoke-user-api.js",
    MOBILE_ROOT / "scripts" / "real-device-adb-flow.js",
    MOBILE_ROOT / "scripts" / "real-device-rc-proof.js",
    MOBILE_ROOT / "scripts" / "product-release-gate.js",
]
RENDER_BACKUP_GATE = REPO_ROOT / "scripts" / "cloud" / "render_backup_gate.py"
LIGHTSAIL_BACKEND_ENV_EXAMPLE = REPO_ROOT / "infra" / "lightsail" / "backend.env.example"
SMOKE_MANIFEST_TEMPLATE = MOBILE_ROOT / "scripts" / "production-smoke-manifest.template.json"
SCAN_FIXTURE_ROOT = REPO_ROOT / "tools" / "fixtures" / "scan-demo"
LIGHTSAIL_YOLO_PRIMARY_LABELS = {
    "beef",
    "broccoli",
    "cauliflower",
    "fried_egg",
    "rice",
    "spinach",
}


class CloudSmokeTargetTests(unittest.TestCase):
    def test_cloud_smoke_defaults_to_duckdns_lightsail_backend(self) -> None:
        content = CLOUD_SMOKE_SCRIPT.read_text(encoding="utf-8")

        self.assertIn(DUCKDNS_BACKEND_URL, content)
        self.assertNotRegex(
            content,
            r"EXPO_PUBLIC_API_BASE_URL\s*=\s*'https://eatfitai-backend\.onrender\.com'",
        )

    def test_cloud_smoke_allows_backend_url_override(self) -> None:
        content = CLOUD_SMOKE_SCRIPT.read_text(encoding="utf-8")

        self.assertRegex(
            content,
            r"\$backendUrl\s*=\s*if\s*\(\$env:EATFITAI_SMOKE_BACKEND_URL\)",
        )
        self.assertRegex(
            content,
            r"\$env:EATFITAI_SMOKE_BACKEND_URL\s*=\s*\$backendUrl",
        )
        self.assertRegex(
            content,
            r"\$env:EXPO_PUBLIC_API_BASE_URL\s*=\s*\$backendUrl",
        )

    def test_preflight_prefers_explicit_smoke_backend_url(self) -> None:
        content = (MOBILE_ROOT / "scripts" / "production-smoke-preflight.js").read_text(
            encoding="utf-8"
        )

        self.assertRegex(
            content,
            r"trimEnv\('EATFITAI_SMOKE_BACKEND_URL'\)\s*\|\|\s*trimEnv\('EXPO_PUBLIC_API_BASE_URL'\)",
        )

    def test_active_mobile_smoke_scripts_default_to_duckdns(self) -> None:
        stale_defaults = [
            "https://eatfitai-backend-dev.onrender.com",
            "https://eatfitai-backend.onrender.com",
            "https://api.18.141.119.165.nip.io",
        ]

        for script_path in ACTIVE_SMOKE_SCRIPTS:
            with self.subTest(script=str(script_path.relative_to(REPO_ROOT))):
                content = script_path.read_text(encoding="utf-8")
                self.assertIn(DUCKDNS_BACKEND_URL, content)
                for stale_default in stale_defaults:
                    self.assertNotIn(stale_default, content)

    def test_preflight_direct_provider_default_is_duckdns(self) -> None:
        content = (MOBILE_ROOT / "scripts" / "production-smoke-preflight.js").read_text(
            encoding="utf-8"
        )

        self.assertIn(DUCKDNS_AI_PROVIDER_URL, content)
        self.assertIn("lightsail-backend -> private-lightsail-ai-provider", content)
        self.assertNotIn("render-backend -> render-ai-provider", content)

    def test_release_cloud_gate_makes_render_verify_opt_in(self) -> None:
        content = (MOBILE_ROOT / "scripts" / "product-release-gate.js").read_text(
            encoding="utf-8"
        )

        self.assertIn("EATFITAI_RELEASE_GATE_RENDER_VERIFY", content)
        self.assertIn("Skipped by default for Lightsail primary cutover", content)
        self.assertIn("shouldRunRenderVerifyGate(env)", content)

    def test_release_cloud_gate_provisions_disposable_auth_by_default(self) -> None:
        content = (MOBILE_ROOT / "scripts" / "product-release-gate.js").read_text(
            encoding="utf-8"
        )

        self.assertIn("createDisposableMailbox", content)
        self.assertIn("EATFITAI_RELEASE_GATE_DISPOSABLE_AUTH", content)
        self.assertIn("EATFITAI_REGRESSION_ALLOW_MUTATIONS", content)
        self.assertIn("release-gate-mailbox.json", content)

    def test_eas_preview_and_production_default_to_duckdns(self) -> None:
        eas = json.loads((MOBILE_ROOT / "eas.json").read_text(encoding="utf-8"))

        for profile_name in ("preview", "production"):
            with self.subTest(profile=profile_name):
                profile = eas["build"][profile_name]
                self.assertEqual(
                    profile["env"]["EXPO_PUBLIC_API_BASE_URL"],
                    DUCKDNS_BACKEND_URL,
                )

    def test_lightsail_rate_limit_knobs_are_documented(self) -> None:
        content = LIGHTSAIL_BACKEND_ENV_EXAMPLE.read_text(encoding="utf-8")

        for key in (
            "RateLimiting__AuthPermitLimit=10",
            "RateLimiting__AiPermitLimit=20",
            "RateLimiting__GeneralPermitLimit=120",
        ):
            with self.subTest(key=key):
                self.assertIn(key, content)

    def test_smoke_primary_fixtures_match_lightsail_yolo_classes(self) -> None:
        manifest = json.loads(SMOKE_MANIFEST_TEMPLATE.read_text(encoding="utf-8"))
        primary_fixtures = manifest["fixtures"]["primary"]

        self.assertGreaterEqual(len(primary_fixtures), 5)
        for fixture in primary_fixtures:
            with self.subTest(fixture=fixture["key"]):
                expected_labels = set(fixture.get("expectedLabels") or [])
                self.assertTrue(expected_labels)
                self.assertTrue(expected_labels <= LIGHTSAIL_YOLO_PRIMARY_LABELS)
                self.assertTrue((SCAN_FIXTURE_ROOT / fixture["fileName"]).exists())

    def test_render_suspend_script_requires_gate_confirmation(self) -> None:
        content = RENDER_BACKUP_GATE.read_text(encoding="utf-8")

        self.assertIn("--execute-suspend", content)
        self.assertIn("--gates-passed", content)
        self.assertIn("Do not suspend Render before cutover gates pass.", content)


if __name__ == "__main__":
    unittest.main()
