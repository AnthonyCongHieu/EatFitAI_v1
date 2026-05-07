from __future__ import annotations

import argparse
import csv
import hashlib
import json
import shutil
from pathlib import Path
from typing import Any


PACKAGE_CODE_SUFFIXES = {".py", ".csv", ".yaml", ".yml", ".json", ".md", ".txt"}
SKIP_PACKAGE_NAMES = {"dataset-metadata.json"}
SKIP_PACKAGE_DIRS = {"__pycache__", ".pytest_cache"}
PUBLIC_DRIVE_SCOPE_PACKAGE_NAME = "public_drive_source_scope.csv"


def sha256_file(path: Path, chunk_size: int = 1024 * 1024) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(chunk_size), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def write_csv(path: Path, rows: list[dict[str, Any]], fieldnames: list[str] | None = None) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if fieldnames is None:
        fieldnames = []
        for row in rows:
            for key in row:
                if key not in fieldnames:
                    fieldnames.append(key)
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({key: row.get(key, "") for key in fieldnames})


def write_dataset_metadata(out_dir: Path, title: str, kaggle_id: str, license_name: str) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    metadata = {
        "title": title,
        "id": kaggle_id,
        "licenses": [{"name": license_name}],
    }
    (out_dir / "dataset-metadata.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def is_zipish(path: Path) -> bool:
    return path.is_file() and ".zip" in path.name.lower()


def manifest_rows_from_raw_dir(raw_dir: Path) -> list[dict[str, str]]:
    return [
        {
            "source_slug": zip_path.stem.replace(" ", "_").lower(),
            "drive_zip_name": zip_path.name,
            "initial_decision": "PENDING_AUDIT",
        }
        for zip_path in sorted(raw_dir.iterdir(), key=lambda item: item.name.lower())
        if is_zipish(zip_path)
    ]


def is_quarantined(row: dict[str, str]) -> bool:
    decisions = " ".join(
        str(row.get(key, ""))
        for key in (
            "initial_decision",
            "public_decision",
            "decision",
        )
    ).upper()
    return "QUARANTINE" in decisions or "REJECT" in decisions


def copy_or_verify(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    if source.resolve() == destination.resolve():
        return
    shutil.copy2(source, destination)


def prepare_raw_sources_package(
    raw_dir: Path,
    manifest_path: Path | None,
    out_dir: Path,
    kaggle_id: str,
    title: str,
    license_name: str,
    include_quarantine: bool = False,
    fail_on_missing: bool = False,
) -> dict[str, int]:
    raw_dir = raw_dir.resolve()
    out_dir = out_dir.resolve()
    if not raw_dir.exists():
        raise FileNotFoundError(f"Raw Drive folder not found: {raw_dir}")

    source_rows = read_csv(manifest_path) if manifest_path else manifest_rows_from_raw_dir(raw_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    manifest_rows: list[dict[str, Any]] = []
    summary = {"copied": 0, "missing": 0, "skipped": 0}
    for row in source_rows:
        source_slug = row.get("source_slug", "")
        zip_name = row.get("drive_zip_name", "")
        base = {
            **row,
            "source_slug": source_slug,
            "drive_zip_name": zip_name,
            "size_bytes": "",
            "sha256": "",
            "package_path": "",
        }
        if not zip_name:
            manifest_rows.append({**base, "status": "missing_drive_zip_name"})
            summary["missing"] += 1
            continue
        if is_quarantined(row) and not include_quarantine:
            manifest_rows.append({**base, "status": "skipped_quarantine"})
            summary["skipped"] += 1
            continue
        source_zip = raw_dir / zip_name
        if not source_zip.exists():
            manifest_rows.append({**base, "status": "missing_local_zip"})
            summary["missing"] += 1
            continue
        destination = out_dir / source_zip.name
        copy_or_verify(source_zip, destination)
        manifest_rows.append(
            {
                **base,
                "status": "copied",
                "size_bytes": destination.stat().st_size,
                "sha256": sha256_file(destination),
                "package_path": destination.name,
            }
        )
        summary["copied"] += 1

    if fail_on_missing and summary["missing"]:
        missing = [row["drive_zip_name"] or row["source_slug"] for row in manifest_rows if str(row.get("status", "")).startswith("missing")]
        raise FileNotFoundError("Missing raw source zip(s): " + ", ".join(missing))

    write_dataset_metadata(out_dir, title, kaggle_id, license_name)
    write_csv(out_dir / "raw_source_manifest.csv", manifest_rows)
    (out_dir / "README.md").write_text(
        "# EatFitAI Dataset V2 Raw Sources\n\n"
        "Private audit package generated from the Drive raw zip folder. "
        "This package is for source audit only; final training datasets must preserve per-source license decisions.\n",
        encoding="utf-8",
    )
    return summary


def iter_pipeline_package_files(source_dir: Path) -> list[Path]:
    files: list[Path] = []
    for path in sorted(source_dir.iterdir(), key=lambda item: item.name.lower()):
        if path.is_dir() and path.name in SKIP_PACKAGE_DIRS:
            continue
        if not path.is_file():
            continue
        if path.name in SKIP_PACKAGE_NAMES:
            continue
        if path.suffix.lower() in PACKAGE_CODE_SUFFIXES:
            files.append(path)
    return files


def prepare_pipeline_code_package(
    source_dir: Path,
    out_dir: Path,
    kaggle_id: str,
    title: str,
    license_name: str,
    public_drive_scope_path: Path | None = None,
) -> dict[str, int]:
    source_dir = source_dir.resolve()
    out_dir = out_dir.resolve()
    if not source_dir.exists():
        raise FileNotFoundError(f"Pipeline source folder not found: {source_dir}")
    out_dir.mkdir(parents=True, exist_ok=True)
    for existing in out_dir.iterdir():
        if existing.is_file() and (existing.suffix.lower() in PACKAGE_CODE_SUFFIXES or existing.name in SKIP_PACKAGE_NAMES):
            existing.unlink()

    copied = 0
    for source in iter_pipeline_package_files(source_dir):
        copy_or_verify(source, out_dir / source.name)
        copied += 1
    if public_drive_scope_path is not None:
        copy_or_verify(public_drive_scope_path, out_dir / PUBLIC_DRIVE_SCOPE_PACKAGE_NAME)
        copied += 1

    write_dataset_metadata(out_dir, title, kaggle_id, license_name)
    (out_dir / "README.md").write_text(
        "# EatFitAI Dataset V2 Pipeline Code\n\n"
        "Scripts and seed manifests used by the Kaggle raw-audit kernel.\n",
        encoding="utf-8",
    )
    return {"files_copied": copied}


def main() -> int:
    parser = argparse.ArgumentParser(description="Prepare Kaggle dataset folders for EatFitAI Dataset V2 automation.")
    sub = parser.add_subparsers(dest="cmd", required=True)

    raw = sub.add_parser("raw-sources", help="Create a Kaggle dataset folder from local Drive raw zips.")
    raw.add_argument("--raw-dir", type=Path, required=True)
    raw.add_argument("--manifest", type=Path, default=Path("ai-provider/dataset_v2/source_manifest.seed.csv"))
    raw.add_argument("--out-dir", type=Path, default=Path("_dataset_v2_raw_sources_package"))
    raw.add_argument("--kaggle-id", default="hiuinhcng/eatfitai-dataset-v2-raw-sources")
    raw.add_argument("--title", default="EatFitAI Dataset V2 Raw Sources")
    raw.add_argument("--license", default="CC-BY-4.0")
    raw.add_argument("--include-quarantine", action="store_true")
    raw.add_argument("--fail-on-missing", action="store_true")

    code = sub.add_parser("pipeline-code", help="Create a Kaggle dataset folder with dataset_v2 scripts and seed files.")
    code.add_argument("--source-dir", type=Path, default=Path("ai-provider/dataset_v2"))
    code.add_argument("--out-dir", type=Path, default=Path("_dataset_v2_pipeline_code_package"))
    code.add_argument("--kaggle-id", default="hiuinhcng/eatfitai-dataset-v2-pipeline-code")
    code.add_argument("--title", default="EatFitAI Dataset V2 Pipeline Code")
    code.add_argument("--license", default="Apache-2.0")
    code.add_argument("--public-drive-scope", type=Path, default=None)

    args = parser.parse_args()
    if args.cmd == "raw-sources":
        summary = prepare_raw_sources_package(
            raw_dir=args.raw_dir,
            manifest_path=args.manifest if args.manifest else None,
            out_dir=args.out_dir,
            kaggle_id=args.kaggle_id,
            title=args.title,
            license_name=args.license,
            include_quarantine=args.include_quarantine,
            fail_on_missing=args.fail_on_missing,
        )
    else:
        summary = prepare_pipeline_code_package(
            source_dir=args.source_dir,
            out_dir=args.out_dir,
            kaggle_id=args.kaggle_id,
            title=args.title,
            license_name=args.license,
            public_drive_scope_path=args.public_drive_scope,
        )
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
