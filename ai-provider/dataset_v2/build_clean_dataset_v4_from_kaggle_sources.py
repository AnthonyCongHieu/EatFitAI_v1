from __future__ import annotations

import csv
import json
import math
import shutil
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from PIL import Image

from build_clean_dataset import alias_map, split_for_hash, taxonomy_classes
from common import (
    IMAGE_EXTS,
    dump_yaml,
    find_data_yaml,
    find_split_dirs,
    image_opens,
    label_for_image,
    list_images,
    load_yaml,
    normalize_label,
    parse_data_yaml_names,
    read_csv,
    read_label_rows,
    sha256_file,
    write_csv,
)
from kaggle_v4_source_audit_kernel import (
    FOODSEG103_CLASSES,
    direct_images,
    find_dataset_mount,
    find_yolo_root,
    iter_imagefolder_class_dirs,
    load_source_class_name_map,
    mapped_directory_class_name,
)


FULL_IMAGE_BBOX = [0.5, 0.5, 1.0, 1.0]
TRUTHY = {"1", "true", "yes", "y"}


def source_weight_limit(max_images: int, value: str) -> int | None:
    try:
        cap = float(str(value or "").strip())
    except ValueError:
        return None
    if cap <= 0:
        return 0
    return max(1, math.ceil(max_images * min(cap, 1.0)))


def class_id_for(raw_class_name: str, aliases: dict[str, str], class_to_id: dict[str, int]) -> int | None:
    canonical = aliases.get(normalize_label(raw_class_name))
    if canonical is None:
        return None
    return class_to_id.get(canonical)


def make_record(source_slug: str, image_path: Path, rows: list[tuple[int, list[float]]]) -> dict[str, Any]:
    image_hash = sha256_file(image_path)
    return {
        "source_slug": source_slug,
        "image_path": image_path.as_posix(),
        "image_hash": image_hash,
        "split": split_for_hash(image_hash),
        "rows": rows,
    }


def add_full_box_record(
    records: list[dict[str, Any]],
    issues: list[dict[str, Any]],
    source_slug: str,
    image_path: Path,
    raw_class_name: str,
    aliases: dict[str, str],
    class_to_id: dict[str, int],
) -> None:
    ok, _size = image_opens(image_path)
    if not ok:
        issues.append({"source_slug": source_slug, "image_path": image_path.as_posix(), "issue": "image_open_failed"})
        return
    class_id = class_id_for(raw_class_name, aliases, class_to_id)
    if class_id is None:
        issues.append(
            {
                "source_slug": source_slug,
                "image_path": image_path.as_posix(),
                "raw_class_name": raw_class_name,
                "issue": "class_not_in_taxonomy",
            }
        )
        return
    records.append(make_record(source_slug, image_path, [(class_id, list(FULL_IMAGE_BBOX))]))


