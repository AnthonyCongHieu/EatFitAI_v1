from __future__ import annotations

import argparse
import json
import zipfile
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from common import (
    IMAGE_EXTS,
    decide_source,
    find_data_yaml,
    find_split_dirs,
    image_opens,
    label_for_image,
    list_images,
    normalize_label,
    parse_data_yaml_names,
    read_csv,
    read_label_rows,
    sha256_file,
    summarize_class_counts,
    write_csv,
    write_json,
)


AUDIT_FIELDS = [
    "source_slug",
    "zip_name",
    "package_path",
    "zip_size_bytes",
    "zip_sha256",
    "data_yaml_found",
    "task_type_detected",
    "class_count",
    "class_names_raw",
    "image_count",
    "label_count",
    "missing_label_count",
    "orphan_label_count",
    "empty_label_count",
    "malformed_row_count",
    "detect_row_count",
    "segment_row_count",
    "class_out_of_range_count",
    "bbox_out_of_bounds_count",
    "bbox_too_small_count",
    "bbox_too_large_count",
    "duplicate_exact_label_row_count",
    "duplicate_near_label_row_count_if_computed",
    "images_open_failed_count",
    "instances_per_class",
    "images_per_class",
    "sample_grid_path",
    "decision",
    "decision_reason",
    "text_warnings",
    "extracted_path",
]


def safe_extract_zip(zip_path: Path, dest: Path) -> None:
    dest.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path) as zf:
        for member in zf.infolist():
            target = dest / member.filename
            resolved = target.resolve()
            if not str(resolved).startswith(str(dest.resolve())):
                raise RuntimeError(f"Unsafe zip member path: {member.filename}")
        zf.extractall(dest)


def load_manifest(manifest_path: Path | None, raw_dir: Path | None) -> list[dict[str, str]]:
    if manifest_path is None:
        if raw_dir is None:
            return []
        return [
            {
                "source_slug": zip_path.stem.replace(" ", "_").lower(),
                "drive_zip_name": zip_path.name,
                "initial_decision": "PENDING_AUDIT",
            }
            for zip_path in sorted(raw_dir.glob("*.zip*"))
        ]
    return read_csv(manifest_path)


def source_zip_reference(source: dict[str, str]) -> str:
    return (
        source.get("package_path", "")
        or source.get("drive_zip_name", "")
        or source.get("zip_name", "")
        or source.get("output_name", "")
        or source.get("extracted_path", "")
    )


def is_auditable_manifest_row(source: dict[str, str]) -> bool:
    status = source.get("status", "").strip().lower()
    if status and status not in {"copied", "found"}:
        return False
    decision_text = " ".join(
        source.get(key, "")
        for key in (
            "initial_decision",
            "public_decision",
            "decision",
        )
    ).upper()
    return "QUARANTINE" not in decision_text and "REJECT" not in decision_text


def parse_optional_int(value: object) -> int | None:
    text = str(value or "").strip()
    if not text:
        return None
    try:
        parsed = int(text)
    except ValueError:
        return None
    return parsed if parsed > 0 else None


def parse_bool(value: object) -> bool:
    return str(value or "").strip().lower() in {"1", "true", "yes", "y"}


def list_images_limited(root: Path, limit: int) -> list[Path]:
    images: list[Path] = []
    for path in root.rglob("*"):
        if path.is_file() and path.suffix.lower() in IMAGE_EXTS:
            images.append(path)
            if len(images) >= limit:
                break
    return images


