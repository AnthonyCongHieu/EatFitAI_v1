from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

from build_clean_dataset import parse_audit_class_names
from common import IMAGE_EXTS, find_data_yaml, find_split_dirs, label_for_image, parse_data_yaml_names, read_label_rows


def source_class_names(source: dict, root: Path) -> dict[int, str]:
    names, _warnings = parse_data_yaml_names(find_data_yaml(root))
    return names or parse_audit_class_names(source)


def compact_label(label: str) -> str:
    return str(label).split(" (", 1)[0]


def parse_positive_int(value: object) -> int | None:
    try:
        parsed = int(str(value or "").strip())
    except ValueError:
        return None
    return parsed if parsed > 0 else None


def iter_images_limited(root: Path, limit: int | None):
    count = 0
    for path in root.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in IMAGE_EXTS:
            continue
        yield path
        count += 1
        if limit is not None and count >= limit:
            break


def select_diverse_samples(samples: list[tuple[Path, list[dict]]], max_images: int) -> list[tuple[Path, list[dict]]]:
    selected: list[tuple[Path, list[dict]]] = []
    fallback: list[tuple[Path, list[dict]]] = []
    covered_classes: set[int] = set()
    for image_path, label_rows in samples:
        class_ids = {int(row["class_id"]) for row in label_rows if "class_id" in row}
        if class_ids - covered_classes:
            selected.append((image_path, label_rows))
            covered_classes.update(class_ids)
            if len(selected) >= max_images:
                return selected
        elif len(fallback) < max_images:
            fallback.append((image_path, label_rows))
    return (selected + fallback)[:max_images]


def add_diverse_sample(
    selected: list[tuple[Path, list[dict]]],
    fallback: list[tuple[Path, list[dict]]],
    covered_classes: set[int],
    image_path: Path,
    label_rows: list[dict],
    max_images: int,
) -> None:
    class_ids = {int(row["class_id"]) for row in label_rows if "class_id" in row}
    if class_ids - covered_classes:
        selected.append((image_path, label_rows))
        covered_classes.update(class_ids)
    elif len(fallback) < max_images:
        fallback.append((image_path, label_rows))


def draw_source_grid(source: dict, out_dir: Path, max_images: int) -> str:
    try:
        from PIL import Image, ImageDraw, ImageFont  # type: ignore
    except Exception as exc:
        raise RuntimeError("Pillow is required to generate sample grids.") from exc

    source_slug = source["source_slug"]
    root = Path(source.get("extracted_path", ""))
    if not root.exists():
        return ""
    names = source_class_names(source, root)
    selected: list[tuple[Path, list[dict]]] = []
    fallback: list[tuple[Path, list[dict]]] = []
    covered_classes: set[int] = set()
    scan_limit = parse_positive_int(source.get("audit_image_limit")) or max_images * 200
    scanned = 0
    for image_dir, label_dir in find_split_dirs(root).values():
        for image_path in iter_images_limited(image_dir, max(scan_limit - scanned, 0)):
            scanned += 1
            label_path = label_for_image(image_path, image_dir, label_dir)
            if label_path.exists():
                rows, _counts = read_label_rows(label_path, len(names) if names else None)
                if rows:
                    add_diverse_sample(selected, fallback, covered_classes, image_path, rows, max_images)
            if len(selected) >= max_images or scanned >= scan_limit:
                break
        if len(selected) >= max_images or scanned >= scan_limit:
            break
    samples = (selected + fallback)[:max_images]
    if not samples:
        return ""

    thumb_w, thumb_h = 240, 180
    cols = 4
    rows_n = (len(samples) + cols - 1) // cols
    grid = Image.new("RGB", (cols * thumb_w, rows_n * thumb_h), "white")
    draw = ImageDraw.Draw(grid)
    font = ImageFont.load_default()
    for idx, (image_path, label_rows) in enumerate(samples):
        cell_x = (idx % cols) * thumb_w
        cell_y = (idx // cols) * thumb_h
        with Image.open(image_path) as img:
            img = img.convert("RGB")
            original_w, original_h = img.size
            img.thumbnail((thumb_w, thumb_h))
            offset_x = cell_x + (thumb_w - img.width) // 2
            offset_y = cell_y + (thumb_h - img.height) // 2
            grid.paste(img, (offset_x, offset_y))
            scale_x = img.width / original_w
            scale_y = img.height / original_h
            for row in label_rows:
                x, y, w, h = row["bbox"]
                left = offset_x + (x - w / 2) * original_w * scale_x
                top = offset_y + (y - h / 2) * original_h * scale_y
                right = offset_x + (x + w / 2) * original_w * scale_x
                bottom = offset_y + (y + h / 2) * original_h * scale_y
                draw.rectangle([left, top, right, bottom], outline="red", width=2)
                label = compact_label(names.get(row["class_id"], str(row["class_id"])))
                draw.text((left + 2, max(top + 2, offset_y)), label, fill="yellow", font=font, stroke_width=1, stroke_fill="black")
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{source_slug}.jpg"
    grid.save(out_path, quality=90)
    return str(out_path)


def update_audit_csv(csv_path: Path, grid_paths: dict[str, str]) -> None:
    if not csv_path.exists():
        return
    with csv_path.open("r", encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))
        fieldnames = list(rows[0].keys()) if rows else []
    if "sample_grid_path" not in fieldnames:
        fieldnames.append("sample_grid_path")
    for row in rows:
        row["sample_grid_path"] = grid_paths.get(row.get("source_slug", ""), row.get("sample_grid_path", ""))
    with csv_path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate bbox sample grids for audited raw sources.")
    parser.add_argument("--audit-json", type=Path, default=Path("_dataset_v2_reports/source_audit.json"))
    parser.add_argument("--out-dir", type=Path, default=Path("_dataset_v2_reports/sample_grids"))
    parser.add_argument("--max-images", type=int, default=32)
    args = parser.parse_args()

    sources = json.loads(args.audit_json.read_text(encoding="utf-8"))
    grid_paths: dict[str, str] = {}
    for source in sources:
        path = draw_source_grid(source, args.out_dir, args.max_images)
        if path:
            source["sample_grid_path"] = path
            grid_paths[source["source_slug"]] = path
    args.audit_json.write_text(json.dumps(sources, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    update_audit_csv(args.audit_json.with_suffix(".csv"), grid_paths)
    print(f"Generated {len(grid_paths)} sample grids in {args.out_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
