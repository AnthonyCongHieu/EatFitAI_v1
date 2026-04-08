#!/usr/bin/env python3
"""Fail on likely mojibake in repo-owned source files."""

from __future__ import annotations

import sys
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
    "bin",
    "obj",
    "dist",
    "build",
    "_state",
    "__pycache__",
}
MOJIBAKE_MARKERS = ("Ã", "â€", "á»", "Ä", "Æ°", "Æ¡", "Æ»", "Æ’")


def should_scan(path: Path) -> bool:
    return path.is_file() and path.suffix.lower() in SOURCE_SUFFIXES and not any(
        part in EXCLUDED_PARTS for part in path.parts
    )


def iter_hits(root: Path):
    for path in root.rglob("*"):
        if not should_scan(path):
            continue

        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue

        for line_no, line in enumerate(text.splitlines(), 1):
            if any(marker in line for marker in MOJIBAKE_MARKERS):
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