def audit_extracted_tree(
    source: dict[str, str],
    extracted_path: Path,
    package_path: str,
    zip_path: Path | None = None,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    source_slug = source["source_slug"]

    data_yaml = find_data_yaml(extracted_path)
    names, text_warnings = parse_data_yaml_names(data_yaml)
    splits = find_split_dirs(extracted_path)
    audit_image_limit = parse_optional_int(source.get("audit_image_limit"))
    audit_fast_sample = parse_bool(source.get("audit_fast_sample"))
    remaining_images = audit_image_limit

    metrics: dict[str, Any] = {
        "source_slug": source_slug,
        "zip_name": zip_path.name if zip_path else "",
        "package_path": package_path,
        "zip_size_bytes": zip_path.stat().st_size if zip_path else "",
        "zip_sha256": sha256_file(zip_path) if zip_path else "",
        "data_yaml_found": data_yaml is not None,
        "task_type_detected": "unknown",
        "class_count": len(names),
        "class_names_raw": json.dumps(names, ensure_ascii=False),
        "image_count": 0,
        "label_count": 0,
        "missing_label_count": 0,
        "orphan_label_count": 0,
        "empty_label_count": 0,
        "malformed_row_count": 0,
        "detect_row_count": 0,
        "segment_row_count": 0,
        "class_out_of_range_count": 0,
        "bbox_out_of_bounds_count": 0,
        "bbox_too_small_count": 0,
        "bbox_too_large_count": 0,
        "duplicate_exact_label_row_count": 0,
        "duplicate_near_label_row_count_if_computed": "",
        "images_open_failed_count": 0,
        "instances_per_class": "{}",
        "images_per_class": "{}",
        "sample_grid_path": "",
        "decision": "",
        "decision_reason": "",
        "text_warnings": ";".join(sorted(set(text_warnings))),
        "extracted_path": str(extracted_path),
        "audit_image_limit": audit_image_limit or "",
        "audit_image_count_skipped": 0,
        "audit_scope": "full",
        "audit_fast_sample": audit_fast_sample,
    }
    all_rows: list[dict[str, Any]] = []
    label_files_seen: set[Path] = set()
    image_class_sets: defaultdict[str, set[str]] = defaultdict(set)

    for image_dir, label_dir in splits.values():
        if remaining_images is None:
            all_images = list_images(image_dir)
            images = all_images
            labels = sorted(label_dir.rglob("*.txt"))
        else:
            take = max(remaining_images, 0)
            if audit_fast_sample:
                images = list_images_limited(image_dir, take)
                metrics["audit_image_count_skipped"] = ""
            else:
                all_images = list_images(image_dir)
                images = all_images[:take]
                metrics["audit_image_count_skipped"] += max(len(all_images) - len(images), 0)
            remaining_images -= len(images)
            labels = [label_for_image(image, image_dir, label_dir) for image in images if label_for_image(image, image_dir, label_dir).exists()]
        metrics["image_count"] += len(images)
        metrics["label_count"] += len(labels)
        label_files_seen.update(labels)

        image_stems = {image.relative_to(image_dir).with_suffix("").as_posix() for image in images}
        label_stems = {label.relative_to(label_dir).with_suffix("").as_posix() for label in labels}
        if remaining_images is None:
            metrics["orphan_label_count"] += len(label_stems - image_stems)

        for image in images:
            ok, _size = image_opens(image)
            if not ok:
                metrics["images_open_failed_count"] += 1
            label_path = label_for_image(image, image_dir, label_dir)
            if not label_path.exists():
                metrics["missing_label_count"] += 1
                continue
            rows, counts = read_label_rows(label_path, len(names) if names else None)
            if not rows and counts.get("empty", 0) == 0:
                metrics["empty_label_count"] += 1
            seen_rows: set[str] = set()
            for row in rows:
                raw = row["raw"]
                if raw in seen_rows:
                    metrics["duplicate_exact_label_row_count"] += 1
                    continue
                seen_rows.add(raw)
                all_rows.append(row)
                class_name = names.get(row["class_id"], str(row["class_id"]))
                image_class_sets[class_name].add(str(image))
            for key, value in counts.items():
                if key == "malformed":
                    metrics["malformed_row_count"] += value
                elif key == "class_out_of_range":
                    metrics["class_out_of_range_count"] += value
                elif key == "bbox_out_of_bounds":
                    metrics["bbox_out_of_bounds_count"] += value
                elif key == "bbox_too_small":
                    metrics["bbox_too_small_count"] += value
                elif key == "bbox_too_large":
                    metrics["bbox_too_large_count"] += value
                elif key == "detect":
                    metrics["detect_row_count"] += value
                elif key == "segment":
                    metrics["segment_row_count"] += value
                elif key == "empty":
                    metrics["empty_label_count"] += value

    metrics["task_type_detected"] = "mixed_detect_segment" if metrics["segment_row_count"] and metrics["detect_row_count"] else ("segment" if metrics["segment_row_count"] else "detect")
    if audit_image_limit and (audit_fast_sample or metrics["audit_image_count_skipped"]):
        metrics["audit_scope"] = "sampled"
    metrics["instances_per_class"] = json.dumps(summarize_class_counts(all_rows, names), ensure_ascii=False)
    metrics["images_per_class"] = json.dumps({name: len(paths) for name, paths in sorted(image_class_sets.items())}, ensure_ascii=False)
    decision, reason = decide_source(metrics, source.get("initial_decision", ""))
    metrics["decision"] = decision
    metrics["decision_reason"] = reason

    class_candidate_rows = []
    instances = json.loads(metrics["instances_per_class"])
    images = json.loads(metrics["images_per_class"])
    for raw_class_name, count in instances.items():
        class_candidate_rows.append(
            {
                "source_slug": source_slug,
                "raw_class_name": raw_class_name,
                "normalized_class_name": normalize_label(raw_class_name),
                "instances": count,
                "images": images.get(raw_class_name, 0),
                "suggested_canonical_name": "",
                "decision": "REVIEW",
            }
        )
    return metrics, class_candidate_rows


def audit_source(source: dict[str, str], zip_path: Path, extracted_root: Path) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    source_slug = source["source_slug"]
    extracted_path = extracted_root / source_slug
    if not extracted_path.exists():
        safe_extract_zip(zip_path, extracted_path)
    return audit_extracted_tree(source, extracted_path, source_zip_reference(source), zip_path)


def audit_mounted_source(source: dict[str, str], extracted_path: Path) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    return audit_extracted_tree(source, extracted_path, source_zip_reference(source), None)


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit raw YOLO source zips without modifying raw archives.")
    parser.add_argument("--raw-dir", type=Path, default=None)
    parser.add_argument("--manifest", type=Path, default=None)
    parser.add_argument("--work-dir", type=Path, default=Path("_dataset_v2_work"))
    parser.add_argument("--out-dir", type=Path, default=Path("_dataset_v2_reports"))
    args = parser.parse_args()

    raw_dir = args.raw_dir.resolve() if args.raw_dir else None
    sources = load_manifest(args.manifest, raw_dir)
    args.out_dir.mkdir(parents=True, exist_ok=True)
    extracted_root = args.work_dir / "raw_extracted"
    extracted_root.mkdir(parents=True, exist_ok=True)

    audit_rows: list[dict[str, Any]] = []
    inventory_rows: list[dict[str, Any]] = []
    class_candidate_rows: list[dict[str, Any]] = []

    for source in sources:
        if not is_auditable_manifest_row(source):
            inventory_rows.append({**source, "audit_status": "skipped_by_manifest_decision"})
            continue
        extracted_path_text = source.get("extracted_path", "").strip()
        if extracted_path_text:
            extracted_path = Path(extracted_path_text)
            if not extracted_path.exists():
                inventory_rows.append({**source, "audit_status": "missing_extracted_path"})
                continue
            inventory_rows.append({**source, "audit_status": "found", "package_path": extracted_path.as_posix()})
            metrics, class_rows = audit_mounted_source(source, extracted_path)
            audit_rows.append(metrics)
            class_candidate_rows.extend(class_rows)
            continue
        zip_name = source_zip_reference(source)
        if not zip_name or raw_dir is None:
            inventory_rows.append({**source, "audit_status": "missing_local_zip"})
            continue
        zip_path = raw_dir / zip_name
        if not zip_path.exists():
            inventory_rows.append({**source, "audit_status": "missing_local_zip"})
            continue
        inventory_rows.append({**source, "audit_status": "found", "zip_size_bytes": zip_path.stat().st_size})
        metrics, candidates = audit_source(source, zip_path, extracted_root)
        audit_rows.append(metrics)
        class_candidate_rows.extend(candidates)

    write_csv(args.out_dir / "raw_inventory.csv", inventory_rows)
    write_csv(args.out_dir / "source_audit.csv", audit_rows, AUDIT_FIELDS)
    write_json(args.out_dir / "source_audit.json", audit_rows)
    write_csv(
        args.out_dir / "class_candidates.csv",
        class_candidate_rows,
        ["source_slug", "raw_class_name", "normalized_class_name", "instances", "images", "suggested_canonical_name", "decision"],
    )
    print(f"Audited {len(audit_rows)} sources. Reports written to {args.out_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
