from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "tools" / "mascot" / "sources"
OUTPUT_DIR = ROOT / "src" / "assets" / "mascot" / "mochi" / "sprites"
ASSET_FILE = ROOT / "src" / "assets" / "mascot" / "mochi" / "mochiAssets.ts"
CANVAS_SIZE = 768
ALPHA_THRESHOLD = 16
MIN_COMPONENT_PIXELS = 1000


@dataclass(frozen=True)
class Component:
    x1: int
    y1: int
    x2: int
    y2: int
    pixels: int


@dataclass(frozen=True)
class PoseDefinition:
    key: str
    file_name: str
    source_sheet: str
    include_components: tuple[int, ...]
    variant: str
    label_vi: str
    accessibility_label: str


POSES: list[PoseDefinition] = [
    PoseDefinition("idle", "01_idle.png", "mochi-source-1.png", (5,), "full", "Đứng chờ", "MoChi đứng chờ"),
    PoseDefinition("angry", "02_angry.png", "mochi-source-1.png", (6,), "full", "Căng thẳng", "MoChi căng thẳng"),
    PoseDefinition("sadCry", "03_sad_cry.png", "mochi-source-1.png", (7,), "full", "Buồn", "MoChi buồn"),
    PoseDefinition("celebrate", "04_celebrate.png", "mochi-source-1.png", (1,), "full", "Ăn mừng", "MoChi ăn mừng"),
    PoseDefinition("confused", "05_confused.png", "mochi-source-1.png", (3, 4, 8), "full", "Bối rối", "MoChi bối rối"),
    PoseDefinition("calm", "06_calm.png", "mochi-source-1.png", (2,), "full", "Bình tĩnh", "MoChi bình tĩnh"),
    PoseDefinition("foodPhone", "07_food_phone.png", "mochi-source-1.png", (9,), "notice", "Nhắc ghi bữa", "MoChi nhắc ghi bữa"),
    PoseDefinition("analyzing", "08_analyzing.png", "mochi-source-1.png", (12, 14), "notice", "Đang phân tích", "MoChi đang phân tích"),
    PoseDefinition("hydrate", "09_hydrate.png", "mochi-source-1.png", (10, 11), "notice", "Nhắc uống nước", "MoChi nhắc uống nước"),
    PoseDefinition("thumbsUp", "10_thumbs_up.png", "mochi-source-1.png", (13,), "notice", "Tốt lắm", "MoChi khen tốt lắm"),
    PoseDefinition("sparkleSuccess", "11_sparkle_success.png", "mochi-source-2.png", (1,), "full", "Thành công rực rỡ", "MoChi ăn mừng thành công"),
    PoseDefinition("faceShocked", "12_face_shocked.png", "mochi-source-1.png", (15,), "face", "Hoảng hốt", "MoChi hoảng hốt"),
    PoseDefinition("faceSurprised", "13_face_surprised.png", "mochi-source-1.png", (16,), "face", "Ngạc nhiên", "MoChi ngạc nhiên"),
    PoseDefinition("faceSad", "14_face_sad.png", "mochi-source-1.png", (19,), "face", "Mặt buồn", "MoChi mặt buồn"),
    PoseDefinition("faceTired", "15_face_tired.png", "mochi-source-1.png", (20,), "face", "Mệt mỏi", "MoChi mệt mỏi"),
    PoseDefinition("faceThinking", "16_face_thinking.png", "mochi-source-1.png", (17,), "face", "Suy nghĩ", "MoChi suy nghĩ"),
    PoseDefinition("faceHappy", "17_face_happy.png", "mochi-source-1.png", (18,), "face", "Vui vẻ", "MoChi vui vẻ"),
    PoseDefinition("faceEmbarrassed", "18_face_embarrassed.png", "mochi-source-1.png", (21,), "face", "Ngại ngùng", "MoChi ngại ngùng"),
    PoseDefinition("faceCalm", "19_face_calm.png", "mochi-source-1.png", (22,), "face", "Điềm tĩnh", "MoChi điềm tĩnh"),
    PoseDefinition("faceLove", "20_face_love.png", "mochi-source-1.png", (23,), "face", "Yêu thích", "MoChi yêu thích"),
    PoseDefinition("faceDetermined", "21_face_determined.png", "mochi-source-1.png", (24,), "face", "Quyết tâm", "MoChi quyết tâm"),
    PoseDefinition("islandAvatar", "44_island_avatar.png", "mochi-source-1.png", (25,), "face", "Đại diện MoChi", "MoChi đang theo dõi ngữ cảnh"),
    PoseDefinition("faceCheerful", "22_face_cheerful.png", "mochi-source-1.png", (25,), "face", "Tươi tỉnh", "MoChi tươi tỉnh"),
    PoseDefinition("faceStrained", "23_face_strained.png", "mochi-source-1.png", (26,), "face", "Khó chịu", "MoChi khó chịu"),
    PoseDefinition("foodScale", "24_food_scale.png", "mochi-source-2.png", (4,), "full", "Cân món ăn", "MoChi cân món ăn"),
    PoseDefinition("cakeConcern", "25_cake_concern.png", "mochi-source-2.png", (6, 7), "full", "Cân nhắc món ngọt", "MoChi cân nhắc món ngọt"),
    PoseDefinition("tabletLog", "26_tablet_log.png", "mochi-source-2.png", (2,), "full", "Ghi trên tablet", "MoChi ghi trên tablet"),
    PoseDefinition("tabletMeal", "27_tablet_meal.png", "mochi-source-2.png", (5,), "full", "Ghi bữa ăn", "MoChi ghi bữa ăn"),
    PoseDefinition("carbExplain", "28_carb_explain.png", "mochi-source-2.png", (3, 8), "notice", "Giải thích dinh dưỡng", "MoChi giải thích dinh dưỡng"),
    PoseDefinition("saladSuccess", "29_salad_success.png", "mochi-source-2.png", (10,), "notice", "Ghi bữa thành công", "MoChi ghi bữa thành công"),
    PoseDefinition("burgerSurprise", "30_burger_surprise.png", "mochi-source-2.png", (11,), "notice", "Ngạc nhiên với món ăn", "MoChi ngạc nhiên với món ăn"),
    PoseDefinition("mealChoice", "31_meal_choice.png", "mochi-source-2.png", (12, 16), "notice", "Chọn món", "MoChi chọn món"),
    PoseDefinition("workout", "32_workout.png", "mochi-source-2.png", (13,), "full", "Tập luyện", "MoChi tập luyện"),
    PoseDefinition("heartLove", "33_heart_love.png", "mochi-source-2.png", (9, 14), "notice", "Yêu thích", "MoChi yêu thích"),
    PoseDefinition("healthyBasket", "34_healthy_basket.png", "mochi-source-2.png", (15,), "notice", "Giỏ món lành mạnh", "MoChi cầm giỏ món lành mạnh"),
    PoseDefinition("weighIn", "35_weigh_in.png", "mochi-source-2.png", (18,), "full", "Cân nặng", "MoChi cân nặng"),
    PoseDefinition("waterGlass", "36_water_glass.png", "mochi-source-2.png", (21, 22), "notice", "Ly nước", "MoChi cầm ly nước"),
    PoseDefinition("reportReview", "37_report_review.png", "mochi-source-2.png", (19,), "notice", "Xem báo cáo", "MoChi xem báo cáo"),
    PoseDefinition("reportPanic", "38_report_panic.png", "mochi-source-2.png", (17, 16), "notice", "Báo cáo căng", "MoChi căng thẳng với báo cáo"),
    PoseDefinition("phoneMealPrep", "39_phone_meal_prep.png", "mochi-source-2.png", (26, 30), "notice", "Chuẩn bị bữa", "MoChi chuẩn bị bữa"),
    PoseDefinition("dietWarning", "40_diet_warning.png", "mochi-source-2.png", (29,), "notice", "Cảnh báo ăn kiêng", "MoChi cảnh báo ăn kiêng"),
    PoseDefinition("cookingPrep", "41_cooking_prep.png", "mochi-source-2.png", (27,), "notice", "Chuẩn bị nấu", "MoChi chuẩn bị nấu"),
    PoseDefinition("spinChoice", "42_spin_choice.png", "mochi-source-2.png", (28,), "full", "Vòng chọn món", "MoChi quay vòng chọn món"),
    PoseDefinition("boxIdle", "43_box_idle.png", "mochi-source-2.png", (24,), "full", "Đứng trên bục", "MoChi đứng trên bục"),
]


