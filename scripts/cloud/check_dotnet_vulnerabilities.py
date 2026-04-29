#!/usr/bin/env python3
"""Fail on high/critical NuGet vulnerabilities for backend projects."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
PROJECTS = (
    REPO_ROOT / "eatfitai-backend" / "EatFitAI.API.csproj",
    REPO_ROOT / "eatfitai-backend" / "EatFitAI.API.Tests.csproj",
)
BLOCKING_SEVERITIES = {"high", "critical"}


def run_dotnet_vulnerability_scan(project_path: Path) -> dict[str, Any]:
    result = subprocess.run(
        [
            "dotnet",
            "list",
            str(project_path),
            "package",
            "--vulnerable",
            "--include-transitive",
            "--format",
            "json",
        ],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        raise RuntimeError(
            f"dotnet vulnerability scan failed for {project_path}: "
            f"{result.stderr.strip() or result.stdout.strip()}"
        )

    return json.loads(result.stdout or "{}")


def collect_vulnerabilities(value: Any, project: str) -> list[dict[str, str]]:
    findings: list[dict[str, str]] = []

    if isinstance(value, dict):
        vulnerabilities = value.get("vulnerabilities")
        if isinstance(vulnerabilities, list):
            package_name = str(value.get("id") or value.get("name") or "<unknown>")
            resolved_version = str(value.get("resolvedVersion") or value.get("version") or "")
            for vulnerability in vulnerabilities:
                if not isinstance(vulnerability, dict):
                    continue

                findings.append(
                    {
                        "project": project,
                        "package": package_name,
                        "version": resolved_version,
                        "severity": str(vulnerability.get("severity") or "").lower(),
                        "advisoryUrl": str(
                            vulnerability.get("advisoryUrl")
                            or vulnerability.get("advisoryurl")
                            or vulnerability.get("url")
                            or ""
                        ),
                    }
                )

        for nested in value.values():
            findings.extend(collect_vulnerabilities(nested, project))

    elif isinstance(value, list):
        for item in value:
            findings.extend(collect_vulnerabilities(item, project))

    return findings


def scan_projects(projects: tuple[Path, ...] = PROJECTS) -> list[dict[str, str]]:
    findings: list[dict[str, str]] = []
    for project_path in projects:
        payload = run_dotnet_vulnerability_scan(project_path)
        findings.extend(collect_vulnerabilities(payload, str(project_path.relative_to(REPO_ROOT))))

    return findings


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    findings = scan_projects()
    blocking = [
        finding for finding in findings if finding["severity"].casefold() in BLOCKING_SEVERITIES
    ]

    if blocking:
        print("Blocking NuGet vulnerabilities found:")
        for finding in blocking:
            version = f" {finding['version']}" if finding["version"] else ""
            advisory = f" {finding['advisoryUrl']}" if finding["advisoryUrl"] else ""
            print(
                f"- {finding['project']}: {finding['package']}{version} "
                f"severity={finding['severity']}{advisory}"
            )
        return 1

    print(
        f"No high/critical NuGet vulnerabilities found "
        f"({len(findings)} total lower-severity finding(s))."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
