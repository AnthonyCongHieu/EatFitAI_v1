from __future__ import annotations

import json
import os
import csv
import sys
import time
import zipfile
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


KAGGLE_INPUT = Path("/kaggle/input")
REPORT_DIR = Path("/kaggle/working/_eatfitai_v4_source_audit_reports")
REPORTS_ZIP = Path("/kaggle/working/eatfitai_v4_source_audit_reports.zip")
SOURCE_MANIFEST = os.environ.get("EATFITAI_V4_SOURCE_MANIFEST", "clean_v4_external_source_candidates_2026-05-13.csv")
MAX_ANNOTATION_FILE_BYTES = int(os.environ.get("EATFITAI_V4_MAX_ANNOTATION_FILE_MB", "120")) * 1024 * 1024
MAX_RUNTIME_SECONDS = int(os.environ.get("EATFITAI_V4_MAX_RUNTIME_SECONDS", "30000"))

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
FOODSEG103_CLASSES = {
    1: "candy",
    2: "egg tart",
    3: "french fries",
    4: "chocolate",
    5: "biscuit",
    6: "popcorn",
    7: "pudding",
    8: "ice cream",
    9: "cheese butter",
    10: "cake",
    11: "wine",
    12: "milkshake",
    13: "coffee",
    14: "juice",
    15: "milk",
    16: "tea",
    17: "almond",
    18: "red beans",
    19: "cashew",
    20: "dried cranberries",
    21: "soy",
    22: "walnut",
    23: "peanut",
    24: "egg",
    25: "apple",
    26: "date",
    27: "apricot",
    28: "avocado",
    29: "banana",
    30: "strawberry",
    31: "cherry",
    32: "blueberry",
    33: "raspberry",
    34: "mango",
    35: "olives",
    36: "peach",
    37: "lemon",
    38: "pear",
    39: "fig",
    40: "pineapple",
    41: "grape",
    42: "kiwi",
    43: "melon",
    44: "orange",
    45: "watermelon",
    46: "steak",
    47: "pork",
    48: "chicken duck",
    49: "sausage",
    50: "fried meat",
    51: "lamb",
    52: "sauce",
    53: "crab",
    54: "fish",
    55: "shellfish",
    56: "shrimp",
    57: "soup",
    58: "bread",
    59: "corn",
    60: "hamburg",
    61: "pizza",
    62: "hanamaki baozi",
    63: "wonton dumplings",
    64: "pasta",
    65: "noodles",
    66: "rice",
    67: "pie",
    68: "tofu",
    69: "eggplant",
    70: "potato",
    71: "garlic",
    72: "cauliflower",
    73: "tomato",
    74: "kelp",
    75: "seaweed",
    76: "spring onion",
    77: "rape",
    78: "ginger",
    79: "okra",
    80: "lettuce",
    81: "pumpkin",
    82: "cucumber",
    83: "white radish",
    84: "carrot",
    85: "asparagus",
    86: "bamboo shoots",
    87: "broccoli",
    88: "celery stick",
    89: "cilantro mint",
    90: "snow peas",
    91: "cabbage",
    92: "bean sprouts",
    93: "onion",
    94: "pepper",
    95: "green beans",
    96: "French beans",
    97: "king oyster mushroom",
    98: "shiitake",
    99: "enoki mushroom",
    100: "oyster mushroom",
    101: "white button mushroom",
    102: "salad",
    103: "other ingredients",
}


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

from audit_sources import audit_mounted_source, load_manifest_class_names  # type: ignore  # noqa: E402
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


def find_yolo_root(root: Path, require_data_yaml: bool = True) -> Path | None:
    candidates = [root]
    candidates.extend(path.parent for path in sorted(root.rglob("data.y*ml")))
    for candidate in candidates:
        has_direct_data_yaml = (candidate / "data.yaml").exists() or (candidate / "data.yml").exists()
        if find_split_dirs(candidate) and (has_direct_data_yaml or not require_data_yaml):
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


def parse_int_label(value: str) -> int | None:
    text = str(value).strip()
    if not text:
        return None
    try:
        return int(text, 10)
    except ValueError:
        return None


