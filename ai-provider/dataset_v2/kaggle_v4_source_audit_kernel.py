from __future__ import annotations

import json
import os
import sys
import zipfile
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


KAGGLE_INPUT = Path("/kaggle/input")
REPORT_DIR = Path("/kaggle/working/_eatfitai_v4_source_audit_reports")
REPORTS_ZIP = Path("/kaggle/working/eatfitai_v4_source_audit_reports.zip")
SOURCE_MANIFEST = os.environ.get("EATFITAI_V4_SOURCE_MANIFEST", "clean_v4_external_source_candidates_2026-05-13.csv")
MAX_ANNOTATION_FILE_BYTES = int(os.environ.get("EATFITAI_V4_MAX_ANNOTATION_FILE_MB", "120")) * 1024 * 1024

SKIP_CLASS_DIR_NAMES = {
    "ann_dir",
    "annotations",
    "images",
    "img_dir",
    "labels",
    "masks",
    "test",
    "train",
    "val",
    "valid",
}
SPLIT_ALIASES = {"train": "train", "val": "valid", "valid": "valid", "test": "test"}
SKIP_DECISION_PREFIXES = ("REJECT",)


def find_code_dir(root: Path = KAGGLE_INPUT) -> Path:
    candidates = [Path(__file__).resolve().parent, Path.cwd()]
    if root.exists():
        candidates.extend(
            [
                root / "eatfitai-dataset-v2-pipeline-code",
                root / "datasets" / "hiuinhcng" / "eatfitai-dataset-v2-pipeline-code",
            ]
        )
        candidates.extend(path for path in root.glob("*pipeline-code*") if path.is_dir())
    for candidate in candidates:
        if (candidate / SOURCE_MANIFEST).exists():
            return candidate
    raise FileNotFoundError(f"Could not find {SOURCE_MANIFEST} in cwd or Kaggle inputs")


CODE_DIR = find_code_dir()
if str(CODE_DIR) not in sys.path:
    sys.path.insert(0, str(CODE_DIR))

from audit_sources import audit_mounted_source  # type: ignore  # noqa: E402
from common import (  # type: ignore  # noqa: E402
    IMAGE_EXTS,
    find_data_yaml,
    find_split_dirs,
    normalize_label,
    read_csv,
    write_csv,
    write_json,
)

SOURCE_AUDIT_FIELDS = [
    "dataset_ref",
    "source_slug",
    "title",
    "license",
    "source_format",
    "fit_lane",
    "priority",
    "decision",
    "next_gate",
    "mount_path",
    "status",
    "audit_mode",
    "class_count",
    "image_count",
    "label_count",
    "annotation_file_count",
    "candidate_count",
    "warnings",
]

CLASS_CANDIDATE_FIELDS = [
    "dataset_ref",
    "source_slug",
    "source_format",
    "candidate_origin",
    "raw_class_name",
    "normalized_class_name",
    "instances",
    "images",
    "split_counts_json",
    "suggested_canonical_name",
    "decision",
]


def dataset_ref_slug(dataset_ref: str) -> str:
    return dataset_ref.split("/", 1)[-1].strip()


def source_slug_for_ref(dataset_ref: str) -> str:
    return normalize_label(dataset_ref_slug(dataset_ref))


def mount_candidates_for_ref(dataset_ref: str, root: Path = KAGGLE_INPUT) -> list[Path]:
    owner, slug = dataset_ref.split("/", 1)
    candidates = [
        root / slug,
        root / "datasets" / owner / slug,
        root / "datasets" / dataset_ref,
    ]
    if root.exists():
        candidates.extend(path for path in root.glob(f"*{slug}*") if path.is_dir())
    return candidates


def find_dataset_mount(dataset_ref: str, root: Path = KAGGLE_INPUT) -> Path | None:
    for candidate in mount_candidates_for_ref(dataset_ref, root):
        if candidate.exists() and candidate.is_dir():
            return candidate
    return None


def find_yolo_root(root: Path) -> Path | None:
    candidates = [root]
    candidates.extend(path.parent for path in sorted(root.rglob("data.y*ml")))
    for candidate in candidates:
        has_direct_data_yaml = (candidate / "data.yaml").exists() or (candidate / "data.yml").exists()
        if has_direct_data_yaml and find_split_dirs(candidate):
            return candidate
    return None


def direct_images(directory: Path) -> list[Path]:
    try:
        return sorted(path for path in directory.iterdir() if path.is_file() and path.suffix.lower() in IMAGE_EXTS)
    except OSError:
        return []


def split_for_class_dir(directory: Path) -> str:
    return SPLIT_ALIASES.get(directory.parent.name.lower(), "all")


def iter_imagefolder_class_dirs(root: Path) -> list[Path]:
    class_dirs: list[Path] = []
    for directory in sorted(path for path in root.rglob("*") if path.is_dir()):
        if directory.name.lower() in SKIP_CLASS_DIR_NAMES:
            continue
        if direct_images(directory):
            class_dirs.append(directory)
    return class_dirs