def collect_yolo_records(
    policy_row: dict[str, str],
    mount_path: Path,
    aliases: dict[str, str],
    class_to_id: dict[str, int],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    source_slug = policy_row["source_slug"]
    yolo_root = find_yolo_root(mount_path, require_data_yaml=True)
    if yolo_root is None:
        yolo_root = find_yolo_root(mount_path, require_data_yaml=False)
    if yolo_root is None:
        return [], [{"source_slug": source_slug, "issue": "yolo_root_missing", "mount_path": mount_path.as_posix()}]
    names, _warnings = parse_data_yaml_names(find_data_yaml(yolo_root))
    records: list[dict[str, Any]] = []
    issues: list[dict[str, Any]] = []
    for image_dir, label_dir in find_split_dirs(yolo_root).values():
        for image_path in list_images(image_dir):
            ok, _size = image_opens(image_path)
            if not ok:
                issues.append({"source_slug": source_slug, "image_path": image_path.as_posix(), "issue": "image_open_failed"})
                continue
            label_path = label_for_image(image_path, image_dir, label_dir)
            if not label_path.exists():
                issues.append({"source_slug": source_slug, "image_path": image_path.as_posix(), "issue": "missing_label"})
                continue
            parsed_rows, counts = read_label_rows(label_path, len(names) if names else None)
            clean_rows: list[tuple[int, list[float]]] = []
            for row in parsed_rows:
                raw_class_name = names.get(row["class_id"], str(row["class_id"]))
                mapped_id = class_id_for(raw_class_name, aliases, class_to_id)
                if mapped_id is None:
                    continue
                clean_rows.append((mapped_id, [round(float(value), 6) for value in row["bbox"]]))
            if clean_rows:
                records.append(make_record(source_slug, image_path, clean_rows))
            elif parsed_rows or counts:
                issues.append({"source_slug": source_slug, "image_path": image_path.as_posix(), "issue": "no_retained_labels"})
    return records, issues


def collect_imagefolder_records(
    policy_row: dict[str, str],
    mount_path: Path,
    aliases: dict[str, str],
    class_to_id: dict[str, int],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    records: list[dict[str, Any]] = []
    issues: list[dict[str, Any]] = []
    if policy_row.get("source_ref") == "zachaluza/cnfood-241" and not policy_row.get("class_names_file"):
        policy_row = dict(policy_row)
        policy_row["class_names_file"] = "cnfood241_class_names_2026-05-14.yaml"
        policy_row["class_names_key"] = "cnfood241"
    class_names, _warnings = load_source_class_name_map(policy_row)
    for class_dir in iter_imagefolder_class_dirs(mount_path):
        raw_class_name = mapped_directory_class_name(class_dir.name, class_names)
        for image_path in direct_images(class_dir):
            add_full_box_record(records, issues, policy_row["source_slug"], image_path, raw_class_name, aliases, class_to_id)
    return records, issues


def index_images(root: Path) -> dict[str, list[Path]]:
    index: dict[str, list[Path]] = defaultdict(list)
    for image_path in list_images(root):
        index[image_path.name.lower()].append(image_path)
    return index


def collect_csv_records(
    policy_row: dict[str, str],
    mount_path: Path,
    aliases: dict[str, str],
    class_to_id: dict[str, int],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    records: list[dict[str, Any]] = []
    issues: list[dict[str, Any]] = []
    image_index = index_images(mount_path)
    csv_name = "train_img.csv" if policy_row.get("source_ref") == "bjoernjostein/food-classification" else ""
    csv_paths = sorted(mount_path.rglob(csv_name or "*.csv"))
    for csv_path in csv_paths:
        with csv_path.open("r", encoding="utf-8-sig", newline="") as f:
            for row in csv.DictReader(f):
                raw_class_name = row.get("ClassName") or row.get("class") or row.get("label") or ""
                image_name = row.get("ImageId") or row.get("image") or row.get("file_name") or ""
                matches = image_index.get(Path(image_name).name.lower(), [])
                if not raw_class_name or not matches:
                    issues.append(
                        {
                            "source_slug": policy_row["source_slug"],
                            "csv_path": csv_path.as_posix(),
                            "image_name": image_name,
                            "issue": "csv_image_or_class_missing",
                        }
                    )
                    continue
                add_full_box_record(records, issues, policy_row["source_slug"], matches[0], raw_class_name, aliases, class_to_id)
        if records:
            break
    return records, issues


def collect_coco_records(
    policy_row: dict[str, str],
    mount_path: Path,
    aliases: dict[str, str],
    class_to_id: dict[str, int],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    records_by_image: dict[Path, list[tuple[int, list[float]]]] = defaultdict(list)
    issues: list[dict[str, Any]] = []
    image_index = index_images(mount_path)
    for json_path in sorted(mount_path.rglob("*.json")):
        try:
            data = json.loads(json_path.read_text(encoding="utf-8-sig", errors="replace"))
        except Exception as exc:
            issues.append({"source_slug": policy_row["source_slug"], "path": json_path.as_posix(), "issue": f"json_parse_failed:{type(exc).__name__}"})
            continue
        if not isinstance(data, dict) or not isinstance(data.get("categories"), list) or not isinstance(data.get("annotations"), list):
            continue
        categories = {item.get("id"): str(item.get("name")) for item in data["categories"] if isinstance(item, dict)}
        images = {
            item.get("id"): str(item.get("file_name") or item.get("path") or "")
            for item in data.get("images", [])
            if isinstance(item, dict)
        }
        for annotation in data["annotations"]:
            if not isinstance(annotation, dict) or not isinstance(annotation.get("bbox"), list):
                continue
            raw_class_name = categories.get(annotation.get("category_id"), "")
            mapped_id = class_id_for(raw_class_name, aliases, class_to_id)
            if mapped_id is None:
                continue
            image_name = images.get(annotation.get("image_id"), "")
            matches = image_index.get(Path(image_name).name.lower(), [])
            if not matches:
                continue
            image_path = matches[0]
            try:
                with Image.open(image_path) as img:
                    width, height = img.size
            except Exception:
                continue
            x, y, w, h = [float(value) for value in annotation["bbox"][:4]]
            bbox = [
                round((x + w / 2) / width, 6),
                round((y + h / 2) / height, 6),
                round(w / width, 6),
                round(h / height, 6),
            ]
            records_by_image[image_path].append((mapped_id, bbox))
    records = [make_record(policy_row["source_slug"], image_path, rows) for image_path, rows in records_by_image.items()]
    return records, issues


def image_for_foodseg_mask(mask_path: Path, mount_path: Path) -> Path | None:
    parts = list(mask_path.parts)
    if "ann_dir" in parts:
        idx = parts.index("ann_dir")
        parts[idx] = "img_dir"
        candidate = Path(*parts).with_suffix(".jpg")
        if candidate.exists():
            return candidate
        for suffix in IMAGE_EXTS:
            alt = candidate.with_suffix(suffix)
            if alt.exists():
                return alt
    matches = [path for path in mount_path.rglob(mask_path.with_suffix(".jpg").name)]
    return matches[0] if matches else None


def collect_foodseg_records(
    policy_row: dict[str, str],
    mount_path: Path,
    aliases: dict[str, str],
    class_to_id: dict[str, int],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    records: list[dict[str, Any]] = []
    issues: list[dict[str, Any]] = []
    for mask_path in sorted(path for path in mount_path.rglob("*.png") if "ann_dir" in path.as_posix()):
        image_path = image_for_foodseg_mask(mask_path, mount_path)
        if image_path is None:
            issues.append({"source_slug": policy_row["source_slug"], "mask_path": mask_path.as_posix(), "issue": "mask_image_missing"})
            continue
        with Image.open(mask_path) as mask:
            gray = mask.convert("L")
            width, height = gray.size
            pixels = gray.load()
            boxes: dict[int, list[int]] = {}
            for y in range(height):
                for x in range(width):
                    class_id = int(pixels[x, y])
                    if class_id <= 0 or class_id not in FOODSEG103_CLASSES:
                        continue
                    box = boxes.setdefault(class_id, [x, y, x, y])
                    box[0] = min(box[0], x)
                    box[1] = min(box[1], y)
                    box[2] = max(box[2], x)
                    box[3] = max(box[3], y)
        rows: list[tuple[int, list[float]]] = []
        for foodseg_id, (left, top, right, bottom) in boxes.items():
            raw_class_name = FOODSEG103_CLASSES[foodseg_id]
            mapped_id = class_id_for(raw_class_name, aliases, class_to_id)
            if mapped_id is None:
                continue
            box_w = max(1, right - left + 1)
            box_h = max(1, bottom - top + 1)
            rows.append(
                (
                    mapped_id,
                    [
                        round((left + box_w / 2) / width, 6),
                        round((top + box_h / 2) / height, 6),
                        round(box_w / width, 6),
                        round(box_h / height, 6),
                    ],
                )
            )
        if rows:
            records.append(make_record(policy_row["source_slug"], image_path, rows))
    return records, issues


def collect_source_records(
    policy_row: dict[str, str],
    mount_path: Path,
    aliases: dict[str, str],
    class_to_id: dict[str, int],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    audit_mode = policy_row.get("audit_mode", "")
    source_format = policy_row.get("source_format", "")
    if "yolo" in audit_mode or "yolo" in source_format:
        return collect_yolo_records(policy_row, mount_path, aliases, class_to_id)
    if audit_mode == "classification_csv" or "classification_csv" in source_format:
        return collect_csv_records(policy_row, mount_path, aliases, class_to_id)
    if "classification_imagefolder" in audit_mode or "classification" in source_format:
        return collect_imagefolder_records(policy_row, mount_path, aliases, class_to_id)
    if "semantic_segmentation_mask_to_bbox" in audit_mode or "semantic_segmentation" in source_format:
        return collect_foodseg_records(policy_row, mount_path, aliases, class_to_id)
    if audit_mode == "annotation_or_file_pool":
        return collect_coco_records(policy_row, mount_path, aliases, class_to_id)
    return [], [{"source_slug": policy_row["source_slug"], "issue": "unsupported_build_adapter", "audit_mode": audit_mode}]


def copy_records(records: list[dict[str, Any]], classes: list[str], out_dataset: Path) -> dict[str, Any]:
    if out_dataset.exists():
        shutil.rmtree(out_dataset)
    for split in ("train", "valid", "test"):
        (out_dataset / "images" / split).mkdir(parents=True, exist_ok=True)
        (out_dataset / "labels" / split).mkdir(parents=True, exist_ok=True)
    class_counts: Counter[str] = Counter()
    source_counts: Counter[str] = Counter()
    for index, record in enumerate(records):
        split = record["split"]
        src = Path(record["image_path"])
        name = f"{record['source_slug']}_{index:07d}{src.suffix.lower() or '.jpg'}"
        dst_image = out_dataset / "images" / split / name
        dst_label = out_dataset / "labels" / split / Path(name).with_suffix(".txt").name
        shutil.copy2(src, dst_image)
        lines = []
        for class_id, bbox in record["rows"]:
            class_counts[classes[class_id]] += 1
            lines.append(f"{class_id} " + " ".join(f"{value:.6f}" for value in bbox))
        dst_label.write_text("\n".join(lines) + "\n", encoding="utf-8")
        source_counts[record["source_slug"]] += 1
    dump_yaml(
        out_dataset / "data.yaml",
        {
            "path": out_dataset.as_posix(),
            "train": "images/train",
            "val": "images/valid",
            "test": "images/test",
            "names": {idx: name for idx, name in enumerate(classes)},
        },
    )
    return {
        "image_count": len(records),
        "class_count": len(classes),
        "class_instance_counts": dict(class_counts),
        "source_image_counts": dict(source_counts),
    }


def build_clean_v4_dataset(
    source_policy_path: Path,
    taxonomy_path: Path,
    out_dataset: Path,
    out_reports: Path,
    max_images: int,
    kaggle_input: Path = Path("/kaggle/input"),
) -> dict[str, Any]:
    taxonomy = load_yaml(taxonomy_path)
    classes = taxonomy_classes(taxonomy)
    aliases = alias_map(taxonomy, classes)
    class_to_id = {name: idx for idx, name in enumerate(classes)}
    policy_rows = [row for row in read_csv(source_policy_path) if row.get("include_in_default_clean", "").lower() in TRUTHY]
    all_records: list[dict[str, Any]] = []
    all_issues: list[dict[str, Any]] = []
    inventory: list[dict[str, Any]] = []
    seen_hashes: set[str] = set()
    for policy_row in policy_rows:
        dataset_ref = policy_row.get("dataset_ref") or policy_row.get("source_ref") or ""
        mount_path = find_dataset_mount(dataset_ref, root=kaggle_input)
        if mount_path is None:
            all_issues.append({"source_slug": policy_row["source_slug"], "dataset_ref": dataset_ref, "issue": "missing_mount"})
            inventory.append({"source_slug": policy_row["source_slug"], "dataset_ref": dataset_ref, "status": "missing_mount"})
            continue
        records, issues = collect_source_records(policy_row, mount_path, aliases, class_to_id)
        limit = source_weight_limit(max_images, policy_row.get("source_weight_cap", ""))
        if limit is not None:
            records = records[:limit]
        deduped: list[dict[str, Any]] = []
        for record in records:
            if record["image_hash"] in seen_hashes:
                all_issues.append({"source_slug": policy_row["source_slug"], "image_path": record["image_path"], "issue": "duplicate_image_hash"})
                continue
            seen_hashes.add(record["image_hash"])
            deduped.append(record)
        all_records.extend(deduped)
        all_issues.extend(issues)
        inventory.append(
            {
                "source_slug": policy_row["source_slug"],
                "dataset_ref": dataset_ref,
                "status": "built",
                "mount_path": mount_path.as_posix(),
                "records_before_limit": len(records),
                "records_after_dedupe": len(deduped),
                "issue_count": len(issues),
            }
        )
    all_records = all_records[:max_images]
    out_reports.mkdir(parents=True, exist_ok=True)
    write_csv(out_reports / "clean_build_v4_inventory.csv", inventory)
    write_csv(out_reports / "clean_build_v4_issues.csv", all_issues)
    manifest_rows = [
        {
            "source_slug": record["source_slug"],
            "image_path": record["image_path"],
            "image_hash": record["image_hash"],
            "split": record["split"],
            "label_count": len(record["rows"]),
        }
        for record in all_records
    ]
    write_csv(out_reports / "clean_build_v4_manifest.csv", manifest_rows)
    build_summary = copy_records(all_records, classes, out_dataset)
    build_summary.update(
        {
            "included_source_count": len(policy_rows),
            "issue_count": len(all_issues),
            "taxonomy": taxonomy_path.as_posix(),
            "source_policy": source_policy_path.as_posix(),
            "max_images": max_images,
        }
    )
    (out_reports / "clean_build_v4_summary.json").write_text(json.dumps(build_summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return build_summary
