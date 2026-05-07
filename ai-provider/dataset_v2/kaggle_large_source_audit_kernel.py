from __future__ import annotations

import csv
import json
import os
import shutil
import subprocess
import sys
import time
import urllib.request
from pathlib import Path
from typing import Any, Callable, Mapping


KAGGLE_INPUT = Path("/kaggle/input")
TEMP_ROOT = Path("/tmp/eatfitai_dataset_v2_large_source")
WORK_DIR = TEMP_ROOT / "work"
REPORT_DIR = Path("/kaggle/working/_dataset_v2_large_source_reports")
RAW_ZIP_DIR = TEMP_ROOT / "raw_zips"
SOURCE_REPORT_ROOT = TEMP_ROOT / "source_reports"
RAW_CACHE_PACKAGE_DIR = TEMP_ROOT / "raw_audit_cache_dataset"
RAW_CACHE_DATASET_ID = "hiuinhcng/eatfitai-dataset-v2-large-source-raw-cache-v2"
LARGE_SOURCE_SCOPE = "large_source_scope.2026-05-05.csv"
ROBOFLOW_ACTIVE_SCOPE = "roboflow_source_scope.active_2026-05-06.csv"
ROBOFLOW_PHASE1_SCOPE = "roboflow_source_scope.phase1_2026-05-06.csv"
ROBOFLOW_PHASE2_SCOPE = "roboflow_source_scope.phase2_2026-05-06.csv"
ROBOFLOW_SOURCE_SCOPE = "roboflow_source_scope.2026-05-06.csv"
RAW_SOURCE_REGISTRY = "raw_source_registry.yaml"
SOURCE_AUDIT_JSON = "source_audit.json"
ROBOFLOW_SECRET_LABEL = "ROBOFLOW_API_KEY"
KAGGLE_LARGE_REPORTS_ZIP = Path("/kaggle/working/dataset_v2_large_source_audit_reports.zip")
PIPELINE_CODE_DATASET_ID = "hiuinhcng/eatfitai-dataset-v2-pipeline-code"
PIPELINE_CODE_INPUT_SLUG = "eatfitai-dataset-v2-pipeline-code"


def unique_existing_dirs(paths: list[Path]) -> list[Path]:
    seen: set[str] = set()
    existing: list[Path] = []
    for path in paths:
        key = path.as_posix()
        if key in seen:
            continue
        seen.add(key)
        if path.is_dir():
            existing.append(path)
    return existing


def kaggle_dataset_input_candidates(input_root: Path, dataset_slug: str, owner_slug: str | None = None) -> list[Path]:
    paths = [input_root / dataset_slug, input_root / "datasets" / dataset_slug]
    if owner_slug:
        paths.extend([input_root / owner_slug / dataset_slug, input_root / "datasets" / owner_slug / dataset_slug])
    datasets_root = input_root / "datasets"
    if datasets_root.is_dir():
        paths.extend(owner_dir / dataset_slug for owner_dir in sorted(datasets_root.iterdir()) if owner_dir.is_dir())
    if input_root.is_dir():
        paths.extend(owner_dir / dataset_slug for owner_dir in sorted(input_root.iterdir()) if owner_dir.is_dir())
    return unique_existing_dirs(paths)


def is_pipeline_code_dir(candidate: Path) -> bool:
    return (candidate / "audit_sources.py").exists() and (candidate / RAW_SOURCE_REGISTRY).exists()


def run(cmd: list[str]) -> None:
    print("$", " ".join(cmd), flush=True)
    subprocess.run(cmd, check=True)


def install_runtime_dependencies(code_dir: Path) -> None:
    requirements = code_dir / "requirements.dataset_v2.txt"
    if requirements.exists():
        run([sys.executable, "-m", "pip", "install", "-q", "-r", str(requirements)])
    else:
        run([sys.executable, "-m", "pip", "install", "-q", "kaggle", "pyyaml", "pillow", "opencv-python-headless"])


def find_code_dir_under(input_root: Path) -> Path:
    owner_slug, _dataset_slug = PIPELINE_CODE_DATASET_ID.split("/", 1)
    shallow_input_dirs = [path for path in sorted(input_root.iterdir()) if path.is_dir()] if input_root.exists() else []
    candidates = [
        Path.cwd(),
        *kaggle_dataset_input_candidates(input_root, PIPELINE_CODE_INPUT_SLUG, owner_slug),
        *shallow_input_dirs,
    ]
    for candidate in candidates:
        if is_pipeline_code_dir(candidate):
            return candidate
    for candidate in sorted(input_root.rglob("*")):
        if candidate.is_dir() and is_pipeline_code_dir(candidate):
            return candidate
    raise FileNotFoundError("No pipeline code dataset with raw source registry found under /kaggle/input")


