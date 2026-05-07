from __future__ import annotations

import argparse
import csv
import json
import math
import random
import shutil
from collections import Counter
from pathlib import Path
from typing import Any

from common import (
    dump_yaml,
    find_data_yaml,
    find_split_dirs,
    image_opens,
    label_for_image,
    list_images,
    load_yaml,
    normalize_label,
    parse_data_yaml_names,
    read_label_rows,
    sha256_file,
    write_csv,
)
from audit_sources import safe_extract_zip, source_zip_reference

ACTIVE_DECISIONS = {"ACCEPT_FULL", "ACCEPT_FILTERED", "CHERRY_PICK"}
TRUTHY = {"1", "true", "yes", "y"}
NONCOMMERCIAL_LANES = {"noncommercial_only", "license_risk_noncommercial"}
DEFAULT_MIN_FREE_BYTES_AFTER_BUILD = 2 * 1024 * 1024 * 1024


def load_source_policy(policy_path: Path) -> dict[str, dict[str, str]]:
    with policy_path.open("r", encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))
    policy: dict[str, dict[str, str]] = {}
    for row in rows:
        slug = (row.get("source_slug") or "").strip()
        if slug:
            policy[slug] = row
    return policy


def should_include_source_policy(row: dict[str, str], include_noncommercial: bool = False) -> bool:
    include = (row.get("include_in_default_clean") or "").strip().lower()
    if include not in TRUTHY:
        return False
    license_lane = (row.get("license_lane") or "").strip().lower()
    if license_lane in NONCOMMERCIAL_LANES and not include_noncommercial:
        return False
    return True


def filter_audit_rows_by_policy(
    audit_rows: list[dict[str, Any]],
    policy: dict[str, dict[str, str]],
    include_noncommercial: bool = False,
) -> list[dict[str, Any]]:
    if not policy:
        return audit_rows

    filtered: list[dict[str, Any]] = []
    for source in audit_rows:
        row = policy.get(str(source.get("source_slug") or ""))
        if not row or not should_include_source_policy(row, include_noncommercial=include_noncommercial):
            continue
        merged = dict(source)
        for key in (
            "clean_lane",
            "license_lane",
            "source_weight_cap",
            "required_filters",
            "reason",
        ):
            if key in row:
                merged[key] = row.get(key, "")
        filtered.append(merged)
    return filtered


def taxonomy_classes(taxonomy: dict[str, Any]) -> list[str]:
    classes = taxonomy.get("classes") or taxonomy.get("final_classes") or taxonomy.get("canonical_classes")
    if isinstance(classes, dict):
        return [str(classes[key]) for key in sorted(classes, key=lambda value: int(value))]
    if isinstance(classes, list):
        return [str(item) for item in classes]
    raise RuntimeError("Final taxonomy must contain classes, final_classes, or canonical_classes.")


def alias_map(taxonomy: dict[str, Any], classes: list[str]) -> dict[str, str]:
    mapping = {normalize_label(name): name for name in classes}
    for canonical, aliases in (taxonomy.get("aliases") or {}).items():
        canonical_slug = normalize_label(canonical)
        canonical_name = canonical if canonical in classes else mapping.get(canonical_slug, canonical_slug)
        mapping[canonical_slug] = canonical_name
        for alias in aliases or []:
            mapping[normalize_label(alias)] = canonical_name
    return mapping


def parse_audit_class_names(source: dict[str, Any]) -> dict[int, str]:
    raw = source.get("class_names_raw", {})
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except json.JSONDecodeError:
            return {}
    if isinstance(raw, list):
        return {idx: str(name) for idx, name in enumerate(raw)}
    if isinstance(raw, dict):
        parsed: dict[int, str] = {}
        for key, value in raw.items():
            try:
                parsed[int(key)] = str(value)
            except (TypeError, ValueError):
                continue
        return dict(sorted(parsed.items()))
    return {}


def split_for_hash(image_hash: str) -> str:
    value = int(image_hash[:12], 16) % 100
    if value < 85:
        return "train"
    if value < 95:
        return "valid"
    return "test"


