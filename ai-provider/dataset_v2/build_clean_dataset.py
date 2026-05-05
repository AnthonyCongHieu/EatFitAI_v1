from __future__ import annotations

import argparse
import json
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


def split_for_hash(image_hash: str) -> str:
    value = int(image_hash[:12], 16) % 100
    if value < 85:
        return "train"
    if value < 95:
        return "valid"
    return "test"


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


def clean_dataset(audit_rows: list[dict[str, Any]], taxonomy: dict[str, Any], out_dataset: Path, out_reports: Path) -> dict[str, Any]:
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
        root = Path(source.get("extracted_path", ""))
        if not root.exists():
            issue_rows.append({"source_slug": source_slug, "issue": "extracted_path_missing", "path": str(root)})
            continue
        names, _warnings = parse_data_yaml_names(find_data_yaml(root))
        for image_dir, label_dir in find_split_dirs(root).values():
            for image_path in list_images(image_dir):
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
                records.append({"source_slug": source_slug, "image_path": image_path, "rows": clean_rows, "image_hash": image_hash})

    random.Random(20260504).shuffle(records)
    for split in ("train", "valid", "test"):
        (out_dataset / split / "images").mkdir(parents=True, exist_ok=True)
        (out_dataset / split / "labels").mkdir(parents=True, exist_ok=True)

    manifest_path = out_dataset / "manifest.jsonl"
    with manifest_path.open("w", encoding="utf-8") as manifest:
        for record in records:
            split = split_for_hash(record["image_hash"])
            src: Path = record["image_path"]
            dst_stem = f"{record['source_slug']}_{record['image_hash'][:16]}"
            dst_img = out_dataset / split / "images" / f"{dst_stem}{src.suffix.lower()}"
            dst_label = out_dataset / split / "labels" / f"{dst_stem}.txt"
            shutil.copy2(src, dst_img)
            label_lines = [f"{class_id} {' '.join(f'{value:.6f}' for value in bbox)}" for class_id, bbox in record["rows"]]
            dst_label.write_text("\n".join(label_lines) + "\n", encoding="utf-8")
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
    write_csv(out_reports / "class_distribution_after_filter.csv", [{"class_name": k, "instances": v} for k, v in sorted(after_counter.items())])
    write_csv(out_reports / "duplicate_report.csv", duplicate_rows)
    write_csv(out_reports / "label_issues.csv", issue_rows)
    return {"images": len(records), "classes": len(classes), "retained_instances": sum(after_counter.values())}


def main() -> int:
    parser = argparse.ArgumentParser(description="Build a deduped YOLO detect-only clean dataset from audited sources.")
    parser.add_argument("--audit-json", type=Path, required=True)
    parser.add_argument("--taxonomy", type=Path, required=True)
    parser.add_argument("--raw-dir", type=Path, default=None, help="Optional raw zip folder used to re-extract missing audit paths.")
    parser.add_argument("--work-dir", type=Path, default=Path("_dataset_v2_work"))
    parser.add_argument("--out-dataset", type=Path, default=Path("_dataset_v2_work/clean_dataset"))
    parser.add_argument("--out-reports", type=Path, default=Path("_dataset_v2_reports"))
    args = parser.parse_args()

    audit_rows = json.loads(args.audit_json.read_text(encoding="utf-8"))
    ensure_extracted_sources(audit_rows, args.raw_dir.resolve() if args.raw_dir else None, args.work_dir)
    taxonomy = load_yaml(args.taxonomy)
    summary = clean_dataset(audit_rows, taxonomy, args.out_dataset, args.out_reports)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
