from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

from common import find_data_yaml, find_split_dirs, label_for_image, list_images, parse_data_yaml_names, read_label_rows


def draw_source_grid(source: dict, out_dir: Path, max_images: int) -> str:
    try:
        from PIL import Image, ImageDraw, ImageFont  # type: ignore
    except Exception as exc:
        raise RuntimeError("Pillow is required to generate sample grids.") from exc

    source_slug = source["source_slug"]
    root = Path(source.get("extracted_path", ""))
    if not root.exists():
        return ""
    names, _warnings = parse_data_yaml_names(find_data_yaml(root))
    samples = []
    for image_dir, label_dir in find_split_dirs(root).values():
        for image_path in list_images(image_dir):
            label_path = label_for_image(image_path, image_dir, label_dir)
            if label_path.exists():
                rows, _counts = read_label_rows(label_path, len(names) if names else None)
                if rows:
                    samples.append((image_path, rows))
            if len(samples) >= max_images:
                break
        if len(samples) >= max_images:
            break
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
                label = names.get(row["class_id"], str(row["class_id"]))
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