def parse_source_weight_cap(value: Any) -> float | None:
    try:
        cap = float(str(value or "").strip())
    except (TypeError, ValueError):
        return None
    if cap < 0:
        return 0.0
    if cap > 1:
        return 1.0
    return cap


def cap_records_by_source(records: list[dict[str, Any]], max_images: int | None) -> list[dict[str, Any]]:
    if max_images is None or max_images <= 0 or len(records) <= max_images:
        return records

    selected: list[dict[str, Any]] = []
    source_counts: Counter[str] = Counter()
    source_limits: dict[str, int] = {}
    for record in records:
        source_slug = str(record.get("source_slug") or "")
        if source_slug in source_limits:
            continue
        cap = parse_source_weight_cap(record.get("source_weight_cap"))
        if cap is not None:
            source_limits[source_slug] = math.ceil(max_images * cap)

    for record in records:
        source_slug = str(record.get("source_slug") or "")
        limit = source_limits.get(source_slug)
        if limit is not None and source_counts[source_slug] >= limit:
            continue
        selected.append(record)
        source_counts[source_slug] += 1
        if len(selected) >= max_images:
            break
    return selected


def require_output_disk_space(out_dataset: Path, records: list[dict[str, Any]], min_free_bytes_after_build: int) -> None:
    if not records:
        return
    out_dataset.parent.mkdir(parents=True, exist_ok=True)
    usage = shutil.disk_usage(out_dataset.parent)
    estimated_image_bytes = sum(Path(record["image_path"]).stat().st_size for record in records)
    estimated_label_bytes = sum(max(64, len(record["rows"]) * 64) for record in records)
    estimated_manifest_bytes = max(4096, len(records) * 256)
    estimated_total_bytes = estimated_image_bytes + estimated_label_bytes + estimated_manifest_bytes
    required_free_bytes = estimated_total_bytes + min_free_bytes_after_build
    if usage.free < required_free_bytes:
        raise RuntimeError(
            "clean_output_disk_preflight_failed:"
            f" free_bytes={usage.free}"
            f" estimated_output_bytes={estimated_total_bytes}"
            f" min_free_bytes_after_build={min_free_bytes_after_build}"
            f" selected_images={len(records)}"
        )


def ensure_extracted_sources(audit_rows: list[dict[str, Any]], raw_dir: Path | None, work_dir: Path) -> None:
    if raw_dir is None:
        return
    extracted_root = work_dir / "raw_extracted"
    extracted_root.mkdir(parents=True, exist_ok=True)
    for source in audit_rows:
        if source.get("decision") not in ACTIVE_DECISIONS:
            continue
        current_root = Path(source.get("extracted_path", ""))
        if current_root.exists():
            continue
        zip_name = source_zip_reference(source)
        if not zip_name:
            continue
        zip_path = raw_dir / zip_name
        if not zip_path.exists():
            continue
        extracted_path = extracted_root / source["source_slug"]
        safe_extract_zip(zip_path, extracted_path)
        source["extracted_path"] = str(extracted_path)