def base_source_row(row: dict[str, str], mount_path: Path | None, status: str, audit_mode: str) -> dict[str, Any]:
    dataset_ref = row.get("dataset_ref", "")
    return {
        "dataset_ref": dataset_ref,
        "source_slug": source_slug_for_ref(dataset_ref),
        "title": row.get("title", ""),
        "license": row.get("license", ""),
        "source_format": row.get("source_format", ""),
        "fit_lane": row.get("fit_lane", ""),
        "priority": row.get("priority", ""),
        "decision": row.get("decision", ""),
        "next_gate": row.get("next_gate", ""),
        "mount_path": mount_path.as_posix() if mount_path else "",
        "status": status,
        "audit_mode": audit_mode,
        "class_count": 0,
        "image_count": 0,
        "label_count": 0,
        "annotation_file_count": 0,
        "candidate_count": 0,
        "warnings": "",
    }


def class_candidate(
    row: dict[str, str],
    raw_class_name: str,
    images: int,
    instances: int,
    split_counts: dict[str, int] | None,
    candidate_origin: str,
) -> dict[str, Any]:
    return {
        "dataset_ref": row.get("dataset_ref", ""),
        "source_slug": source_slug_for_ref(row.get("dataset_ref", "")),
        "source_format": row.get("source_format", ""),
        "candidate_origin": candidate_origin,
        "raw_class_name": raw_class_name,
        "normalized_class_name": normalize_label(raw_class_name),
        "instances": instances,
        "images": images,
        "split_counts_json": json.dumps(split_counts or {}, ensure_ascii=False, sort_keys=True),
        "suggested_canonical_name": "",
        "decision": "REVIEW",
    }


def audit_classification_imagefolder_source(row: dict[str, str], mount_path: Path) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    stats: dict[str, dict[str, Any]] = defaultdict(lambda: {"images": 0, "splits": Counter()})
    for class_dir in iter_imagefolder_class_dirs(mount_path):
        images = direct_images(class_dir)
        raw_class_name = class_dir.name
        split_name = split_for_class_dir(class_dir)
        stats[raw_class_name]["images"] += len(images)
        stats[raw_class_name]["splits"][split_name] += len(images)

    candidates = [
        class_candidate(
            row,
            raw_class_name=class_name,
            images=int(values["images"]),
            instances=int(values["images"]),
            split_counts=dict(values["splits"]),
            candidate_origin="classification_pseudo_box_review",
        )
        for class_name, values in sorted(stats.items(), key=lambda item: normalize_label(item[0]))
        if int(values["images"]) > 0
    ]
    source_row = base_source_row(row, mount_path, "audited", "classification_imagefolder")
    source_row["class_count"] = len(candidates)
    source_row["image_count"] = sum(int(candidate["images"]) for candidate in candidates)
    source_row["candidate_count"] = len(candidates)
    if not candidates:
        source_row["warnings"] = "no_imagefolder_class_dirs_found"
    return source_row, candidates


