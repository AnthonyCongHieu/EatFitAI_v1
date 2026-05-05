from __future__ import annotations

import csv
import hashlib
import json
import re
import unicodedata
from collections import Counter
from pathlib import Path
from typing import Any, Iterable

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
SPLIT_ALIASES = {"train": "train", "valid": "valid", "val": "valid", "test": "test"}
BAD_TEXT_MARKERS = (
    "\ufffd",
    "\u00c3\u00a1\u00c2\u00ba",
    "\u00c3\u00a1\u00c2\u00bb",
    "\u00c3",
    "\u00c2",
    "\u00e1\u00ba",
    "\u00e1\u00bb",
)


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8-sig", errors="replace")


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_csv(path: Path, rows: list[dict[str, Any]], fieldnames: list[str] | None = None) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if fieldnames is None:
        keys: list[str] = []
        for row in rows:
            for key in row:
                if key not in keys:
                    keys.append(key)
        fieldnames = keys
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({key: row.get(key, "") for key in fieldnames})


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def load_yaml(path: Path) -> Any:
    try:
        import yaml  # type: ignore
    except Exception as exc:
        raise RuntimeError("PyYAML is required for this YAML file. Install pyyaml or run in Kaggle/Colab.") from exc
    with path.open("r", encoding="utf-8-sig") as f:
        return yaml.safe_load(f) or {}


def dump_yaml(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        import yaml  # type: ignore
    except Exception:
        path.write_text(render_simple_yaml(data), encoding="utf-8")
        return
    with path.open("w", encoding="utf-8") as f:
        yaml.safe_dump(data, f, sort_keys=False, allow_unicode=True)


def render_simple_yaml(data: dict[str, Any], indent: int = 0) -> str:
    lines: list[str] = []
    pad = " " * indent
    for key, value in data.items():
        if isinstance(value, dict):
            lines.append(f"{pad}{key}:")
            lines.append(render_simple_yaml(value, indent + 2).rstrip())
        elif isinstance(value, list):
            lines.append(f"{pad}{key}:")
            for item in value:
                lines.append(f"{pad}  - {item}")
        else:
            lines.append(f"{pad}{key}: {value}")
    return "\n".join(lines) + "\n"


def detect_text_warnings(value: str) -> list[str]:
    warnings: list[str] = []
    if any(marker in value for marker in BAD_TEXT_MARKERS):
        warnings.append("possible_mojibake_or_replacement_char")
    if "\r\n" in value and "\n" in value.replace("\r\n", ""):
        warnings.append("mixed_newlines")
    return warnings


def normalize_label(name: str) -> str:
    text = unicodedata.normalize("NFKD", str(name)).encode("ascii", "ignore").decode("ascii")
    text = text.strip().lower()
    text = re.sub(r"[^a-z0-9_\s-]", "", text)
    text = re.sub(r"[\s-]+", "_", text)
    text = re.sub(r"_+", "_", text)
    return text.strip("_")


def sha256_file(path: Path, chunk_size: int = 1024 * 1024) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(chunk_size), b""):
            digest.update(chunk)
    return digest.hexdigest()


def list_images(root: Path) -> list[Path]:
    return sorted(p for p in root.rglob("*") if p.is_file() and p.suffix.lower() in IMAGE_EXTS)


def label_for_image(image_path: Path, image_dir: Path, label_dir: Path) -> Path:
    rel = image_path.relative_to(image_dir).with_suffix(".txt")
    return label_dir / rel


def find_data_yaml(root: Path) -> Path | None:
    for name in ("data.yaml", "data.yml"):
        direct = root / name
        if direct.exists():
            return direct
    candidates = sorted(root.rglob("data.y*ml"))
    return candidates[0] if candidates else None


def parse_data_yaml_names(path: Path | None) -> tuple[dict[int, str], list[str]]:
    if path is None:
        return {}, ["data_yaml_missing"]
    raw = read_text(path)
    warnings = detect_text_warnings(raw)
    try:
        data = load_yaml(path)
        names = data.get("names", {})
        if isinstance(names, list):
            return {idx: str(name) for idx, name in enumerate(names)}, warnings
        if isinstance(names, dict):
            parsed: dict[int, str] = {}
            for key, value in names.items():
                try:
                    parsed[int(key)] = str(value)
                except ValueError:
                    warnings.append(f"invalid_class_id:{key}")
            return dict(sorted(parsed.items())), warnings
    except Exception as exc:
        warnings.append(f"yaml_parse_failed:{exc}")
    return parse_names_fallback(raw), warnings


def parse_names_fallback(raw: str) -> dict[int, str]:
    names: dict[int, str] = {}
    in_names = False
    list_idx = 0
    for line in raw.splitlines():
        stripped = line.strip()
        if stripped == "names:":
            in_names = True
            continue
        if not in_names:
            continue
        if not stripped:
            continue
        if not line.startswith((" ", "\t", "-", "  -")):
            break
        match = re.match(r"['\"]?(\d+)['\"]?\s*:\s*(.+)$", stripped)
        if match:
            names[int(match.group(1))] = match.group(2).strip().strip("'\"")
            continue
        if stripped.startswith("-"):
            names[list_idx] = stripped[1:].strip().strip("'\"")
            list_idx += 1
    return names


