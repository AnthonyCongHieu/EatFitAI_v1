from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from evaluate_golden_set import resolve_rollback_model_path


DEFAULT_PRIMARY_CONFIDENCES = [0.05, 0.08, 0.15, 0.25, 0.40]
DEFAULT_RECOVERY_CONFIDENCES = [0.05]
DEFAULT_RECOVERY_IMAGE_SIZES = [320, 640]


@dataclass(frozen=True)
class SweepCandidate:
    primary_confidence: float
    recovery_confidence: float
    recovery_image_size: int

    @property
    def slug(self) -> str:
        primary = str(self.primary_confidence).replace(".", "p")
        recovery = str(self.recovery_confidence).replace(".", "p")
        return f"primary_{primary}__recovery_{recovery}__size_{self.recovery_image_size}"


def parse_float_list(raw: str) -> list[float]:
    values = [float(item.strip()) for item in raw.split(",") if item.strip()]
    if not values:
        raise argparse.ArgumentTypeError("at least one float value is required")
    return values


def parse_int_list(raw: str) -> list[int]:
    values = [int(item.strip()) for item in raw.split(",") if item.strip()]
    if not values:
        raise argparse.ArgumentTypeError("at least one integer value is required")
    return values


def resolve_old_model_path(repo_root: Path, requested: Path) -> Path:
    return resolve_rollback_model_path(repo_root, requested)


def build_candidates(
    primary_confidences: list[float],
    recovery_confidences: list[float],
    recovery_image_sizes: list[int],
) -> list[SweepCandidate]:
    return [
        SweepCandidate(primary, recovery, image_size)
        for primary in primary_confidences
        for recovery in recovery_confidences
        for image_size in recovery_image_sizes
    ]


def command_for_candidate(
    candidate: SweepCandidate,
    *,
    python_executable: str,
    repo_root: Path,
    old_model: Path,
    manifest: Path,
    out_dir: Path,
    min_images: int,
    min_new_hit_rate: float,
    max_new_empty_rate: float,
    max_regression_rate: float,
) -> tuple[list[str], dict[str, str], Path, Path]:
    report_path = out_dir / f"golden_eval_runtime_{candidate.slug}.json"
    errors_path = out_dir / f"golden_eval_runtime_{candidate.slug}_errors.csv"
    env = {
        "YOLO_CONFIDENCE_THRESHOLD": str(candidate.primary_confidence),
        "YOLO_RECOVERY_CONFIDENCE_THRESHOLD": str(candidate.recovery_confidence),
        "YOLO_RECOVERY_IMAGE_SIZE": str(candidate.recovery_image_size),
        "YOLO_GEMINI_VISION_FALLBACK_ENABLED": "false",
    }
    command = [
        python_executable,
        str(repo_root / "ai-provider" / "dataset_v2" / "evaluate_golden_set.py"),
        "--old-model",
        str(old_model),
        "--new-runtime-provider",
        "--manifest",
        str(manifest),
        "--out",
        str(report_path),
        "--errors-out",
        str(errors_path),
        "--min-images",
        str(min_images),
        "--min-new-hit-rate",
        str(min_new_hit_rate),
        "--max-new-empty-rate",
        str(max_new_empty_rate),
        "--max-regression-rate",
        str(max_regression_rate),
    ]
    return command, env, report_path, errors_path


def result_row(candidate: SweepCandidate, report_path: Path, errors_path: Path) -> dict[str, Any]:
    payload = json.loads(report_path.read_text(encoding="utf-8"))
    overall = payload["summary"]["overall"]
    decision = payload["decision"]
    return {
        "candidate": {
            "primary_confidence": candidate.primary_confidence,
            "recovery_confidence": candidate.recovery_confidence,
            "recovery_image_size": candidate.recovery_image_size,
        },
        "decision_status": decision["status"],
        "gates": decision["gates"],
        "overall": overall,
        "report": str(report_path),
        "errors": str(errors_path),
    }


def sort_key(row: dict[str, Any]) -> tuple[int, float, float, float, float]:
    status_rank = 0 if row["decision_status"] == "promote_yolo11m_clean_v1" else 1
    overall = row["overall"]
    return (
        status_rank,
        -float(overall["new_hit_rate"]),
        float(overall["new_empty_image_rate"]),
        float(overall["regression_rate"]),
        -float(overall["hit_rate_delta"]),
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Sweep YOLO11 runtime confidence/recovery settings.")
    parser.add_argument("--repo-root", type=Path, default=Path.cwd())
    parser.add_argument("--old-model", type=Path, default=Path("ai-provider/model_backups/yolov8_rollback/best.pt"))
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--out-dir", type=Path, default=Path("_dataset_v2_reports/runtime_threshold_sweep"))
    parser.add_argument("--summary-out", type=Path, default=Path("_dataset_v2_reports/runtime_threshold_sweep_summary.json"))
    parser.add_argument("--python", dest="python_executable", default=sys.executable)
    parser.add_argument("--primary-conf", type=parse_float_list, default=DEFAULT_PRIMARY_CONFIDENCES)
    parser.add_argument("--recovery-conf", type=parse_float_list, default=DEFAULT_RECOVERY_CONFIDENCES)
    parser.add_argument("--recovery-size", type=parse_int_list, default=DEFAULT_RECOVERY_IMAGE_SIZES)
    parser.add_argument("--min-images", type=int, default=300)
    parser.add_argument("--min-new-hit-rate", type=float, default=0.72)
    parser.add_argument("--max-new-empty-rate", type=float, default=0.08)
    parser.add_argument("--max-regression-rate", type=float, default=0.10)
    args = parser.parse_args()

    repo_root = args.repo_root.resolve()
    old_model = resolve_old_model_path(repo_root, args.old_model)
    manifest = (repo_root / args.manifest).resolve() if not args.manifest.is_absolute() else args.manifest
    out_dir = (repo_root / args.out_dir).resolve() if not args.out_dir.is_absolute() else args.out_dir
    summary_out = (repo_root / args.summary_out).resolve() if not args.summary_out.is_absolute() else args.summary_out
    out_dir.mkdir(parents=True, exist_ok=True)
    summary_out.parent.mkdir(parents=True, exist_ok=True)

    rows = []
    for candidate in build_candidates(args.primary_conf, args.recovery_conf, args.recovery_size):
        command, env_overrides, report_path, errors_path = command_for_candidate(
            candidate,
            python_executable=args.python_executable,
            repo_root=repo_root,
            old_model=old_model,
            manifest=manifest,
            out_dir=out_dir,
            min_images=args.min_images,
            min_new_hit_rate=args.min_new_hit_rate,
            max_new_empty_rate=args.max_new_empty_rate,
            max_regression_rate=args.max_regression_rate,
        )
        env = {**os.environ, **env_overrides}
        subprocess.run(command, cwd=repo_root, env=env, check=True)
        rows.append(result_row(candidate, report_path, errors_path))

    rows.sort(key=sort_key)
    summary = {
        "manifest": str(manifest),
        "old_model": str(old_model),
        "recommendation": rows[0] if rows else None,
        "results": rows,
    }
    summary_out.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary["recommendation"], ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