def load_source_class_name_map(row: dict[str, str]) -> tuple[dict[int, str], list[str]]:
    source = dict(row)
    source.setdefault("source_slug", source_slug_for_ref(row.get("dataset_ref", "")))
    names, warnings, _source = load_manifest_class_names(source)
    return names, warnings


def mapped_directory_class_name(class_dir_name: str, class_names: dict[int, str]) -> str:
    class_id = parse_int_label(class_dir_name)
    if class_id is not None and class_id in class_names:
        return class_names[class_id]
    return class_dir_name


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
    class_names, class_map_warnings = load_source_class_name_map(row)
    for class_dir in iter_imagefolder_class_dirs(mount_path):
        images = direct_images(class_dir)
        raw_class_name = mapped_directory_class_name(class_dir.name, class_names)
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
    source_row["warnings"] = ";".join(sorted(set(class_map_warnings)))
    if not candidates:
        source_row["warnings"] = "|".join([source_row["warnings"], "no_imagefolder_class_dirs_found"]).strip("|")
    return source_row, candidates


def find_csv_label_files(row: dict[str, str], mount_path: Path) -> list[Path]:
    explicit = row.get("csv_label_file", "").strip()
    if explicit:
        direct = mount_path / explicit
        matches = [direct] if direct.exists() else sorted(mount_path.rglob(explicit))
        return [path for path in matches if path.is_file()]
    return sorted(path for path in mount_path.rglob("*.csv") if path.stat().st_size <= MAX_ANNOTATION_FILE_BYTES)


def first_present(row: dict[str, str], names: tuple[str, ...]) -> str:
    lower_map = {key.lower(): key for key in row.keys()}
    for name in names:
        actual = lower_map.get(name.lower())
        if actual and str(row.get(actual, "")).strip():
            return str(row.get(actual, "")).strip()
    return ""


def audit_classification_csv_source(row: dict[str, str], mount_path: Path) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    class_column = row.get("csv_class_column", "").strip()
    image_column = row.get("csv_image_column", "").strip()
    split_name = row.get("csv_split", "").strip() or "all"
    stats: dict[str, dict[str, Any]] = defaultdict(lambda: {"instances": 0, "image_ids": set(), "splits": Counter()})
    warnings: list[str] = []
    files = find_csv_label_files(row, mount_path)
    for path in files:
        try:
            with path.open("r", encoding="utf-8-sig", newline="") as f:
                reader = csv.DictReader(f)
                for csv_row in reader:
                    raw_class_name = (
                        str(csv_row.get(class_column, "")).strip()
                        if class_column
                        else first_present(
                            csv_row,
                            (
                                "ClassName",
                                "class_name",
                                "class",
                                "label",
                                "category",
                                "food",
                                "food_name",
                                "dish",
                                "name",
                            ),
                        )
                    )
                    if not raw_class_name:
                        continue
                    image_id = (
                        str(csv_row.get(image_column, "")).strip()
                        if image_column
                        else first_present(
                            csv_row,
                            ("ImageId", "image_id", "image", "filename", "file_name", "path", "id"),
                        )
                    )
                    stats[raw_class_name]["instances"] += 1
                    if image_id:
                        stats[raw_class_name]["image_ids"].add(image_id)
                    stats[raw_class_name]["splits"][split_name] += 1
        except Exception as exc:
            warnings.append(f"csv_parse_failed:{path.name}:{type(exc).__name__}")

    candidates = [
        class_candidate(
            row,
            raw_class_name=class_name,
            images=len(values["image_ids"]) if values["image_ids"] else int(values["instances"]),
            instances=int(values["instances"]),
            split_counts=dict(values["splits"]),
            candidate_origin="classification_pseudo_box_review",
        )
        for class_name, values in sorted(stats.items(), key=lambda item: normalize_label(item[0]))
        if int(values["instances"]) > 0
    ]
    source_row = base_source_row(row, mount_path, "audited", "classification_csv")
    source_row["class_count"] = len(candidates)
    source_row["image_count"] = count_images_under(mount_path)
    source_row["label_count"] = sum(int(candidate["instances"]) for candidate in candidates)
    source_row["annotation_file_count"] = len(files)
    source_row["candidate_count"] = len(candidates)
    source_row["warnings"] = "|".join(warnings[:20])
    if not candidates:
        source_row["warnings"] = "|".join([source_row["warnings"], "no_csv_class_labels_found"]).strip("|")
    return source_row, candidates