def find_components(image: Image.Image) -> list[Component]:
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    width, height = alpha.size
    pixels = alpha.load()
    mask = bytearray(width * height)
    for y in range(height):
        row = y * width
        for x in range(width):
            if pixels[x, y] > ALPHA_THRESHOLD:
                mask[row + x] = 1

    seen = bytearray(width * height)
    components: list[Component] = []
    for y in range(height):
        for x in range(width):
            index = y * width + x
            if not mask[index] or seen[index]:
                continue

            queue: deque[tuple[int, int]] = deque([(x, y)])
            seen[index] = 1
            x1 = x2 = x
            y1 = y2 = y
            count = 0

            while queue:
                cx, cy = queue.popleft()
                count += 1
                x1 = min(x1, cx)
                x2 = max(x2, cx)
                y1 = min(y1, cy)
                y2 = max(y2, cy)

                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < width and 0 <= ny < height:
                        next_index = ny * width + nx
                        if mask[next_index] and not seen[next_index]:
                            seen[next_index] = 1
                            queue.append((nx, ny))

            if count >= MIN_COMPONENT_PIXELS:
                components.append(Component(x1, y1, x2, y2, count))

    return sorted(components, key=lambda component: (component.y1, component.x1))


def component_bounds(components: list[Component], include: tuple[int, ...]) -> tuple[int, int, int, int]:
    selected = [components[index - 1] for index in include]
    return (
        min(component.x1 for component in selected),
        min(component.y1 for component in selected),
        max(component.x2 for component in selected),
        max(component.y2 for component in selected),
    )


