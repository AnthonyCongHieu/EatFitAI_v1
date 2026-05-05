from __future__ import annotations

import argparse
import csv
import json
import os
import re
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable

import requests


UNIVERSE_SEARCH_URL = "https://api.roboflow.com/universe/search"
API_ROOT = "https://api.roboflow.com"

DEFAULT_QUERIES = [
    "vietnamese food object detection images>500",
    "vietnam food object detection images>500",
    "class:pho object detection",
    "class:banh object detection",
    "class:banh_mi object detection",
    "class:com_tam object detection",
    "food ingredient object detection images>500",
    "spice food ingredient object detection",
    "vegetable ingredient object detection images>500",
    "fish meat food ingredient object detection",
    "thai food object detection images>500",
]

VIETNAMESE_CLASS_TERMS = {
    "banh",
    "bun",
    "pho",
    "com",
    "goi",
    "cha",
    "nem",
    "xoi",
    "bo_kho",
    "hu_tieu",
    "mi_quang",
    "banh_mi",
    "com_tam",
    "bun_bo",
    "bun_cha",
    "banh_xeo",
    "banh_canh",
    "banh_beo",
    "banh_khot",
    "goi_cuon",
    "bot_chien",
    "canh",
    "ca",
    "ca_chua",
    "ca_kho",
    "dua_leo",
    "do_chua",
    "hanh",
    "nuoc_cham",
    "rau",
    "suon",
    "thit",
    "thit_kho",
    "trung",
    "trung_op_la",
    "betel_leaf",
    "bitter_melon_soup",
    "caramelized_fish",
    "chicken_rice",
    "crab_paste_vermicelli",
    "fresh_spring_rolls",
    "fried_rice",
    "oily_scallion",
    "pumpkin_soup",
    "purple_yam_soup",
    "sesame_donut",
    "sizzling_beef_steak",
    "steamed_pork_belly",
    "sticky_rice_cake",
    "vietnamese_baguette",
    "vietnamese_beef_noodle",
    "vermicelli_soup",
}
INGREDIENT_TERMS = {
    "beef",
    "pork",
    "chicken",
    "fish",
    "shrimp",
    "squid",
    "egg",
    "tofu",
    "garlic",
    "onion",
    "ginger",
    "chili",
    "pepper",
    "lemongrass",
    "carrot",
    "cabbage",
    "cucumber",
    "tomato",
    "potato",
    "mushroom",
    "leaf",
    "herb",
    "ca",
    "ca_chua",
    "ca_rot",
    "dua_leo",
    "hanh",
    "nam",
    "ot",
    "rau",
    "thit",
    "tom",
    "trung",
    "bawang_besar",
    "bawang_merah",
    "bawang_putih",
    "ketumbar",
    "pelaga",
    "cengkih",
    "lawang",
    "limau_purut",
    "halia",
    "jintan",
    "kayu_manis",
    "lengkuas",
}
FOOD_DOMAIN_TERMS = {
    "asian_food",
    "beverage",
    "cooking",
    "cuisine",
    "dish",
    "drink",
    "food",
    "fruit",
    "ingredient",
    "meal",
    "menu",
    "recipe",
    "spice",
    "vegetable",
}
REJECT_TERMS = {
    "captcha",
    "icon",
    "logo",
    "barcode",
    "weed",
    "trash",
    "plastic",
    "skin",
    "defect",
    "disease",
    "leaf disease",
}


@dataclass
class RoboflowCandidate:
    source_ref: str
    name: str
    url: str
    workspace: str
    project: str
    latest_version: str = ""
    project_type: str = ""
    license: str = ""
    images: int = 0
    version_images: int = 0
    class_count: int = 0
    version_class_count: int = 0
    classes: list[str] = field(default_factory=list)
    downloads: int = 0
    stars: int = 0
    views: int = 0
    matched_queries: list[str] = field(default_factory=list)
    exports: list[str] = field(default_factory=list)
    metadata_status: str = "search_result"
    score: float = 0.0
    tier: str = ""
    lane: str = ""
    reasons: list[str] = field(default_factory=list)