def clean_dataset(
    audit_rows: list[dict[str, Any]],
    taxonomy: dict[str, Any],
    out_dataset: Path,
    out_reports: Path,
    max_images: int | None = None,
    min_free_bytes_after_build: int = DEFAULT_MIN_FREE_BYTES_AFTER_BUILD,
    progress_interval: int = 1000,
) -> dict[str, Any]:
    classes = taxonomy_classes(taxonomy)
    class_to_id = {name: idx for idx, name in enumerate(classes)}
    aliases = alias_map(taxonomy, classes)
    records: list[dict[str, Any]] = []
    seen_hashes: set[str] = set()
    before_counter: Counter[str] = Counter()
    after_counter: Counter[str] = Counter()
    duplicate_rows: list[dict[str, Any]] = []
    issue_rows: list[dict[str, Any]] = []

    for source in audit_rows:
        if source.get("decision") not in ACTIVE_DECISIONS:
            continue
        source_slug = source["source_slug"]
        source_weight_cap = source.get("source_weight_cap")
        source_seen_images = 0
        source_retained_images = 0
        root = Path(source.get("extracted_path", ""))
        if not root.exists():
            issue_rows.append({"source_slug": source_slug, "issue": "extracted_path_missing", "path": str(root)})
            continue
        print(f"Clean build scanning source {source_slug}: {root}", flush=True)
        names, _warnings = parse_data_yaml_names(find_data_yaml(root))
        if not names:
            names = parse_audit_class_names(source)
        for image_dir, label_dir in find_split_dirs(root).values():
            for image_path in list_images(image_dir):
                source_seen_images += 1
                ok, _size = image_opens(image_path)
                if not ok:
                    issue_rows.append({"source_slug": source_slug, "image_path": str(image_path), "issue": "image_open_failed"})
                    continue
                label_path = label_for_image(image_path, image_dir, label_dir)
                if not label_path.exists():
                    issue_rows.append({"source_slug": source_slug, "image_path": str(image_path), "issue": "missing_label"})
                    continue
                parsed_rows, counts = read_label_rows(label_path, len(names) if names else None)
                for kind, count in counts.items():
                    if kind not in {"detect", "segment", "empty"} and count:
                        issue_rows.append({"source_slug": source_slug, "image_path": str(image_path), "issue": kind, "count": count})
                clean_rows: list[tuple[int, list[float]]] = []
                seen_label_rows: set[tuple[int, str]] = set()
                for row in parsed_rows:
                    raw_class_name = names.get(row["class_id"], str(row["class_id"]))
                    before_counter[raw_class_name] += 1
                    canonical = aliases.get(normalize_label(raw_class_name))
                    if canonical not in class_to_id:
                        continue
                    new_id = class_to_id[canonical]
                    bbox = [round(float(value), 6) for value in row["bbox"]]
                    key = (new_id, " ".join(f"{value:.6f}" for value in bbox))
                    if key in seen_label_rows:
                        duplicate_rows.append({"source_slug": source_slug, "image_path": str(image_path), "class_id": new_id, "bbox": key[1]})
                        continue
                    seen_label_rows.add(key)
                    clean_rows.append((new_id, bbox))
                    after_counter[canonical] += 1
                if not clean_rows:
                    issue_rows.append({"source_slug": source_slug, "image_path": str(image_path), "issue": "no_retained_labels"})
                    continue
                image_hash = sha256_file(image_path)
                if image_hash in seen_hashes:
                    duplicate_rows.append({"source_slug": source_slug, "image_path": str(image_path), "issue": "duplicate_image_hash"})
                    continue
                seen_hashes.add(image_hash)
                source_retained_images += 1
                records.append(
                    {
                        "source_slug": source_slug,
                        "source_weight_cap": source_weight_cap,
                        "image_path": image_path,
                        "rows": clean_rows,
                        "image_hash": image_hash,
                    }
                )
        print(
            f"Clean build source scanned {source_slug}: seen_images={source_seen_images} retained_candidates={source_retained_images}",
            flush=True,
        )

    random.Random(20260504).shuffle(records)
    uncapped_image_count = len(records)
    records = cap_records_by_source(records, max_images)
    print(
        f"Clean build output selection: uncapped_images={uncapped_image_count} selected_images={len(records)} max_images={max_images or ''}",
        flush=True,
    )
    require_output_disk_space(out_dataset, records, min_free_bytes_after_build)
    for split in ("train", "valid", "test"):
        (out_dataset / split / "images").mkdir(parents=True, exist_ok=True)
        (out_dataset / split / "labels").mkdir(parents=True, exist_ok=True)

    manifest_path = out_dataset / "manifest.jsonl"
    output_counter: Counter[str] = Counter()
    with manifest_path.open("w", encoding="utf-8") as manifest:
        for index, record in enumerate(records, start=1):
            split = split_for_hash(record["image_hash"])
            src: Path = record["image_path"]
            dst_stem = f"{record['source_slug']}_{record['image_hash'][:16]}"
            dst_img = out_dataset / split / "images" / f"{dst_stem}{src.suffix.lower()}"
            dst_label = out_dataset / split / "labels" / f"{dst_stem}.txt"
            shutil.copy2(src, dst_img)
            label_lines = [f"{class_id} {' '.join(f'{value:.6f}' for value in bbox)}" for class_id, bbox in record["rows"]]
            dst_label.write_text("\n".join(label_lines) + "\n", encoding="utf-8")
            for class_id, _bbox in record["rows"]:
                output_counter[classes[class_id]] += 1
            manifest.write(
                json.dumps(
                    {
                        "split": split,
                        "source_slug": record["source_slug"],
                        "image": str(dst_img),
                        "label": str(dst_label),
                        "image_hash": record["image_hash"],
                        "is_background": False,
                    },
                    ensure_ascii=False,
                )
                + "\n"
            )
            if progress_interval > 0 and index % progress_interval == 0:
                print(f"Clean build copied output images: {index}/{len(records)}", flush=True)
    print(f"Clean build copied output images: {len(records)}/{len(records)}", flush=True)

    dump_yaml(
        out_dataset / "data.yaml",
        {
            "path": ".",
            "train": "train/images",
            "val": "valid/images",
            "test": "test/images",
            "names": {idx: name for idx, name in enumerate(classes)},
        },
    )
    write_csv(out_reports / "class_distribution_before_filter.csv", [{"class_name": k, "instances": v} for k, v in sorted(before_counter.items())])
    write_csv(out_reports / "class_distribution_after_filter.csv", [{"class_name": k, "instances": v} for k, v in sorted(output_counter.items())])
    write_csv(out_reports / "duplicate_report.csv", duplicate_rows)
    write_csv(out_reports / "label_issues.csv", issue_rows)
    return {
        "images": len(records),
        "classes": len(classes),
        "retained_instances": sum(output_counter.values()),
        "uncapped_images": uncapped_image_count,
        "max_images": max_images or "",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Build a deduped YOLO detect-only clean dataset from audited sources.")
    parser.add_argument("--audit-json", type=Path, required=True)
    parser.add_argument("--taxonomy", type=Path, required=True)
    parser.add_argument("--source-policy", type=Path, default=None, help="Optional reviewed clean-candidate source policy CSV.")
    parser.add_argument(
        "--include-noncommercial",
        action="store_true",
        help="Allow non-commercial/license-risk lanes from --source-policy. Default keeps them out.",
    )
    parser.add_argument("--raw-dir", type=Path, default=None, help="Optional raw zip folder used to re-extract missing audit paths.")
    parser.add_argument("--work-dir", type=Path, default=Path("_dataset_v2_work"))
    parser.add_argument("--out-dataset", type=Path, default=Path("_dataset_v2_work/clean_dataset"))
    parser.add_argument("--out-reports", type=Path, default=Path("_dataset_v2_reports"))
    parser.add_argument("--max-images", type=int, default=None, help="Optional deterministic cap for clean output images.")
    parser.add_argument(
        "--min-free-gb-after-build",
        type=float,
        default=2.0,
        help="Fail before output copy unless this much free disk remains after the estimated clean output.",
    )
    args = parser.parse_args()

    audit_rows = json.loads(args.audit_json.read_text(encoding="utf-8"))
    if args.source_policy:
        source_policy = load_source_policy(args.source_policy)
        audit_rows = filter_audit_rows_by_policy(
            audit_rows,
            source_policy,
            include_noncommercial=args.include_noncommercial,
        )
        if not audit_rows:
            raise RuntimeError("Source policy removed every audit row; refusing to build an empty clean dataset.")
    ensure_extracted_sources(audit_rows, args.raw_dir.resolve() if args.raw_dir else None, args.work_dir)
    taxonomy = load_yaml(args.taxonomy)
    summary = clean_dataset(
        audit_rows,
        taxonomy,
        args.out_dataset,
        args.out_reports,
        max_images=args.max_images,
        min_free_bytes_after_build=int(args.min_free_gb_after_build * 1024 * 1024 * 1024),
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
