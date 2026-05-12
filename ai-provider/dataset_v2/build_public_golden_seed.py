from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any


COMMONS_API = "https://commons.wikimedia.org/w/api.php"
USER_AGENT = "EatFitAI-YOLO11-GoldenSeed/1.0 (public benchmark builder)"


DEFAULT_QUERIES: dict[str, list[str]] = {
    "rice": ["cooked rice bowl food", "steamed rice plate"],
    "beef": ["beef steak food", "cooked beef dish"],
    "chicken": ["roast chicken food", "grilled chicken food"],
    "fried_egg": ["fried egg food", "sunny side up egg"],
    "pork": ["cooked pork food", "pork belly dish"],
    "broccoli": ["broccoli vegetable food", "cooked broccoli"],
    "cabbage": ["cabbage vegetable food", "cooked cabbage dish"],
    "carrot": ["carrot vegetable food", "cooked carrots"],
    "tomato": ["tomato vegetable food", "fresh tomato food"],
    "potato": ["potato food dish", "cooked potato food"],
    "onion": ["onion vegetable food", "onion food ingredient"],
    "garlic": ["garlic food ingredient", "garlic cloves food"],
    "ginger": ["ginger food ingredient", "fresh ginger food"],
    "banh_mi": ["banh mi Vietnamese sandwich", "bánh mì sandwich"],
    "com_tam": ["com tam Vietnamese broken rice", "Vietnamese broken rice food"],
    "banh_xeo": ["banh xeo Vietnamese pancake", "bánh xèo food"],
    "pho": ["pho Vietnamese noodle soup", "phở food"],
    "bun_bo_hue": ["bun bo hue Vietnamese noodle soup", "bún bò Huế"],
    "goi_cuon": ["Vietnamese fresh spring rolls food", "gỏi cuốn"],
    "tofu": ["tofu food dish", "fried tofu food"],
}


def slugify(value: str) -> str:
    value = re.sub(r"[^a-zA-Z0-9_+-]+", "_", value.strip().lower())
    return re.sub(r"_+", "_", value).strip("_")


def request_json(url: str) -> dict[str, Any]:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def search_commons(query: str, limit: int) -> list[dict[str, Any]]:
    params = {
        "action": "query",
        "format": "json",
        "generator": "search",
        "gsrnamespace": "6",
        "gsrsearch": f'{query} filetype:bitmap',
        "gsrlimit": str(limit),
        "prop": "imageinfo",
        "iiprop": "url|mime|size|extmetadata",
        "iiurlwidth": "1024",
    }
    url = f"{COMMONS_API}?{urllib.parse.urlencode(params)}"
    payload = request_json(url)
    pages = payload.get("query", {}).get("pages", {})
    return list(pages.values())


def metadata_value(page: dict[str, Any], key: str) -> str:
    info = (page.get("imageinfo") or [{}])[0]
    metadata = info.get("extmetadata") or {}
    value = metadata.get(key, {}).get("value", "")
    return re.sub(r"<[^>]+>", "", str(value)).strip()


def image_info(page: dict[str, Any]) -> dict[str, Any] | None:
    infos = page.get("imageinfo") or []
    if not infos:
        return None
    info = infos[0]
    mime = str(info.get("mime") or "")
    if mime not in {"image/jpeg", "image/png", "image/webp"}:
        return None
    url = info.get("thumburl") or info.get("url")
    if not url:
        return None
    return info


def download_file(url: str, out_path: Path) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=60) as response:
        data = response.read()
    out_path.write_bytes(data)
    return hashlib.sha256(data).hexdigest()


def extension_for_mime(mime: str) -> str:
    return {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
    }.get(mime, ".jpg")


def build_seed(out_dir: Path, per_label: int, search_limit: int, sleep_seconds: float) -> dict[str, Any]:
    images_dir = out_dir / "images"
    images_dir.mkdir(parents=True, exist_ok=True)

    manifest_rows: list[dict[str, str]] = []
    metadata_rows: list[dict[str, Any]] = []
    seen_titles: set[str] = set()
    seen_hashes: set[str] = set()

    for label, queries in DEFAULT_QUERIES.items():
        accepted_for_label = 0
        for query in queries:
            if accepted_for_label >= per_label:
                break
            for page in search_commons(query, search_limit):
                if accepted_for_label >= per_label:
                    break
                title = str(page.get("title") or "")
                if not title or title in seen_titles:
                    continue
                info = image_info(page)
                if info is None:
                    continue

                url = info.get("thumburl") or info.get("url")
                filename = f"{label}_{accepted_for_label + 1:03d}_{slugify(title.removeprefix('File:'))[:80]}{extension_for_mime(info.get('mime', ''))}"
                out_path = images_dir / filename
                try:
                    sha256 = download_file(str(url), out_path)
                except Exception:
                    continue
                if sha256 in seen_hashes:
                    out_path.unlink(missing_ok=True)
                    continue

                seen_titles.add(title)
                seen_hashes.add(sha256)
                accepted_for_label += 1
                rel_path = out_path.relative_to(out_dir).as_posix()
                manifest_rows.append(
                    {
                        "image_path": rel_path,
                        "scenario": "public_commons_single_object_seed",
                        "expected_objects": label,
                        "notes": f"public Commons seed; query={query}; manual-audit-required",
                    }
                )
                metadata_rows.append(
                    {
                        "label": label,
                        "query": query,
                        "title": title,
                        "source_page": info.get("descriptionurl"),
                        "download_url": url,
                        "mime": info.get("mime"),
                        "sha256": sha256,
                        "license_short_name": metadata_value(page, "LicenseShortName"),
                        "license_url": metadata_value(page, "LicenseUrl"),
                        "artist": metadata_value(page, "Artist"),
                        "credit": metadata_value(page, "Credit"),
                        "attribution_required": metadata_value(page, "AttributionRequired"),
                        "copyrighted": metadata_value(page, "Copyrighted"),
                        "local_path": rel_path,
                    }
                )
                time.sleep(sleep_seconds)

    manifest_path = out_dir / "manifest.csv"
    with manifest_path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["image_path", "scenario", "expected_objects", "notes"])
        writer.writeheader()
        writer.writerows(manifest_rows)

    metadata_path = out_dir / "source_metadata.json"
    metadata_path.write_text(json.dumps(metadata_rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    summary = {
        "images": len(manifest_rows),
        "labels": {label: sum(1 for row in manifest_rows if row["expected_objects"] == label) for label in DEFAULT_QUERIES},
        "manifest": str(manifest_path),
        "metadata": str(metadata_path),
        "note": "Labels are query-derived seed labels and require manual audit before production promotion.",
    }
    (out_dir / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return summary


def main() -> int:
    parser = argparse.ArgumentParser(description="Build a public Wikimedia Commons seed set for YOLO11 golden eval.")
    parser.add_argument("--out-dir", type=Path, default=Path("_dataset_v2_reports/golden_eval_public_web_seed"))
    parser.add_argument("--per-label", type=int, default=15)
    parser.add_argument("--search-limit", type=int, default=40)
    parser.add_argument("--sleep-seconds", type=float, default=0.05)
    args = parser.parse_args()

    summary = build_seed(args.out_dir, args.per_label, args.search_limit, args.sleep_seconds)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