def find_code_dir() -> Path:
    return find_code_dir_under(KAGGLE_INPUT)


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


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
        for row in rows:
            writer.writerow({key: row.get(key, "") for key in fieldnames})


def write_json(path: Path, data: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def load_yaml(path: Path) -> dict[str, Any]:
    import yaml  # type: ignore

    with path.open("r", encoding="utf-8-sig") as f:
        data = yaml.safe_load(f) or {}
    if not isinstance(data, dict):
        raise ValueError(f"Expected YAML mapping: {path}")
    return data


def is_safe_cloud_path(path: Path) -> bool:
    text = path.as_posix()
    return text.startswith("/tmp/") or text.startswith("/kaggle/")


def build_roboflow_export_endpoint(source: Mapping[str, object]) -> str:
    workspace = str(source["workspace"]).strip()
    project = str(source["project"]).strip()
    version = str(source["version"]).strip()
    export_format = str(source["format"]).strip()
    return f"https://api.roboflow.com/{workspace}/{project}/{version}/{export_format}"


def selected_source_scope_path(code_dir: Path) -> Path:
    active_scope = code_dir / ROBOFLOW_ACTIVE_SCOPE
    if active_scope.exists():
        return active_scope
    phase2_scope = code_dir / ROBOFLOW_PHASE2_SCOPE
    if phase2_scope.exists():
        return phase2_scope
    phase1_scope = code_dir / ROBOFLOW_PHASE1_SCOPE
    if phase1_scope.exists():
        return phase1_scope
    roboflow_scope = code_dir / ROBOFLOW_SOURCE_SCOPE
    if roboflow_scope.exists():
        return roboflow_scope
    return code_dir / LARGE_SOURCE_SCOPE


def get_kaggle_secret(
    label: str,
    attempts: int = 6,
    delay_seconds: int = 15,
    sleep_fn: object = time.sleep,
) -> str | None:
    last_error = ""
    for attempt in range(1, attempts + 1):
        try:
            from kaggle_secrets import UserSecretsClient  # type: ignore

            return UserSecretsClient().get_secret(label)
        except Exception as exc:
            last_error = type(exc).__name__
            if attempt < attempts:
                print(
                    f"Kaggle secret {label} unavailable: {last_error}; retry {attempt}/{attempts}",
                    flush=True,
                )
                sleep_fn(delay_seconds)  # type: ignore[operator]
    print(f"Kaggle secret {label} unavailable after {attempts} attempts: {last_error}", flush=True)
    return None


def resolve_kaggle_secret_once(
    label: str,
    cached_secret: str | None,
    already_checked: bool,
    secret_getter: Callable[[str], str | None] = get_kaggle_secret,
) -> tuple[str | None, bool]:
    if cached_secret or already_checked:
        return cached_secret, already_checked
    return secret_getter(label), True


def extract_roboflow_download_link(data: Mapping[str, object]) -> str:
    export = data.get("export")
    if isinstance(export, dict) and export.get("link"):
        return str(export["link"])
    for key in ("link", "url", "download"):
        if data.get(key):
            return str(data[key])
    return ""


def roboflow_export_link(endpoint: str, api_key: str, attempts: int = 20, delay_seconds: int = 30) -> str:
    import requests

    last_status = ""
    for attempt in range(1, attempts + 1):
        response = requests.get(endpoint, params={"api_key": api_key}, timeout=60)
        last_status = str(response.status_code)
        if response.status_code not in {200, 202}:
            response.raise_for_status()
        link = extract_roboflow_download_link(response.json())
        if link:
            return link
        if response.status_code == 202 or attempt < attempts:
            print(f"Roboflow export not ready yet; attempt {attempt}/{attempts}", flush=True)
            time.sleep(delay_seconds)
            continue
        break
    raise RuntimeError(f"Roboflow export response did not include a download link; last_status={last_status}")


def download_url(url: str, output: Path) -> None:
    if not is_safe_cloud_path(output):
        raise ValueError(f"Refusing non-cloud download destination: {output}")
    output.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(url, timeout=120) as response, output.open("wb") as f:
        shutil.copyfileobj(response, f)
    if not output.exists() or output.stat().st_size == 0:
        raise RuntimeError("Downloaded Roboflow export is empty")


def should_cache_large_source(row: Mapping[str, str]) -> bool:
    return row.get("cache_policy", "").strip().lower() == "cache_after_audit"


def write_raw_cache_dataset_metadata(
    out_dir: Path,
    dataset_id: str = RAW_CACHE_DATASET_ID,
    license_name: str = "unknown",
) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    metadata = {
        "title": "EatFitAI Dataset V2 Raw Audit Cache",
        "id": dataset_id,
        "licenses": [{"name": license_name}],
        "description": "private raw audit cache for authenticated cloud-sourced EatFitAI Dataset V2 zip files.",
    }
    path = out_dir / "dataset-metadata.json"
    path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return path


def link_or_copy(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    try:
        os.link(source, destination)
    except OSError:
        shutil.copy2(source, destination)


def add_large_source_to_cache_package(
    source: Mapping[str, str],
    zip_path: Path,
    cache_dir: Path = RAW_CACHE_PACKAGE_DIR,
) -> dict[str, object]:
    from kaggle_public_drive_raw_audit_kernel import add_cache_path_to_package  # type: ignore

    source_slug = source.get("source_slug", "") or zip_path.stem
    destination = add_cache_path_to_package(source_slug, zip_path, cache_dir)
    return {
        "source_slug": source.get("source_slug", ""),
        "license": source.get("license", ""),
        "cache_path": destination.name,
        "size_bytes": destination.stat().st_size,
        "cache_status": "prepared_for_cache",
    }


def has_yolo_layout(path: Path) -> bool:
    if not path.is_dir():
        return False
    if any((path / name).exists() for name in ("data.yaml", "data.yml")):
        return True
    for split in ("train", "valid", "val", "test"):
        if (path / split / "images").is_dir() and (path / split / "labels").is_dir():
            return True
    if (path / "images").is_dir() and (path / "labels").is_dir():
        return True
    return False


def find_kaggle_dataset_source_dir(input_root: Path, dataset_slug: str, preferred_subdir: str = "dataset") -> Path:
    candidates: list[Path] = kaggle_dataset_input_candidates(input_root, dataset_slug)
    direct = input_root / dataset_slug
    if direct.exists() and direct not in candidates:
        candidates.append(direct)
    for child in sorted(input_root.iterdir()) if input_root.exists() else []:
        if child.is_dir() and dataset_slug.lower() in child.name.lower() and child not in candidates:
            candidates.append(child)
    for child in sorted(input_root.rglob("*")) if input_root.exists() else []:
        if child.is_dir() and dataset_slug.lower() in child.name.lower() and child not in candidates:
            candidates.append(child)
    for base in candidates:
        preferred = base / preferred_subdir
        if has_yolo_layout(preferred):
            return preferred
        if has_yolo_layout(base):
            return base
        for data_yaml in sorted(base.rglob("data.y*ml")):
            if has_yolo_layout(data_yaml.parent):
                return data_yaml.parent
    raise FileNotFoundError(f"No YOLO-like mounted Kaggle source found for {dataset_slug}")


def build_kaggle_direct_manifest_row(row: Mapping[str, str], source_dir: Path) -> dict[str, str]:
    return {
        **dict(row),
        "source_slug": row.get("source_slug", ""),
        "extracted_path": source_dir.as_posix(),
        "package_path": source_dir.as_posix(),
        "status": "found",
        "cache_policy": "no_raw_cache",
    }


def write_single_manifest(path: Path, row: Mapping[str, str]) -> None:
    fieldnames = list(row.keys())
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerow({key: row.get(key, "") for key in fieldnames})


def read_json_rows(path: Path) -> list[dict[str, object]]:
    if not path.exists():
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    return data if isinstance(data, list) else []


def audit_one_source(
    code_dir: Path,
    source_slug: str,
    manifest_row: Mapping[str, str],
    raw_dir: Path | None,
) -> tuple[list[dict[str, object]], list[dict[str, object]], list[dict[str, object]], dict[str, object]]:
    source_report_dir = SOURCE_REPORT_ROOT / source_slug
    source_work_dir = WORK_DIR / source_slug
    manifest_path = TEMP_ROOT / "manifests" / f"{source_slug}.csv"
    write_single_manifest(manifest_path, manifest_row)
    cmd = [
        sys.executable,
        str(code_dir / "audit_sources.py"),
        "--manifest",
        str(manifest_path),
        "--work-dir",
        str(source_work_dir),
        "--out-dir",
        str(source_report_dir),
    ]
    if raw_dir is not None:
        cmd.extend(["--raw-dir", str(raw_dir)])
    try:
        run(cmd)
        run(
            [
                sys.executable,
                str(code_dir / "make_sample_grids.py"),
                "--audit-json",
                str(source_report_dir / SOURCE_AUDIT_JSON),
                "--out-dir",
                str(REPORT_DIR / "sample_grids"),
            ]
        )
    except subprocess.CalledProcessError as exc:
        return [], [], [], {"source_slug": source_slug, "audit_status": "audit_failed", "returncode": exc.returncode}

    audit_rows = read_json_rows(source_report_dir / SOURCE_AUDIT_JSON)
    inventory_rows = read_csv(source_report_dir / "raw_inventory.csv") if (source_report_dir / "raw_inventory.csv").exists() else []
    class_rows = read_csv(source_report_dir / "class_candidates.csv") if (source_report_dir / "class_candidates.csv").exists() else []
    return inventory_rows, audit_rows, class_rows, {"source_slug": source_slug, "audit_status": "audited", "audit_rows": len(audit_rows)}


def main() -> int:
    print("Kaggle input directories:")
    for path in sorted(KAGGLE_INPUT.iterdir()):
        print(" -", path)

    code_dir = find_code_dir()
    print("Pipeline code dataset:", code_dir)
    install_runtime_dependencies(code_dir)
    sys.path.insert(0, str(code_dir))

    from kaggle_public_drive_raw_audit_kernel import (  # type: ignore
        cache_package_summary,
        cleanup_paths,
        upload_raw_cache_dataset,
    )

    WORK_DIR.mkdir(parents=True, exist_ok=True)
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    RAW_ZIP_DIR.mkdir(parents=True, exist_ok=True)
    SOURCE_REPORT_ROOT.mkdir(parents=True, exist_ok=True)

    registry = load_yaml(code_dir / RAW_SOURCE_REGISTRY)
    source_scope_path = selected_source_scope_path(code_dir)
    print("Source scope:", source_scope_path)
    scope_rows = read_csv(source_scope_path)
    download_rows: list[dict[str, object]] = []
    inventory_rows: list[dict[str, object]] = []
    audit_rows: list[dict[str, object]] = []
    class_rows: list[dict[str, object]] = []
    audit_status_rows: list[dict[str, object]] = []
    cache_rows: list[dict[str, object]] = []

    roboflow_secret: str | None = None
    roboflow_secret_checked = False
    for row in scope_rows:
        source_slug = row["source_slug"]
        audit_mode = row.get("audit_mode", "")
        if audit_mode == "roboflow_export":
            roboflow_secret, roboflow_secret_checked = resolve_kaggle_secret_once(
                ROBOFLOW_SECRET_LABEL,
                roboflow_secret,
                roboflow_secret_checked,
            )
            if not roboflow_secret:
                status = {"source_slug": source_slug, "audit_status": "not_audited", "reason": "roboflow_secret_missing"}
                audit_status_rows.append(status)
                download_rows.append({**row, "download_status": "roboflow_secret_missing"})
                continue
            source_meta = registry.get("roboflow_sources", {}).get(source_slug, {})
            if not source_meta:
                audit_status_rows.append({"source_slug": source_slug, "audit_status": "not_audited", "reason": "registry_missing"})
                download_rows.append({**row, "download_status": "registry_missing"})
                continue
            output = RAW_ZIP_DIR / str(source_meta["output_name"])
            manifest_row = {**row, **source_meta, "output_name": output.name, "status": "found"}
            try:
                link = roboflow_export_link(build_roboflow_export_endpoint(source_meta), roboflow_secret)
                download_url(link, output)
                download_rows.append({**row, "download_status": "downloaded_roboflow_export", "path": output.as_posix(), "size_bytes": output.stat().st_size})
            except Exception as exc:
                cleanup_paths(output)
                audit_status_rows.append({"source_slug": source_slug, "audit_status": "not_audited", "reason": "roboflow_download_failed"})
                download_rows.append({**row, "download_status": "roboflow_download_failed", "error": str(exc)[:500]})
                continue
            one_inventory, one_audit, one_classes, audit_status = audit_one_source(code_dir, source_slug, manifest_row, RAW_ZIP_DIR)
            inventory_rows.extend(one_inventory)
            audit_rows.extend(one_audit)
            class_rows.extend(one_classes)
            audit_status_rows.append(audit_status)
            if audit_status.get("audit_status") == "audited" and should_cache_large_source(row):
                cache_rows.append(add_large_source_to_cache_package(manifest_row, output, cache_dir=RAW_CACHE_PACKAGE_DIR))
            cleanup_paths(output, WORK_DIR / source_slug, SOURCE_REPORT_ROOT / source_slug)
        elif audit_mode == "kaggle_dataset_direct":
            dataset_slug = row.get("kaggle_input_slug", "vietfood68")
            preferred_subdir = row.get("preferred_subdir", "dataset")
            try:
                source_dir = find_kaggle_dataset_source_dir(KAGGLE_INPUT, dataset_slug, preferred_subdir)
            except Exception as exc:
                audit_status_rows.append({"source_slug": source_slug, "audit_status": "not_audited", "reason": "kaggle_dataset_source_missing", "error": str(exc)[:500]})
                download_rows.append({**row, "download_status": "kaggle_dataset_source_missing"})
                continue
            manifest_row = build_kaggle_direct_manifest_row(row, source_dir)
            download_rows.append({**row, "download_status": "mounted_kaggle_dataset", "path": source_dir.as_posix()})
            one_inventory, one_audit, one_classes, audit_status = audit_one_source(code_dir, source_slug, manifest_row, None)
            inventory_rows.extend(one_inventory)
            audit_rows.extend(one_audit)
            class_rows.extend(one_classes)
            audit_status_rows.append(audit_status)
            cleanup_paths(WORK_DIR / source_slug, SOURCE_REPORT_ROOT / source_slug)
        else:
            audit_status_rows.append({"source_slug": source_slug, "audit_status": "not_audited", "reason": "unknown_audit_mode"})
            download_rows.append({**row, "download_status": "unknown_audit_mode"})

        write_csv(REPORT_DIR / "large_source_download_manifest.csv", download_rows)
        write_csv(REPORT_DIR / "large_source_audit_status.csv", audit_status_rows)

    if cache_rows:
        prepared_cache_summary = cache_package_summary(RAW_CACHE_PACKAGE_DIR)
        print("Large source prepared cache:", json.dumps(prepared_cache_summary, ensure_ascii=False), flush=True)

    cache_upload_result = (
        upload_raw_cache_dataset(
            cache_dir=RAW_CACHE_PACKAGE_DIR,
            dataset_id=RAW_CACHE_DATASET_ID,
            seed_existing=False,
            allow_existing_dataset_version=False,
        )
        if cache_rows
        else {"cache_status": "no_cache_candidates"}
    )
    if cache_rows:
        for row in cache_rows:
            row["cache_status"] = cache_upload_result.get("cache_status", "")
            row["cache_dataset_id"] = cache_upload_result.get("dataset_id", "")
            row["cache_error"] = cache_upload_result.get("error", "")
    write_csv(REPORT_DIR / "large_source_cache_manifest.csv", cache_rows)
    write_csv(REPORT_DIR / "raw_inventory.csv", inventory_rows)
    write_csv(REPORT_DIR / "source_audit.csv", audit_rows)
    write_json(REPORT_DIR / SOURCE_AUDIT_JSON, audit_rows)
    write_csv(REPORT_DIR / "class_candidates.csv", class_rows)
    write_csv(REPORT_DIR / "large_source_download_manifest.csv", download_rows)
    write_csv(REPORT_DIR / "large_source_audit_status.csv", audit_status_rows)

    audit_counts: dict[str, int] = {}
    for row in audit_status_rows:
        status = str(row.get("audit_status", ""))
        audit_counts[status] = audit_counts.get(status, 0) + 1
    download_counts: dict[str, int] = {}
    for row in download_rows:
        status = str(row.get("download_status", ""))
        download_counts[status] = download_counts.get(status, 0) + 1
    write_json(
        REPORT_DIR / "large_source_audit_summary.json",
        {
            "download_status_counts": download_counts,
            "audit_status_counts": audit_counts,
            "cache_upload": cache_upload_result,
            "source_scope": source_scope_path.name,
            "source_audit": str(REPORT_DIR / SOURCE_AUDIT_JSON),
            "sample_grids": str(REPORT_DIR / "sample_grids"),
        },
    )
    run(["zip", "-qr", KAGGLE_LARGE_REPORTS_ZIP.as_posix(), str(REPORT_DIR)])
    print("Large source audit reports ready:", KAGGLE_LARGE_REPORTS_ZIP)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