def find_uec_category_file(mount_path: Path) -> Path | None:
    for path in [mount_path / "category.txt", *mount_path.rglob("category.txt")]:
        if path.is_file():
            return path
    return None


def read_uec_category_names(path: Path | None) -> tuple[dict[int, str], list[str]]:
    warnings: list[str] = []
    if path is None:
        return {}, ["uec_category_txt_missing"]
    names: dict[int, str] = {}
    try:
        with path.open("r", encoding="utf-8-sig", newline="") as f:
            reader = csv.DictReader(f, delimiter="\t")
            for item in reader:
                class_id = parse_int_label(item.get("id", ""))
                name = str(item.get("name", "")).strip()
                if class_id is not None and name:
                    names[class_id] = name
    except Exception as exc:
        warnings.append(f"uec_category_parse_failed:{type(exc).__name__}")
    if not names:
        warnings.append("uec_category_names_missing")
    return names, warnings


def audit_uecfood_source(row: dict[str, str], mount_path: Path) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    category_names, warnings = read_uec_category_names(find_uec_category_file(mount_path))
    stats: dict[str, dict[str, Any]] = defaultdict(lambda: {"images": 0, "instances": 0})
    annotation_files = sorted(mount_path.rglob("bb_info.txt"))
    for bb_file in annotation_files:
        class_id = parse_int_label(bb_file.parent.name)
        class_name = category_names.get(class_id or -1, bb_file.parent.name)
        try:
            lines = bb_file.read_text(encoding="utf-8-sig", errors="replace").splitlines()
        except Exception as exc:
            warnings.append(f"uec_bb_info_read_failed:{bb_file.parent.name}:{type(exc).__name__}")
            continue
        for line in lines[1:]:
            parts = line.strip().split()
            if len(parts) < 5:
                continue
            box_count = max(1, (len(parts) - 1) // 4)
            stats[class_name]["images"] += 1
            stats[class_name]["instances"] += box_count

    candidates = [
        class_candidate(
            row,
            raw_class_name=class_name,
            images=int(values["images"]),
            instances=int(values["instances"]),
            split_counts={"all": int(values["images"])},
            candidate_origin="uec_bbox_metadata_review",
        )
        for class_name, values in sorted(stats.items(), key=lambda item: normalize_label(item[0]))
        if int(values["images"]) > 0
    ]
    source_row = base_source_row(row, mount_path, "audited", "uecfood_bbox_metadata")
    source_row["class_count"] = len(candidates)
    source_row["image_count"] = count_images_under(mount_path)
    source_row["label_count"] = sum(int(candidate["instances"]) for candidate in candidates)
    source_row["annotation_file_count"] = len(annotation_files)
    source_row["candidate_count"] = len(candidates)
    source_row["warnings"] = "|".join(warnings[:20])
    if not candidates:
        source_row["warnings"] = "|".join([source_row["warnings"], "no_uec_bbox_rows_found"]).strip("|")
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
            "class_names_file": row.get("class_names_file", ""),
            "class_names_key": row.get("class_names_key", ""),
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


def collect_coco_category_stats(value: Any) -> dict[str, dict[str, Any]]:
    if not isinstance(value, dict):
        return {}
    categories = value.get("categories")
    annotations = value.get("annotations")
    if not isinstance(categories, list) or not isinstance(annotations, list):
        return {}

    category_names: dict[Any, str] = {}
    for item in categories:
        if not isinstance(item, dict) or not item.get("name"):
            continue
        category_id = item.get("id")
        if category_id is not None:
            category_names[category_id] = str(item["name"])

    stats: dict[str, dict[str, Any]] = defaultdict(lambda: {"instances": 0, "image_ids": set()})
    for annotation in annotations:
        if not isinstance(annotation, dict):
            continue
        category_id = annotation.get("category_id")
        class_name = category_names.get(category_id)
        if not class_name:
            continue
        stats[class_name]["instances"] += 1
        image_id = annotation.get("image_id")
        if image_id is not None:
            stats[class_name]["image_ids"].add(image_id)
    return stats


def collect_vqa_dish_stats(value: Any) -> dict[str, dict[str, Any]]:
    rows: list[Any]
    if isinstance(value, list):
        rows = value
    elif isinstance(value, dict):
        candidate_rows = value.get("annotations") or value.get("data") or value.get("items")
        rows = candidate_rows if isinstance(candidate_rows, list) else []
    else:
        rows = []

    stats: dict[str, dict[str, Any]] = defaultdict(lambda: {"instances": 0, "image_ids": set()})
    for item in rows[:200000]:
        if not isinstance(item, dict):
            continue
        dish = item.get("dish")
        if not isinstance(dish, str) or not dish.strip():
            continue
        image_id = item.get("image_id") or item.get("image") or item.get("file_name")
        stats[dish.strip()]["instances"] += 1
        if image_id is not None:
            stats[dish.strip()]["image_ids"].add(image_id)
    return stats


def audit_annotation_or_file_pool_source(row: dict[str, str], mount_path: Path) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    files = annotation_files(mount_path)
    category_counts: Counter[str] = Counter()
    category_image_ids: dict[str, set[Any]] = defaultdict(set)
    category_origins: dict[str, str] = {}
    warnings: list[str] = []
    for path in files:
        if path.suffix.lower() != ".json":
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8-sig", errors="replace"))
        except Exception as exc:
            warnings.append(f"json_parse_failed:{path.name}:{type(exc).__name__}")
            continue
        coco_stats = collect_coco_category_stats(data)
        if coco_stats:
            for class_name, stats in coco_stats.items():
                category_counts[class_name] += int(stats["instances"])
                category_image_ids[class_name].update(stats["image_ids"])
                category_origins[class_name] = "annotation_category_review"
        elif dish_stats := collect_vqa_dish_stats(data):
            for class_name, stats in dish_stats.items():
                category_counts[class_name] += int(stats["instances"])
                category_image_ids[class_name].update(stats["image_ids"])
                category_origins[class_name] = "vqa_dish_label_review"
        else:
            collect_category_names_from_json(data, category_counts)

    image_count = count_images_under(mount_path)
    candidates = [
        class_candidate(
            row,
            raw_class_name=name,
            images=len(category_image_ids.get(name, set())),
            instances=count,
            split_counts={"all": len(category_image_ids.get(name, set()))} if category_image_ids.get(name) else {},
            candidate_origin=category_origins.get(name, "annotation_category_review"),
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
    mask_stats: dict[int, dict[str, Any]] = defaultdict(lambda: {"images": 0, "instances": 0, "splits": Counter()})
    warnings: list[str] = []
    try:
        from PIL import Image  # type: ignore
    except Exception as exc:
        Image = None  # type: ignore
        warnings.append(f"pil_unavailable:{type(exc).__name__}")

    if Image is not None:
        for mask_path in sorted(path for path in mount_path.rglob("*.png") if "ann_dir" in path.as_posix()):
            try:
                with Image.open(mask_path) as img:
                    values = set(img.convert("L").getdata())
            except Exception as exc:
                warnings.append(f"mask_read_failed:{mask_path.name}:{type(exc).__name__}")
                continue
            split_name = SPLIT_ALIASES.get(mask_path.parent.name.lower(), "all")
            for class_id in sorted(value for value in values if value in FOODSEG103_CLASSES):
                mask_stats[class_id]["images"] += 1
                mask_stats[class_id]["instances"] += 1
                mask_stats[class_id]["splits"][split_name] += 1

    candidates = [
        class_candidate(
            row,
            raw_class_name=FOODSEG103_CLASSES[class_id],
            images=int(stats["images"]),
            instances=int(stats["instances"]),
            split_counts=dict(stats["splits"]),
            candidate_origin="semantic_mask_to_bbox_review",
        )
        for class_id, stats in sorted(mask_stats.items())
        if int(stats["images"]) > 0
    ]
    audit_mode = "semantic_segmentation_mask_to_bbox_audit" if candidates else "semantic_segmentation_pending_mask_to_bbox"
    source_row = base_source_row(row, mount_path, "audited", audit_mode)
    source_row["image_count"] = image_count
    source_row["annotation_file_count"] = len(files)
    source_row["class_count"] = len(candidates)
    source_row["candidate_count"] = len(candidates)
    source_row["warnings"] = "|".join(warnings[:20])
    if not candidates:
        source_row["warnings"] = "|".join([source_row["warnings"], "mask_to_bbox_adapter_required"]).strip("|")
    return source_row, candidates


def audit_source(row: dict[str, str], root: Path = KAGGLE_INPUT) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    decision = row.get("decision", "")
    if decision.startswith(SKIP_DECISION_PREFIXES):
        return base_source_row(row, None, "skipped_by_decision", "none"), []

    dataset_ref = row.get("dataset_ref", "")
    mount_path = find_dataset_mount(dataset_ref, root)
    if mount_path is None:
        return base_source_row(row, None, "missing_mount", "none"), []

    source_format = row.get("source_format", "").lower()
    yolo_root = find_yolo_root(mount_path, require_data_yaml=True)
    if yolo_root is None and ("yolo" in source_format or "detection" in source_format or "object_detection" in source_format):
        yolo_root = find_yolo_root(mount_path, require_data_yaml=False)
    if yolo_root is not None and ("yolo" in source_format or "detection" in source_format or "object_detection" in source_format):
        return audit_yolo_source(row, mount_path, yolo_root)
    if "uecfood" in source_format or "uec_food" in source_format:
        return audit_uecfood_source(row, mount_path)
    if "classification_csv" in source_format:
        return audit_classification_csv_source(row, mount_path)
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


def source_audit_summary(
    source_rows: list[dict[str, Any]],
    class_rows: list[dict[str, Any]],
    completed_all_sources: bool,
    stopped_reason: str = "",
) -> dict[str, Any]:
    summary = {
        "source_count": len(source_rows),
        "audited_source_count": sum(1 for row in source_rows if row.get("status") == "audited"),
        "missing_mount_count": sum(1 for row in source_rows if row.get("status") == "missing_mount"),
        "candidate_class_rows": len(class_rows),
        "total_candidate_images": sum(int(row.get("images") or 0) for row in class_rows),
        "audit_modes": dict(Counter(str(row.get("audit_mode", "")) for row in source_rows)),
        "completed_all_sources": completed_all_sources,
    }
    if stopped_reason:
        summary["stopped_reason"] = stopped_reason
    return summary


def write_report_bundle(
    report_dir: Path,
    reports_zip: Path,
    source_rows: list[dict[str, Any]],
    class_rows: list[dict[str, Any]],
    completed_all_sources: bool,
    stopped_reason: str = "",
) -> dict[str, Any]:
    write_csv(report_dir / "v4_source_audit.csv", source_rows, SOURCE_AUDIT_FIELDS)
    write_csv(report_dir / "class_candidates_v4.csv", class_rows, CLASS_CANDIDATE_FIELDS)
    summary = source_audit_summary(source_rows, class_rows, completed_all_sources, stopped_reason)
    write_json(report_dir / "v4_source_audit_summary.json", summary)
    zip_reports(report_dir, reports_zip)
    return summary


def main() -> int:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    manifest = read_csv(CODE_DIR / SOURCE_MANIFEST)
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
                source_rows.append(base_source_row(pending, None, "time_guard_pending", "none"))
            break
        dataset_ref = row.get("dataset_ref", "")
        print(f"V4_SOURCE_AUDIT_PROGRESS {index}/{len(manifest)} {dataset_ref}", flush=True)
        try:
            source_row, candidates = audit_source(row)
        except Exception as exc:
            source_row = base_source_row(row, None, "audit_error", "none")
            source_row["warnings"] = f"{type(exc).__name__}:{exc}"
            candidates = []
        source_rows.append(source_row)
        class_rows.extend(candidates)
        write_report_bundle(REPORT_DIR, REPORTS_ZIP, source_rows, class_rows, completed_all_sources=False)

    summary = write_report_bundle(
        REPORT_DIR,
        REPORTS_ZIP,
        source_rows,
        class_rows,
        completed_all_sources=completed_all_sources,
        stopped_reason=stopped_reason,
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
