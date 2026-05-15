from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from common import image_opens, list_images, load_yaml, read_label_rows, sha256_file, write_json


def split_image_dir(dataset: Path, data: dict[str, Any], split: str) -> Path:
    yaml_key = "val" if split == "valid" else split
    configured = Path(str(data.get(yaml_key, "")))
    if configured and not configured.is_absolute():
        configured = dataset / configured
    if configured.exists():
        return configured
    return dataset / split / "images"


def split_label_dir(dataset: Path, image_dir: Path, split: str) -> Path:
    image_parts = image_dir.parts
    if "images" in image_parts:
        index = len(image_parts) - 1 - image_parts[::-1].index("images")
        return Path(*image_parts[:index], "labels", *image_parts[index + 1 :])
    return dataset / split / "labels"


def validate(dataset: Path) -> dict[str, Any]:
    data_yaml = dataset / "data.yaml"
    data = load_yaml(data_yaml)
    names = data.get("names", {})
    if isinstance(names, list):
        class_ids = set(range(len(names)))
    else:
        class_ids = {int(key) for key in names.keys()}
    summary: dict[str, Any] = {
        "segment_rows": 0,
        "malformed_rows": 0,
        "class_out_of_range_rows": 0,
        "bbox_out_of_bounds_rows": 0,
        "duplicate_exact_label_rows": 0,
        "orphan_label_files": 0,
        "image_open_failed": 0,
        "cross_split_exact_duplicate_images": 0,
        "class_ids_contiguous": class_ids == set(range(len(class_ids))),
        "data_yaml_portable": not Path(str(data.get("train", ""))).is_absolute()
        and not Path(str(data.get("val", ""))).is_absolute()
        and not Path(str(data.get("test", ""))).is_absolute(),
        "splits": {},
        "warnings": [],
    }
    image_hash_splits: defaultdict[str, set[str]] = defaultdict(set)
    class_counts: Counter[int] = Counter()
    valid_class_counts: Counter[int] = Counter()

    for split in ("train", "valid", "test"):
        image_dir = split_image_dir(dataset, data, split)
        label_dir = split_label_dir(dataset, image_dir, split)
        images = list_images(image_dir) if image_dir.exists() else []
        labels = sorted(label_dir.glob("*.txt")) if label_dir.exists() else []
        image_stems = {image.stem for image in images}
        label_stems = {label.stem for label in labels}
        summary["orphan_label_files"] += len(label_stems - image_stems)
        summary["splits"][split] = {"images": len(images), "labels": len(labels)}
        for image in images:
            ok, _size = image_opens(image)
            if not ok:
                summary["image_open_failed"] += 1
            image_hash_splits[sha256_file(image)].add(split)
            label = label_dir / f"{image.stem}.txt"
            rows, counts = read_label_rows(label, len(class_ids))
            summary["segment_rows"] += counts.get("segment", 0)
            summary["malformed_rows"] += counts.get("malformed", 0)
            summary["class_out_of_range_rows"] += counts.get("class_out_of_range", 0)
            summary["bbox_out_of_bounds_rows"] += counts.get("bbox_out_of_bounds", 0)
            seen: set[str] = set()
            for row in rows:
                if row["kind"] != "detect":
                    continue
                class_counts[row["class_id"]] += 1
                if split == "valid":
                    valid_class_counts[row["class_id"]] += 1
                normalized = f"{row['class_id']} {' '.join(f'{value:.6f}' for value in row['bbox'])}"
                if normalized in seen:
                    summary["duplicate_exact_label_rows"] += 1
                seen.add(normalized)
    summary["cross_split_exact_duplicate_images"] = sum(1 for splits in image_hash_splits.values() if len(splits) > 1)
    missing_from_valid = sorted(class_id for class_id in class_ids if class_counts[class_id] >= 10 and valid_class_counts[class_id] == 0)
    if missing_from_valid:
        summary["warnings"].append({"classes_missing_from_valid": missing_from_valid})
    empty_splits = [split for split, stats in summary["splits"].items() if stats["images"] == 0]
    summary["empty_splits"] = empty_splits
    if empty_splits:
        summary["warnings"].append({"empty_splits": empty_splits})
    hard_keys = [
        "segment_rows",
        "malformed_rows",
        "class_out_of_range_rows",
        "bbox_out_of_bounds_rows",
        "duplicate_exact_label_rows",
        "orphan_label_files",
        "image_open_failed",
        "cross_split_exact_duplicate_images",
    ]
    summary["hard_gate_passed"] = (
        all(summary[key] == 0 for key in hard_keys)
        and not empty_splits
        and summary["class_ids_contiguous"]
        and summary["data_yaml_portable"]
    )
    return summary


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate clean YOLO detect-only dataset hard gates.")
    parser.add_argument("--dataset", type=Path, required=True)
    parser.add_argument("--out", type=Path, default=Path("_dataset_v2_reports/final_audit_summary.json"))
    args = parser.parse_args()
    summary = validate(args.dataset)
    write_json(args.out, summary)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0 if summary["hard_gate_passed"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
