#!/usr/bin/env python3
"""Fail on likely mojibake in repo-owned source files."""

from __future__ import annotations

import sys
from collections.abc import Iterator
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
SCAN_ROOTS = (
    REPO_ROOT / "eatfitai-backend",
    REPO_ROOT / "eatfitai-mobile" / "src",
    REPO_ROOT / "ai-provider",
)
SOURCE_SUFFIXES = {".cs", ".ts", ".tsx", ".js", ".jsx", ".json", ".py"}
EXCLUDED_PARTS = {
    "node_modules",
    ".venv",
    "venv",
    "bin",
    "obj",
    "dist",
    "build",
    "_state",
    "__pycache__",
    "site-packages",
}
MOJIBAKE_MARKERS = ("â€", "á»", "áº", "Ä‘", "Ä", "Æ°", "Æ¡", "Æ»", "Æ’")
REPLACEMENT_CHARACTER = "\ufffd"


def should_scan(path: Path) -> bool:
    return path.is_file() and path.suffix.lower() in SOURCE_SUFFIXES and not any(
        part.casefold() in EXCLUDED_PARTS for part in path.parts
    )


def has_mojibake(text: str) -> bool:
    return REPLACEMENT_CHARACTER in text or any(
        marker in text for marker in MOJIBAKE_MARKERS
    )


def iter_line_hits(text: str) -> Iterator[tuple[int, str]]:
    for line_no, line in enumerate(text.splitlines(), 1):
        if has_mojibake(line):
            yield line_no, line


def iter_hits(root: Path) -> Iterator[tuple[Path, int, str]]:
    for path in root.rglob("*"):
        if not should_scan(path):
            continue

        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue

        for line_no, line in iter_line_hits(text):
            yield path, line_no, line


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    hits = []
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
