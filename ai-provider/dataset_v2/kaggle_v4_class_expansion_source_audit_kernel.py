from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path
from typing import Any


def find_base_code_dir(root: Path = Path("/kaggle/input")) -> Path:
    candidates = [
        Path(__file__).resolve().parent,
        Path.cwd(),
        root / "eatfitai-dataset-v2-pipeline-code",
        root / "datasets" / "hiuinhcng" / "eatfitai-dataset-v2-pipeline-code",
    ]
    for candidate in candidates:
        if (candidate / "kaggle_v4_source_audit_kernel.py").exists():
            return candidate
    if root.exists():
        for path in root.rglob("kaggle_v4_source_audit_kernel.py"):
            return path.parent
    return Path(__file__).resolve().parent


BASE_CODE_DIR = find_base_code_dir()
if str(BASE_CODE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_CODE_DIR))

import kaggle_v4_source_audit_kernel as base  # noqa: E402


REPORT_DIR = Path("/kaggle/working/_eatfitai_v4_class_expansion_audit_reports")
REPORTS_ZIP = Path("/kaggle/working/eatfitai_v4_class_expansion_audit_reports.zip")
SOURCE_MANIFEST = os.environ.get(
    "EATFITAI_V4_CLASS_EXPANSION_SOURCE_MANIFEST",
    "clean_v4_class_expansion_source_candidates_2026-05-14.csv",
)
MAX_RUNTIME_SECONDS = int(os.environ.get("EATFITAI_V4_CLASS_EXPANSION_AUDIT_MAX_SECONDS", "18000"))


def write_reports(
    source_rows: list[dict[str, Any]],
    class_rows: list[dict[str, Any]],
    completed_all_sources: bool,
    stopped_reason: str = "",
) -> dict[str, Any]:
    summary = base.write_report_bundle(
        REPORT_DIR,
        REPORTS_ZIP,
        source_rows,
        class_rows,
        completed_all_sources=completed_all_sources,
        stopped_reason=stopped_reason,
    )
    summary["kernel_kind"] = "v4_class_expansion_source_audit"
    summary["source_manifest"] = SOURCE_MANIFEST
    base.write_json(REPORT_DIR / "v4_source_audit_summary.json", summary)
    base.zip_reports(REPORT_DIR, REPORTS_ZIP)
    return summary


def main() -> int:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    manifest = base.read_csv(base.CODE_DIR / SOURCE_MANIFEST)
    source_rows: list[dict[str, Any]] = []
    class_rows: list[dict[str, Any]] = []
    completed_all_sources = True
    stopped_reason = ""
    started_at = time.monotonic()

    for index, row in enumerate(manifest, start=1):
        elapsed = time.monotonic() - started_at
        if source_rows and elapsed >= MAX_RUNTIME_SECONDS:
            completed_all_sources = False
            stopped_reason = f"time_guard_after_{len(source_rows)}_sources"
            for pending in manifest[index - 1 :]:
                source_rows.append(base.base_source_row(pending, None, "time_guard_pending", "none"))
            break

        dataset_ref = row.get("dataset_ref", "")
        print(f"V4_CLASS_EXPANSION_AUDIT_PROGRESS {index}/{len(manifest)} {dataset_ref}", flush=True)
        try:
            source_row, candidates = base.audit_source(row)
        except Exception as exc:
            source_row = base.base_source_row(row, None, "audit_error", "none")
            source_row["warnings"] = f"{type(exc).__name__}:{exc}"
            candidates = []
        source_rows.append(source_row)
        class_rows.extend(candidates)
        write_reports(source_rows, class_rows, completed_all_sources=False)

    summary = write_reports(
        source_rows,
        class_rows,
        completed_all_sources=completed_all_sources,
        stopped_reason=stopped_reason,
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