def render_pose(source_image: Image.Image, components: list[Component], pose: PoseDefinition) -> Image.Image:
    x1, y1, x2, y2 = component_bounds(components, pose.include_components)
    margin = 24
    x1 = max(0, x1 - margin)
    y1 = max(0, y1 - margin)
    x2 = min(source_image.width - 1, x2 + margin)
    y2 = min(source_image.height - 1, y2 + margin)

    crop = source_image.crop((x1, y1, x2 + 1, y2 + 1)).convert("RGBA")
    scale = min((CANVAS_SIZE - 64) / crop.width, (CANVAS_SIZE - 64) / crop.height)
    resized_size = (max(1, round(crop.width * scale)), max(1, round(crop.height * scale)))
    resample = getattr(Image, "Resampling", Image).LANCZOS
    crop = crop.resize(resized_size, resample)

    canvas = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (255, 255, 255, 0))
    offset = ((CANVAS_SIZE - crop.width) // 2, (CANVAS_SIZE - crop.height) // 2)
    canvas.alpha_composite(crop, offset)
    return canvas


def ts_string(value: str) -> str:
    return "'" + value.replace("\\", "\\\\").replace("'", "\\'") + "'"


def write_asset_file() -> None:
    keys = [pose.key for pose in POSES]
    lines = [
        "// Generated by scripts/generate-mochi-sprites.py.",
        "// Source art: mochi-source-1.png and mochi-source-2.png.",
        "import type { ImageSourcePropType } from 'react-native';",
        "",
        "export type MoChiSpriteVariant = 'full' | 'face' | 'notice';",
        "",
        "export type MoChiPoseKey =",
    ]
    lines.extend([f"  | {ts_string(key)}" for key in keys])
    lines[-1] += ";"
    lines.extend(
        [
            "",
            "export type MoChiSpriteMeta = {",
            "  key: MoChiPoseKey;",
            "  fileName: string;",
            "  sourceSheet: 'mochi-source-1.png' | 'mochi-source-2.png';",
            "  includeComponents: number[];",
            "  variant: MoChiSpriteVariant;",
            "  labelVi: string;",
            "  accessibilityLabel: string;",
            "};",
            "",
            "export const MOCHI_SPRITES: Record<MoChiPoseKey, ImageSourcePropType> = {",
        ],
    )
    for pose in POSES:
        lines.append(f"  {pose.key}: require('./sprites/{pose.file_name}'),")
    lines.extend(["};", "", "export const MOCHI_SPRITE_METADATA: Record<MoChiPoseKey, MoChiSpriteMeta> = {"])
    for pose in POSES:
        components = ", ".join(str(component) for component in pose.include_components)
        lines.append(
            "  "
            + pose.key
            + ": { "
            + f"key: {ts_string(pose.key)}, "
            + f"fileName: {ts_string(pose.file_name)}, "
            + f"sourceSheet: {ts_string(pose.source_sheet)}, "
            + f"includeComponents: [{components}], "
            + f"variant: {ts_string(pose.variant)}, "
            + f"labelVi: {ts_string(pose.label_vi)}, "
            + f"accessibilityLabel: {ts_string(pose.accessibility_label)}"
            + " },"
        )
    lines.extend(["};", ""])
    ASSET_FILE.write_text("\n".join(lines), encoding="utf-8", newline="\n")


def main() -> None:
    source_images: dict[str, Image.Image] = {}
    source_components: dict[str, list[Component]] = {}

    for source_name in sorted({pose.source_sheet for pose in POSES}):
        source_path = SOURCE_DIR / source_name
        if not source_path.exists():
            raise SystemExit(f"Missing source image: {source_path}")

        image = Image.open(source_path).convert("RGBA")
        components = find_components(image)
        source_images[source_name] = image
        source_components[source_name] = components

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for existing in OUTPUT_DIR.glob("*.png"):
        existing.unlink()

    for pose in POSES:
        image = render_pose(source_images[pose.source_sheet], source_components[pose.source_sheet], pose)
        image.save(OUTPUT_DIR / pose.file_name, optimize=True)

    write_asset_file()
    print(f"Generated {len(POSES)} MoChi sprites in {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