def find_split_dirs(root: Path) -> dict[str, tuple[Path, Path]]:
    splits: dict[str, tuple[Path, Path]] = {}
    for directory in [root, *root.rglob("*")]:
        if not directory.is_dir() or directory.name.lower() not in SPLIT_ALIASES:
            continue
        image_dir = directory / "images"
        label_dir = directory / "labels"
        if image_dir.is_dir() and label_dir.is_dir():
            splits[SPLIT_ALIASES[directory.name.lower()]] = (image_dir, label_dir)
    for image_parent in [root / "images", *[path for path in root.rglob("images") if path.is_dir()]]:
        if not image_parent.is_dir():
            continue
        label_parent = image_parent.parent / "labels"
        if not label_parent.is_dir():
            continue
        for image_dir in sorted(path for path in image_parent.iterdir() if path.is_dir()):
            split_name = SPLIT_ALIASES.get(image_dir.name.lower())
            if not split_name:
                continue
            label_dir = label_parent / image_dir.name
            if label_dir.is_dir():
                splits[split_name] = (image_dir, label_dir)
    return splits


def parse_label_row(line: str, class_count: int | None = None) -> dict[str, Any]:
    parts = line.strip().split()
    if not parts:
        return {"kind": "empty"}
    if len(parts) < 5:
        return {"kind": "malformed", "reason": "too_few_columns"}
    try:
        class_id_float = float(parts[0])
        class_id = int(class_id_float)
        if class_id_float != class_id:
            return {"kind": "malformed", "reason": "non_integer_class_id"}
    except ValueError:
        return {"kind": "malformed", "reason": "invalid_class_id"}
    try:
        values = [float(part) for part in parts[1:]]
    except ValueError:
        return {"kind": "malformed", "reason": "invalid_float"}
    if class_count is not None and (class_id < 0 or class_id >= class_count):
        return {"kind": "class_out_of_range", "class_id": class_id}
    if len(values) == 4:
        bbox = values
        kind = "detect"
    elif len(values) >= 6 and len(values) % 2 == 0:
        xs = values[0::2]
        ys = values[1::2]
        bbox = [
            (min(xs) + max(xs)) / 2,
            (min(ys) + max(ys)) / 2,
            max(xs) - min(xs),
            max(ys) - min(ys),
        ]
        kind = "segment"
    else:
        return {"kind": "malformed", "reason": "invalid_column_count"}
    x, y, w, h = bbox
    if w <= 0 or h <= 0:
        return {"kind": "malformed", "reason": "non_positive_bbox", "class_id": class_id}
    if any(v < 0 or v > 1 for v in (x, y, w, h)):
        return {"kind": "bbox_out_of_bounds", "class_id": class_id, "bbox": bbox}
    if w < 0.001 or h < 0.001:
        return {"kind": "bbox_too_small", "class_id": class_id, "bbox": bbox}
    if w > 1 or h > 1:
        return {"kind": "bbox_too_large", "class_id": class_id, "bbox": bbox}
    return {"kind": kind, "class_id": class_id, "bbox": bbox}


def read_label_rows(path: Path, class_count: int | None = None) -> tuple[list[dict[str, Any]], Counter[str]]:
    parsed: list[dict[str, Any]] = []
    counts: Counter[str] = Counter()
    if not path.exists():
        counts["missing"] += 1
        return parsed, counts
    for line_number, line in enumerate(read_text(path).splitlines(), start=1):
        row = parse_label_row(line, class_count)
        row["line_number"] = line_number
        row["raw"] = line.strip()
        counts[row["kind"]] += 1
        if row["kind"] in {"detect", "segment"}:
            parsed.append(row)
    return parsed, counts


def summarize_class_counts(rows: Iterable[dict[str, Any]], names: dict[int, str]) -> dict[str, int]:
    counter: Counter[str] = Counter()
    for row in rows:
        class_id = row.get("class_id")
        class_name = names.get(class_id, str(class_id))
        counter[class_name] += 1
    return dict(sorted(counter.items()))


def image_opens(path: Path) -> tuple[bool, tuple[int, int] | None]:
    try:
        from PIL import Image  # type: ignore
    except Exception:
        return True, None
    try:
        with Image.open(path) as img:
            img.verify()
        with Image.open(path) as img:
            width, height = img.size
        return width >= 64 and height >= 64, (width, height)
    except Exception:
        return False, None


def decide_source(metrics: dict[str, Any], initial_decision: str = "") -> tuple[str, str]:
    if initial_decision == "QUARANTINE":
        return "QUARANTINE", "Initial manifest quarantines this source"
    if not metrics.get("data_yaml_found"):
        return "QUARANTINE", "Missing data.yaml"
    if metrics.get("image_count", 0) == 0 or metrics.get("label_count", 0) == 0:
        return "QUARANTINE", "No usable YOLO image/label split found"
    hard_issue_count = sum(
        int(metrics.get(key, 0))
        for key in (
            "malformed_row_count",
            "class_out_of_range_count",
            "bbox_out_of_bounds_count",
            "images_open_failed_count",
        )
    )
    if hard_issue_count:
        return "CHERRY_PICK", "Hard label/image issues require filtering"
    if int(metrics.get("segment_row_count", 0)):
        return "ACCEPT_FILTERED", "Segmentation rows require bbox conversion"
    if int(metrics.get("duplicate_exact_label_row_count", 0)):
        return "ACCEPT_FILTERED", "Duplicate label rows require cleanup"
    return "ACCEPT_FILTERED", "Audit clean; sample grid/manual review still required before full accept"
