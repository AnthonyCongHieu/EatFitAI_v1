#!/usr/bin/env python3
"""Fail on likely mojibake in repo-owned source files."""

from __future__ import annotations

import sys
import subprocess
from collections.abc import Iterator
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
SCAN_ROOTS = (
    REPO_ROOT / "docs",
    REPO_ROOT / "README.md",
    REPO_ROOT / "SETUP_GUIDE.md",
    REPO_ROOT / "eatfitai-backend",
    REPO_ROOT / "eatfitai-mobile" / "scripts",
    REPO_ROOT / "eatfitai-mobile" / "src",
    REPO_ROOT / "ai-provider",
)
SOURCE_SUFFIXES = {
    ".cs",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".json",
    ".py",
    ".md",
    ".txt",
    ".yml",
    ".yaml",
    ".xml",
    ".props",
    ".targets",
    ".csproj",
    ".sln",
    ".html",
    ".css",
    ".sql",
    ".ps1",
    ".sh",
}
SOURCE_FILENAMES = {"dockerfile", ".gitignore", ".gitattributes"}
EXCLUDED_PARTS = {
    "node_modules",
    ".venv",
    "venv",
    "bin",
    "obj",
    "dist",
    "build",
    "_logs",
    "_state",
    "_tooling",
    "__pycache__",
    "site-packages",
}
ALLOW_MARKER = "mojibake:allow"
MOJIBAKE_MARKERS = tuple(
    marker.encode("utf-8").decode("unicode_escape")
    for marker in (
        r"\u00c3\u00a2\u00e2\u201a\u00ac",
        r"\u00c3\u00a1\u00c2\u00bb",
        r"\u00c3\u00a1\u00c2\u00ba",
        r"\u00c3\u201e\u00e2\u20ac\u02dc",
        r"\u00c3\u201e\u00c2\u0090",
        r"\u00c3\u2020\u00c2\u00b0",
        r"\u00c3\u2020\u00c2\u00a1",
        r"\u00c3\u2020\u00c2\u00bb",
        r"\u00c3\u2020\u00e2\u20ac\u2122",
        r"Kh\u00c3",
        r"\u00c4\u0090",
        r"\u00c4\u2018",
        r"\u00c6\u00b0",
        r"\u00c6\u00a1",
        r"Ti\u00e1\u00ba",
        r"m\u00e1\u00bb\u00a5c ti\u00c3\u00aau",
        r"kh\u00c3\u00b4ng th\u00e1\u00bb\u0192",
        r"\u00c4\u2018\u00c3\u00a3",
        r"\u00e2\u20ac\u2122",
        r"\u00e2\u20ac\u0153",
        r"\u00e2\u20ac\u009d",
        r"\u00e2\u20ac\u201c",
        r"\u00e2\u20ac\u201d",
        r"\u00e2\u20ac\u00a6",
        r"\u00e2\u2020",
        r"\u00e2\u0153",
        r"\u00e2\u0161",
        r"\u00f0\u0178",
        r"\u00e1\u00ba",
        r"\u00e1\u00bb",
    )
)
REPLACEMENT_CHARACTER = "\ufffd"


def should_scan(path: Path) -> bool:
    return (
        path.is_file()
        and (path.suffix.lower() in SOURCE_SUFFIXES or path.name.casefold() in SOURCE_FILENAMES)
        and not any(part.casefold() in EXCLUDED_PARTS for part in path.parts)
    )


def has_mojibake(text: str) -> bool:
    if ALLOW_MARKER in text:
        return False

    return REPLACEMENT_CHARACTER in text or any(marker in text for marker in MOJIBAKE_MARKERS)


def iter_line_hits(text: str) -> Iterator[tuple[int, str]]:
    for line_no, line in enumerate(text.splitlines(), 1):
        if has_mojibake(line):
            yield line_no, line


def iter_hits(root: Path) -> Iterator[tuple[Path, int, str]]:
    paths = (root,) if root.is_file() else root.rglob("*")
    for path in paths:
        if not should_scan(path):
            continue

        try:
            text = path.read_text(encoding="utf-8", errors="strict")
        except UnicodeDecodeError:
            yield path, 0, "<UTF-8 decode error>"
            continue

        if ALLOW_MARKER in text:
            continue

        for line_no, line in iter_line_hits(text):
            yield path, line_no, line


def iter_tracked_paths() -> Iterator[Path]:
    try:
        output = subprocess.check_output(
            ["git", "ls-files"],
            cwd=REPO_ROOT,
            encoding="utf-8",
            errors="strict",
        )
    except (OSError, subprocess.CalledProcessError, UnicodeDecodeError):
        return

    for line in output.splitlines():
        relative = line.strip()
        if relative:
            yield REPO_ROOT / relative


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    hits = []
    tracked_paths = list(iter_tracked_paths())
    if tracked_paths:
        for path in tracked_paths:
            hits.extend(iter_hits(path))
    else:
        for root in SCAN_ROOTS:
            hits.extend(iter_hits(root))

    if not hits:
        print("No mojibake markers found in repo-owned source.")
        return 0

    print("Likely mojibake detected:")
    for path, line_no, line in hits:
        relative_path = path.relative_to(REPO_ROOT)
        print(f"{relative_path}:{line_no}: {line}")
    print(f"Total hits: {len(hits)}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