def strip_accents(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    return "".join(char for char in normalized if not unicodedata.combining(char))


def normalize_text(value: object) -> str:
    text = strip_accents(str(value or "").strip().lower())
    return re.sub(r"[^a-z0-9]+", "_", text).strip("_")


def token_keys(value: object) -> set[str]:
    tokens = [token for token in normalize_text(value).split("_") if token]
    keys = set(tokens)
    for width in (2, 3, 4):
        for index in range(0, max(len(tokens) - width + 1, 0)):
            keys.add("_".join(tokens[index : index + width]))
    return keys


def contains_any(text: str, terms: Iterable[str]) -> bool:
    keys = token_keys(text)
    return any(normalize_text(term) in keys for term in terms)


def count_matching_classes(classes: list[str], terms: set[str]) -> int:
    count = 0
    for name in classes:
        if contains_any(name, terms):
            count += 1
    return count


def safe_int(value: object) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


def project_slug_from_url(url: str) -> tuple[str, str]:
    parts = url.rstrip("/").split("/")
    if len(parts) < 2:
        return "", ""
    return parts[-2], parts[-1]


def candidate_from_search_result(item: dict[str, Any], query: str) -> RoboflowCandidate:
    workspace = item.get("workspace") or {}
    workspace_slug = str(workspace.get("url") or "")
    project_slug = project_slug_from_url(str(item.get("url") or ""))[1]
    classes = [str(name) for name in (item.get("classes") or [])]
    return RoboflowCandidate(
        source_ref=f"roboflow:{workspace_slug}/{project_slug}",
        name=str(item.get("name") or ""),
        url=str(item.get("url") or ""),
        workspace=workspace_slug,
        project=project_slug,
        latest_version=str(item.get("latestVersion") or ""),
        project_type=str(item.get("type") or ""),
        license=str(item.get("license") or ""),
        images=safe_int(item.get("images")),
        class_count=safe_int(item.get("classCount")),
        classes=classes,
        downloads=safe_int(item.get("downloads")),
        stars=safe_int(item.get("stars")),
        views=safe_int(item.get("views")),
        matched_queries=[query],
    )


def merge_candidate(existing: RoboflowCandidate, incoming: RoboflowCandidate) -> RoboflowCandidate:
    existing.matched_queries.extend(incoming.matched_queries)
    existing.matched_queries = list(dict.fromkeys(existing.matched_queries))
    existing.downloads = max(existing.downloads, incoming.downloads)
    existing.stars = max(existing.stars, incoming.stars)
    existing.views = max(existing.views, incoming.views)
    if not existing.latest_version and incoming.latest_version:
        existing.latest_version = incoming.latest_version
    return existing


def score_candidate(candidate: RoboflowCandidate) -> RoboflowCandidate:
    text = normalize_text(" ".join([candidate.name, candidate.url, " ".join(candidate.classes)]))
    class_count = candidate.version_class_count or candidate.class_count
    images = candidate.version_images or candidate.images
    vietnamese_hits = count_matching_classes(candidate.classes, VIETNAMESE_CLASS_TERMS)
    ingredient_hits = count_matching_classes(candidate.classes, INGREDIENT_TERMS)
    food_domain = vietnamese_hits > 0 or ingredient_hits > 0 or contains_any(text, FOOD_DOMAIN_TERMS)
    reject_domain = contains_any(text, REJECT_TERMS)
    class_total = len(candidate.classes) or class_count or 1
    vietnamese_ratio = vietnamese_hits / max(class_total, 1)
    ingredient_ratio = ingredient_hits / max(class_total, 1)
    reasons: list[str] = []
    score = 0.0

    if not food_domain:
        reasons.append("not_food_domain")
        if reject_domain:
            reasons.append("reject_term")
        candidate.score = 0.0
        candidate.tier = "REJECT_METADATA"
        candidate.lane = "REJECT_METADATA"
        candidate.reasons = reasons
        return candidate

    if candidate.project_type == "object-detection":
        score += 25
        reasons.append("object_detection")
    else:
        score -= 40
        reasons.append("not_object_detection")
    if "cc by 4.0" in candidate.license.lower():
        score += 15
        reasons.append("cc_by_4")
    elif candidate.license:
        score += 5
        reasons.append("license_present")
    else:
        score -= 5
        reasons.append("license_missing")
    if images >= 500:
        score += min(images / 300, 35)
        reasons.append("enough_images")
    else:
        score -= 12
        reasons.append("too_few_images")
    if 8 <= class_count <= 80:
        score += 18
        reasons.append("moderate_class_count")
    elif class_count > 120:
        score -= 28
        reasons.append("too_many_classes")
    elif class_count > 80:
        score -= 8
        reasons.append("broad_class_count")
    elif class_count < 5:
        score -= 6
        reasons.append("too_few_classes")
    if vietnamese_hits:
        score += 35 * min(vietnamese_ratio, 1.0) + min(vietnamese_hits, 20)
        reasons.append("vietnamese_class_signal")
    if ingredient_hits:
        score += 25 * min(ingredient_ratio, 1.0) + min(ingredient_hits, 20) * 0.5
        reasons.append("ingredient_class_signal")
    if reject_domain:
        score -= 50
        reasons.append("reject_term")
    if candidate.latest_version:
        score += 8
        reasons.append("downloadable_version")
    else:
        score -= 15
        reasons.append("no_latest_version")
    score += min(candidate.stars * 2, 10)
    score += min(candidate.downloads / 20, 10)

    backbone_ready = 8 <= class_count <= 80 and vietnamese_hits >= 3 and vietnamese_ratio >= 0.25
    booster_ready = vietnamese_hits > 0 and (class_count < 8 or vietnamese_ratio >= 0.25)
    ingredient_ready = ingredient_hits >= 3 and ingredient_ratio >= 0.15

    if backbone_ready:
        lane = "BACKBONE_AUDIT"
    elif ingredient_ready:
        lane = "INGREDIENT_SUPPLEMENT_AUDIT"
    elif booster_ready:
        lane = "BOOSTER_AUDIT"
    else:
        lane = "CHERRY_PICK_REVIEW"

    if lane == "BACKBONE_AUDIT":
        if score >= 90:
            tier = "TOP_TIER_AUDIT"
        elif score >= 65:
            tier = "PROMISING_AUDIT"
        elif score >= 45:
            tier = "CHERRY_PICK_REVIEW"
        elif score >= 20:
            tier = "HOLD_METADATA"
        else:
            tier = "REJECT_METADATA"
    elif lane == "INGREDIENT_SUPPLEMENT_AUDIT":
        tier = "SUPPLEMENT_AUDIT" if score >= 65 else "CHERRY_PICK_REVIEW"
    elif lane == "BOOSTER_AUDIT":
        tier = "BOOSTER_AUDIT" if score >= 45 else "HOLD_METADATA"
    else:
        tier = "CHERRY_PICK_REVIEW" if score >= 45 else "HOLD_METADATA"

    candidate.score = round(score, 2)
    candidate.tier = tier
    candidate.lane = lane
    candidate.reasons = reasons
    return candidate


def version_value(value: object) -> str:
    if isinstance(value, dict):
        for key in ("version", "id", "name"):
            if value.get(key):
                return str(value[key])
        return ""
    return str(value) if value else ""


def latest_version_from_project(project: dict[str, Any]) -> str:
    direct = project.get("latestVersion") or project.get("latest_version") or project.get("latest")
    if direct:
        return str(direct)
    versions = project.get("versions")
    if isinstance(versions, list):
        values = [version_value(item) for item in versions]
        values = [item for item in values if item]
        numeric = [int(item) for item in values if item.isdigit()]
        if numeric:
            return str(max(numeric))
        if values:
            return values[-1]
    if isinstance(versions, dict):
        keys = [str(key) for key in versions.keys() if str(key)]
        numeric = [int(item) for item in keys if item.isdigit()]
        if numeric:
            return str(max(numeric))
        if keys:
            return keys[-1]
    if versions:
        return str(versions)
    return ""


def fetch_json(url: str, api_key: str, params: dict[str, object] | None = None) -> dict[str, Any]:
    merged = {"api_key": api_key, **(params or {})}
    response = requests.get(url, params=merged, timeout=30)
    response.raise_for_status()
    return response.json()


def enrich_candidate(candidate: RoboflowCandidate, api_key: str) -> RoboflowCandidate:
    if not candidate.workspace or not candidate.project:
        candidate.metadata_status = "missing_workspace_or_project"
        return score_candidate(candidate)
    try:
        project_data = fetch_json(f"{API_ROOT}/{candidate.workspace}/{candidate.project}", api_key)
        project = project_data.get("project") or project_data
        candidate.project_type = str(project.get("type") or candidate.project_type)
        candidate.license = str(project.get("license") or candidate.license)
        candidate.images = safe_int(project.get("images") or candidate.images)
        class_map = project.get("classes")
        if isinstance(class_map, dict) and class_map:
            candidate.classes = [str(name) for name in class_map.keys()] or candidate.classes
            candidate.class_count = len(class_map)
        if not candidate.latest_version:
            candidate.latest_version = latest_version_from_project(project)
        if candidate.latest_version:
            version_data = fetch_json(f"{API_ROOT}/{candidate.workspace}/{candidate.project}/{candidate.latest_version}", api_key)
            version = version_data.get("version") or version_data
            candidate.version_images = safe_int(version.get("images"))
            version_classes = version.get("classes")
            if isinstance(version_classes, list) and version_classes:
                candidate.classes = [str(name) for name in version_classes]
                candidate.version_class_count = len(version_classes)
            exports = version.get("exports")
            if isinstance(exports, list):
                candidate.exports = [str(item) for item in exports]
        candidate.metadata_status = "enriched"
    except Exception as exc:
        candidate.metadata_status = f"metadata_error:{type(exc).__name__}"
    return score_candidate(candidate)


def search_universe(api_key: str, queries: list[str], pages: int = 1) -> list[RoboflowCandidate]:
    candidates: dict[str, RoboflowCandidate] = {}
    for query in queries:
        for page in range(1, pages + 1):
            data = fetch_json(UNIVERSE_SEARCH_URL, api_key, {"q": query, "page": page})
            for item in data.get("results") or []:
                candidate = candidate_from_search_result(item, query)
                if candidate.source_ref in candidates:
                    candidates[candidate.source_ref] = merge_candidate(candidates[candidate.source_ref], candidate)
                else:
                    candidates[candidate.source_ref] = candidate
    return list(candidates.values())


def read_api_key(path: Path | None) -> str:
    value = os.environ.get("ROBOFLOW_API_KEY", "").strip()
    if value:
        return value
    if path and path.exists():
        return path.read_text(encoding="utf-8").strip()
    raise RuntimeError("Set ROBOFLOW_API_KEY or pass --api-key-file.")


def candidate_row(candidate: RoboflowCandidate) -> dict[str, object]:
    class_count = candidate.version_class_count or candidate.class_count
    images = candidate.version_images or candidate.images
    return {
        "source_ref": candidate.source_ref,
        "name": candidate.name,
        "url": candidate.url,
        "workspace": candidate.workspace,
        "project": candidate.project,
        "latest_version": candidate.latest_version,
        "type": candidate.project_type,
        "license": candidate.license,
        "images": images,
        "class_count": class_count,
        "vietnamese_class_hits": count_matching_classes(candidate.classes, VIETNAMESE_CLASS_TERMS),
        "ingredient_class_hits": count_matching_classes(candidate.classes, INGREDIENT_TERMS),
        "downloads": candidate.downloads,
        "stars": candidate.stars,
        "views": candidate.views,
        "exports": ";".join(candidate.exports),
        "matched_queries": ";".join(candidate.matched_queries),
        "tier": candidate.tier,
        "score": candidate.score,
        "lane": candidate.lane,
        "metadata_status": candidate.metadata_status,
        "reasons": ";".join(candidate.reasons),
        "classes_preview": ";".join(candidate.classes[:30]),
    }


def write_csv(path: Path, rows: list[dict[str, object]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames: list[str] = []
    for row in rows:
        for key in row:
            if key not in fieldnames:
                fieldnames.append(key)
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main() -> int:
    parser = argparse.ArgumentParser(description="Discover Roboflow Universe candidates for EatFitAI Dataset V2.")
    parser.add_argument("--api-key-file", type=Path, default=Path.home() / "Desktop" / "roboflow key.txt")
    parser.add_argument("--query", action="append", default=None)
    parser.add_argument("--pages", type=int, default=1)
    parser.add_argument("--out", type=Path, default=Path("_dataset_v2_reports/roboflow_universe_candidates.csv"))
    parser.add_argument("--json-out", type=Path, default=Path("_dataset_v2_reports/roboflow_universe_candidates.json"))
    args = parser.parse_args()

    api_key = read_api_key(args.api_key_file)
    queries = args.query or DEFAULT_QUERIES
    candidates = [enrich_candidate(candidate, api_key) for candidate in search_universe(api_key, queries, args.pages)]
    candidates.sort(key=lambda item: (-item.score, item.source_ref))
    rows = [candidate_row(candidate) for candidate in candidates]
    write_csv(args.out, rows)
    args.json_out.parent.mkdir(parents=True, exist_ok=True)
    args.json_out.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    counts: dict[str, int] = {}
    for row in rows:
        tier = str(row["tier"])
        counts[tier] = counts.get(tier, 0) + 1
    print(json.dumps({"out": str(args.out), "candidates": len(rows), "tier_counts": counts}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
