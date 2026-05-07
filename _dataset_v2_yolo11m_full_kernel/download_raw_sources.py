from __future__ import annotations

import argparse
import csv
import os
import shutil
import urllib.request
from pathlib import Path
from typing import Any

from common import load_yaml, sha256_file, write_csv


def roboflow_download_url(source: dict[str, Any], api_key: str) -> str:
    import requests

    url = "https://api.roboflow.com/{workspace}/{project}/{version}/{format}".format(**source)
    response = requests.get(url, params={"api_key": api_key}, timeout=60)
    response.raise_for_status()
    data = response.json()
    download_url = data.get("download") or data.get("export") or data.get("link")
    if isinstance(download_url, dict):
        download_url = download_url.get("link") or download_url.get("url") or download_url.get("download")
    if not download_url:
        raise RuntimeError(f"Roboflow did not return a download URL for {source['workspace']}/{source['project']}")
    return str(download_url)


def download_file(url: str, out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    tmp = out_path.with_suffix(out_path.suffix + ".part")
    with urllib.request.urlopen(url, timeout=120) as response, tmp.open("wb") as f:
        shutil.copyfileobj(response, f, length=1024 * 1024)
    tmp.replace(out_path)


def download_roboflow_sources(registry: dict[str, Any], out_dir: Path, selected: set[str] | None) -> list[dict[str, Any]]:
    api_key = os.environ.get("ROBOFLOW_API_KEY")
    if not api_key:
        raise RuntimeError("ROBOFLOW_API_KEY is not set in this process/user environment.")
    rows: list[dict[str, Any]] = []
    for slug, source in (registry.get("roboflow_sources") or {}).items():
        if selected and slug not in selected:
            continue
        output_name = source["output_name"]
        out_path = out_dir / output_name
        if not out_path.exists():
            url = roboflow_download_url(source, api_key)
            download_file(url, out_path)
        rows.append(
            {
                "source_slug": slug,
                "platform": "roboflow",
                "output_name": output_name,
                "path": str(out_path),
                "size_bytes": out_path.stat().st_size,
                "sha256": sha256_file(out_path),
                "role": source.get("role", ""),
                "decision": source.get("decision", ""),
                "notes": source.get("notes", ""),
            }
        )
    return rows


def download_kaggle_sources(registry: dict[str, Any], out_dir: Path, selected: set[str] | None) -> list[dict[str, Any]]:
    from kaggle.api.kaggle_api_extended import KaggleApi

    api = KaggleApi()
    api.authenticate()
    rows: list[dict[str, Any]] = []
    for slug, source in (registry.get("kaggle_sources") or {}).items():
        if selected and slug not in selected:
            continue
        output_name = source["output_name"]
        out_path = out_dir / output_name
        if not out_path.exists():
            tmp_dir = out_dir / f"_{slug}_download"
            tmp_dir.mkdir(parents=True, exist_ok=True)
            api.dataset_download_files(source["dataset"], path=str(tmp_dir), force=True, quiet=False, unzip=False)
            zips = sorted(tmp_dir.glob("*.zip"))
            if not zips:
                raise RuntimeError(f"Kaggle download did not produce a zip for {source['dataset']}")
            shutil.move(str(zips[0]), out_path)
            shutil.rmtree(tmp_dir, ignore_errors=True)
        rows.append(
            {
                "source_slug": slug,
                "platform": "kaggle",
                "output_name": output_name,
                "path": str(out_path),
                "size_bytes": out_path.stat().st_size,
                "sha256": sha256_file(out_path),
                "role": source.get("role", ""),
                "decision": source.get("decision", ""),
                "notes": source.get("notes", ""),
            }
        )
    return rows


def main() -> int:
    parser = argparse.ArgumentParser(description="Download selected raw sources for Kaggle raw-zips packaging.")
    parser.add_argument("--registry", type=Path, default=Path("ai-provider/dataset_v2/raw_source_registry.yaml"))
    parser.add_argument("--out-dir", type=Path, default=Path("_dataset_v2_raw_package/raw_zips"))
    parser.add_argument("--manifest-out", type=Path, default=Path("_dataset_v2_raw_package/raw_source_downloads.csv"))
    parser.add_argument("--only", nargs="*", default=None, help="Optional source slugs to download.")
    parser.add_argument("--skip-kaggle", action="store_true")
    parser.add_argument("--skip-roboflow", action="store_true")
    args = parser.parse_args()

    selected = set(args.only) if args.only else None
    registry = load_yaml(args.registry)
    rows: list[dict[str, Any]] = []
    if not args.skip_roboflow:
        rows.extend(download_roboflow_sources(registry, args.out_dir, selected))
    if not args.skip_kaggle:
        rows.extend(download_kaggle_sources(registry, args.out_dir, selected))
    write_csv(args.manifest_out, rows)
    print(f"Downloaded/verified {len(rows)} sources. Manifest: {args.manifest_out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
