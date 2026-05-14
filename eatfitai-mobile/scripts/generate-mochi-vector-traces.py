from __future__ import annotations

import json
import re
import tempfile
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

try:
    import vtracer
except ModuleNotFoundError as exc:
    raise SystemExit(
        "Missing Python package 'vtracer'. Install it with: python -m pip install --user vtracer",
    ) from exc


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "src" / "assets" / "mascot" / "mochi" / "characters"
OUTPUT_PATH = ROOT / "src" / "features" / "mochi" / "mochiVectorTraceAssets.ts"
BACKGROUND_MARKER_RGB = np.array([255, 0, 255], dtype=np.uint8)

ASSETS: list[tuple[str, str]] = [
    ("idle", "01_idle.png"),
    ("hello", "02_hello.png"),
    ("happy", "03_happy.png"),
    ("excited", "04_excited.png"),
    ("thinking", "05_thinking.png"),
    ("surprised", "06_surprised.png"),
    ("sleepy", "07_sleepy.png"),
    ("notebook", "08_notebook.png"),
    ("logCalorieNote", "09_log_calorie_note.png"),
    ("holdPhone", "10_hold_phone.png"),
    ("openApp", "11_open_app.png"),
    ("scanFood", "12_scan_food.png"),
    ("analyzeResult", "13_analyze_result.png"),
    ("showCalorie", "14_show_calorie.png"),
    ("breakfastLog", "15_breakfast_log.png"),
    ("lunchLog", "16_lunch_log.png"),
    ("dinnerLog", "17_dinner_log.png"),
    ("drinkWater", "18_drink_water.png"),
    ("healthyFood", "19_healthy_food.png"),
    ("smartChoice", "20_smart_choice.png"),
    ("reminder", "21_reminder.png"),
    ("exercise", "22_exercise.png"),
    ("streakTracking", "23_streak_tracking.png"),
    ("goalComplete", "24_goal_complete.png"),
]


@dataclass(frozen=True)
class TraceResult:
    svg: str
    width: int
    height: int
    path_count: int
    byte_length: int


def edge_background_mask(rgb: np.ndarray) -> np.ndarray:
    height, width = rgb.shape[:2]
    edge_pixels = np.concatenate(
        [rgb[0, :, :], rgb[-1, :, :], rgb[:, 0, :], rgb[:, -1, :]],
        axis=0,
    )
    edge_color = np.median(edge_pixels, axis=0)
    distance = np.linalg.norm(rgb.astype(np.int16) - edge_color.astype(np.int16), axis=2)
    max_channel = rgb.max(axis=2)
    min_channel = rgb.min(axis=2)

    # The existing crop PNGs are opaque and sit on a warm off-white paper background.
    # Flood filling from the edge prevents white eyes, teeth, and bottle highlights
    # from being accidentally removed.
    candidates = ((distance < 48) | ((max_channel > 225) & ((max_channel - min_channel) < 42))).astype(
        np.uint8,
    )
    visited = np.zeros((height, width), dtype=np.uint8)
    stack: list[tuple[int, int]] = []

    for x in range(width):
        if candidates[0, x]:
            stack.append((0, x))
        if candidates[height - 1, x]:
            stack.append((height - 1, x))

    for y in range(height):
        if candidates[y, 0]:
            stack.append((y, 0))
        if candidates[y, width - 1]:
            stack.append((y, width - 1))

    while stack:
        y, x = stack.pop()
        if visited[y, x] or not candidates[y, x]:
            continue

        visited[y, x] = 1
        if y > 0:
            stack.append((y - 1, x))
        if y < height - 1:
            stack.append((y + 1, x))
        if x > 0:
            stack.append((y, x - 1))
        if x < width - 1:
            stack.append((y, x + 1))

    return visited.astype(bool)


def prepare_trace_input(path: Path, out_path: Path) -> tuple[int, int]:
    image = Image.open(path).convert("RGBA")
    rgba = np.array(image)
    rgb = rgba[:, :, :3]
    height, width = rgb.shape[:2]

    background = edge_background_mask(rgb)
    alpha = np.where(background, 0, 255).astype(np.uint8)
    alpha = cv2.morphologyEx(alpha, cv2.MORPH_CLOSE, np.ones((2, 2), np.uint8))

    # VTracer traces RGB clusters, so a hard marker matte is more reliable than
    # alpha for transparent mascot assets. The marker paths are stripped from
    # the resulting SVG after vectorization.
    smoothed_rgb = cv2.bilateralFilter(rgb, 5, 28, 28)
    rgba[:, :, :3] = smoothed_rgb
    rgba[alpha == 0, :3] = BACKGROUND_MARKER_RGB
    rgba[:, :, 3] = 255
    Image.fromarray(rgba, "RGBA").save(out_path)

    return width, height


