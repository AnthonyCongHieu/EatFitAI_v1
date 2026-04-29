from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().with_name("check_dotnet_vulnerabilities.py")
MODULE_SPEC = importlib.util.spec_from_file_location("check_dotnet_vulnerabilities", MODULE_PATH)
check_dotnet_vulnerabilities = importlib.util.module_from_spec(MODULE_SPEC)
assert MODULE_SPEC.loader is not None
MODULE_SPEC.loader.exec_module(check_dotnet_vulnerabilities)


class DotnetVulnerabilityGuardTests(unittest.TestCase):
    def test_collect_vulnerabilities_finds_nested_packages(self) -> None:
        payload = {
            "projects": [
                {
                    "frameworks": [
                        {
                            "topLevelPackages": [
                                {
                                    "id": "Safe.Package",
                                    "resolvedVersion": "1.0.0",
                                    "vulnerabilities": [
                                        {
                                            "severity": "Moderate",
                                            "advisoryUrl": "https://example.test/moderate",
                                        }
                                    ],
                                }
                            ],
                            "transitivePackages": [
                                {
                                    "id": "Risky.Package",
                                    "resolvedVersion": "2.0.0",
                                    "vulnerabilities": [
                                        {
                                            "severity": "High",
                                            "advisoryUrl": "https://example.test/high",
                                        }
                                    ],
                                }
                            ],
                        }
                    ]
                }
            ]
        }

        findings = check_dotnet_vulnerabilities.collect_vulnerabilities(
            payload,
            "eatfitai-backend/EatFitAI.API.csproj",
        )

        self.assertEqual(len(findings), 2)
        self.assertEqual(findings[0]["package"], "Safe.Package")
        self.assertEqual(findings[0]["severity"], "moderate")
        self.assertEqual(findings[1]["package"], "Risky.Package")
        self.assertEqual(findings[1]["severity"], "high")

    def test_collect_vulnerabilities_handles_empty_scan(self) -> None:
        payload = {
            "version": 1,
            "projects": [
                {
                    "path": "eatfitai-backend/EatFitAI.API.csproj",
                }
            ],
        }

        self.assertEqual(
            check_dotnet_vulnerabilities.collect_vulnerabilities(
                payload,
                "eatfitai-backend/EatFitAI.API.csproj",
            ),
            [],
        )


if __name__ == "__main__":
    unittest.main()