def enrich_yolo_candidates(row: dict[str, str], candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
    enriched: list[dict[str, Any]] = []
    for candidate in candidates:
        enriched.append(
            {
                "dataset_ref": row.get("dataset_ref", ""),
                "source_slug": source_slug_for_ref(row.get("dataset_ref", "")),
                "source_format": row.get("source_format", ""),
                "candidate_origin": "yolo_detection",
                "raw_class_name": candidate.get("raw_class_name", ""),
                "normalized_class_name": normalize_label(candidate.get("raw_class_name", "")),
                "instances": candidate.get("instances", 0),
                "images": candidate.get("images", 0),
                "split_counts_json": "{}",
                "suggested_canonical_name": "",
                "decision": "REVIEW",
            }
        )
    return enriched


def audit_yolo_source(row: dict[str, str], mount_path: Path, yolo_root: Path) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    source_slug = source_slug_for_ref(row.get("dataset_ref", ""))
    metrics, candidates = audit_mounted_source(
        {
            "source_slug": source_slug,
            "extracted_path": yolo_root.as_posix(),
            "initial_decision": "REVIEW",
        },
        yolo_root,
    )
    source_row = base_source_row(row, mount_path, "audited", "yolo_detection")
    source_row["class_count"] = metrics.get("class_count", 0)
    source_row["image_count"] = metrics.get("image_count", 0)
    source_row["label_count"] = metrics.get("label_count", 0)
    source_row["candidate_count"] = len(candidates)
    source_row["warnings"] = metrics.get("text_warnings", "")
    return source_row, enrich_yolo_candidates(row, candidates)


def count_images_under(root: Path) -> int:
    return sum(1 for path in root.rglob("*") if path.is_file() and path.suffix.lower() in IMAGE_EXTS)


def annotation_files(root: Path) -> list[Path]:
    return sorted(
        path
        for path in root.rglob("*")
        if path.is_file() and path.suffix.lower() in {".json", ".csv", ".txt"} and path.stat().st_size <= MAX_ANNOTATION_FILE_BYTES
    )


def collect_category_names_from_json(value: Any, counts: Counter[str]) -> None:
    if isinstance(value, dict):
        if isinstance(value.get("categories"), list):
            for item in value["categories"]:
                if isinstance(item, dict) and item.get("name"):
                    counts[str(item["name"])] += 1
        for key in ("category_name", "class_name", "label", "name"):
            raw = value.get(key)
            if isinstance(raw, str) and 1 <= len(raw) <= 80:
                counts[raw] += 1
        for child in value.values():
            if isinstance(child, (dict, list)):
                collect_category_names_from_json(child, counts)
    elif isinstance(value, list):
        for child in value[:200000]:
            collect_category_names_from_json(child, counts)


def audit_annotation_or_file_pool_source(row: dict[str, str], mount_path: Path) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    files = annotation_files(mount_path)
    category_counts: Counter[str] = Counter()
    warnings: list[str] = []
    for path in files:
        if path.suffix.lower() != ".json":
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8-sig", errors="replace"))
        except Exception as exc:
            warnings.append(f"json_parse_failed:{path.name}:{type(exc).__name__}")
            continue
        collect_category_names_from_json(data, category_counts)

    image_count = count_images_under(mount_path)
    candidates = [
        class_candidate(
            row,
            raw_class_name=name,
            images=0,
            instances=count,
            split_counts={},
            candidate_origin="annotation_category_review",
        )
        for name, count in sorted(category_counts.items(), key=lambda item: normalize_label(item[0]))
    ]
    source_row = base_source_row(row, mount_path, "audited", "annotation_or_file_pool")
    source_row["class_count"] = len(candidates)
    source_row["image_count"] = image_count
    source_row["annotation_file_count"] = len(files)
    source_row["candidate_count"] = len(candidates)
    source_row["warnings"] = "|".join(warnings[:20])
    if not candidates:
        source_row["warnings"] = "|".join([source_row["warnings"], "no_category_names_found"]).strip("|")
    return source_row, candidates


def audit_segmentation_source(row: dict[str, str], mount_path: Path) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    image_count = count_images_under(mount_path)
    files = annotation_files(mount_path)
    source_row = base_source_row(row, mount_path, "audited", "semantic_segmentation_pending_mask_to_bbox")
    source_row["image_count"] = image_count
    source_row["annotation_file_count"] = len(files)
    source_row["warnings"] = "mask_to_bbox_adapter_required"
    return source_row, []


def audit_source(row: dict[str, str], root: Path = KAGGLE_INPUT) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    decision = row.get("decision", "")
    if decision.startswith(SKIP_DECISION_PREFIXES):
        return base_source_row(row, None, "skipped_by_decision", "none"), []

    dataset_ref = row.get("dataset_ref", "")
    mount_path = find_dataset_mount(dataset_ref, root)
    if mount_path is None:
        return base_source_row(row, None, "missing_mount", "none"), []

    yolo_root = find_yolo_root(mount_path)
    source_format = row.get("source_format", "").lower()
    if yolo_root is not None and ("yolo" in source_format or "detection" in source_format or "object_detection" in source_format):
        return audit_yolo_source(row, mount_path, yolo_root)
    if "classification" in source_format or "imagefolder" in source_format:
        return audit_classification_imagefolder_source(row, mount_path)
    if "segmentation" in source_format:
        return audit_segmentation_source(row, mount_path)
    if yolo_root is not None:
        return audit_yolo_source(row, mount_path, yolo_root)
    return audit_annotation_or_file_pool_source(row, mount_path)


def zip_reports(report_dir: Path, out_zip: Path) -> None:
    with zipfile.ZipFile(out_zip, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for path in sorted(report_dir.rglob("*")):
            if path.is_file():
                zf.write(path, path.relative_to(report_dir.parent))


def main() -> int:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    manifest = read_csv(CODE_DIR / SOURCE_MANIFEST)
    source_rows: list[dict[str, Any]] = []
    class_rows: list[dict[str, Any]] = []
    for row in manifest:
        source_row, candidates = audit_source(row)
        source_rows.append(source_row)
        class_rows.extend(candidates)

    write_csv(REPORT_DIR / "v4_source_audit.csv", source_rows, SOURCE_AUDIT_FIELDS)
    write_csv(REPORT_DIR / "class_candidates_v4.csv", class_rows, CLASS_CANDIDATE_FIELDS)
    summary = {
        "source_count": len(source_rows),
        "audited_source_count": sum(1 for row in source_rows if row.get("status") == "audited"),
        "missing_mount_count": sum(1 for row in source_rows if row.get("status") == "missing_mount"),
        "candidate_class_rows": len(class_rows),
        "total_candidate_images": sum(int(row.get("images") or 0) for row in class_rows),
        "audit_modes": dict(Counter(str(row.get("audit_mode", "")) for row in source_rows)),
    }
    write_json(REPORT_DIR / "v4_source_audit_summary.json", summary)
    zip_reports(REPORT_DIR, REPORTS_ZIP)
    print(json.dumps(summary, ensure_ascii=False, indent=2), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