def is_background_marker(fill: str) -> bool:
    match = re.fullmatch(r"#([0-9a-fA-F]{6})", fill)
    if not match:
        return False

    value = match.group(1)
    red = int(value[0:2], 16)
    green = int(value[2:4], 16)
    blue = int(value[4:6], 16)
    return red >= 220 and green <= 70 and blue >= 220


def path_touches_canvas_edge(path_tag: str, width: int, height: int) -> bool:
    values = [float(value) for value in re.findall(r"-?\d+(?:\.\d+)?", path_tag)]
    if len(values) < 2:
        return False

    xs = values[0::2]
    ys = values[1::2]
    return min(xs) <= 1 or min(ys) <= 1 or max(xs) >= width - 1 or max(ys) >= height - 1


def strip_background_marker_paths(svg: str, width: int, height: int) -> str:
    path_pattern = re.compile(r"<path\b[^>]*\bfill=\"([^\"]+)\"[^>]*/?>\s*")
    return path_pattern.sub(
        lambda match: ""
        if is_background_marker(match.group(1)) and path_touches_canvas_edge(match.group(0), width, height)
        else match.group(0),
        svg,
    )


def normalize_svg(svg: str, width: int, height: int) -> str:
    svg = re.sub(r"<\?xml[^>]*>\s*", "", svg)
    svg = re.sub(r"<!--.*?-->\s*", "", svg, flags=re.DOTALL)
    svg = strip_background_marker_paths(svg, width, height)
    svg = re.sub(
        r"<svg[^>]*>",
        (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" '
            'preserveAspectRatio="xMidYMid meet">'
        ),
        svg,
        count=1,
    )
    return " ".join(svg.split())


def trace_png(path: Path) -> TraceResult:
    with tempfile.TemporaryDirectory(prefix="mochi-trace-") as temp_dir:
        temp_root = Path(temp_dir)
        clean_path = temp_root / "clean.png"
        svg_path = temp_root / "trace.svg"
        width, height = prepare_trace_input(path, clean_path)

        vtracer.convert_image_to_svg_py(
            str(clean_path),
            str(svg_path),
            colormode="color",
            hierarchical="cutout",
            mode="spline",
            filter_speckle=4,
            color_precision=8,
            layer_difference=8,
            corner_threshold=52,
            length_threshold=2.2,
            max_iterations=10,
            splice_threshold=40,
            path_precision=2,
        )

        svg = normalize_svg(svg_path.read_text(encoding="utf-8"), width, height)
        return TraceResult(
            svg=svg,
            width=width,
            height=height,
            path_count=svg.count("<path "),
            byte_length=len(svg.encode("utf-8")),
        )


def main() -> None:
    traces = {key: trace_png(ASSET_DIR / file_name) for key, file_name in ASSETS}
    lines = [
        "/* eslint-disable quotes */",
        "// Generated by scripts/generate-mochi-vector-traces.py.",
        "// Source: src/assets/mascot/mochi/characters/*.png",
        "import type { MochiPoseKey } from './mochiPoseCatalog';",
        "",
        "export type MochiVectorTraceMeta = {",
        "  width: number;",
        "  height: number;",
        "  pathCount: number;",
        "  byteLength: number;",
        "};",
        "",
        "export const MOCHI_VECTOR_TRACE_XML: Record<MochiPoseKey, string> = {",
    ]

    for key, _ in ASSETS:
        lines.append(f"  {key}: {json.dumps(traces[key].svg, ensure_ascii=False)},")

    lines.extend(["};", "", "export const MOCHI_VECTOR_TRACE_META: Record<MochiPoseKey, MochiVectorTraceMeta> = {"])
    for key, _ in ASSETS:
        trace = traces[key]
        lines.append(
            (
                f"  {key}: {{ width: {trace.width}, height: {trace.height}, "
                f"pathCount: {trace.path_count}, byteLength: {trace.byte_length} }},"
            ),
        )

    lines.extend(["};", ""])
    OUTPUT_PATH.write_text("\n".join(lines), encoding="utf-8")
    print(f"Generated {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
