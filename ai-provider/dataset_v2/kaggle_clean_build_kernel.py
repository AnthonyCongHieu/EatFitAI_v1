from __future__ import annotations

import csv
import json
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path
from typing import Any, Mapping


KAGGLE_INPUT = Path("/kaggle/input")
TEMP_ROOT = Path("/tmp/eatfitai_dataset_v2_clean_build")
WORK_DIR = TEMP_ROOT / "work"
REPORT_DIR = Path("/kaggle/working/_dataset_v2_clean_build_reports")
CLEAN_DATASET_DIR = Path("/kaggle/working/eatfitai_dataset_v2_clean_candidate")
CLEAN_DATASET_ZIP = Path("/kaggle/working/eatfitai_dataset_v2_clean_candidate.zip")
REPORTS_ZIP = Path("/kaggle/working/eatfitai_dataset_v2_clean_build_reports.zip")

CLEAN_SOURCE_POLICY = "clean_candidate_sources_2026-05-06.csv"
CLEAN_TAXONOMY = "class_taxonomy.clean_candidate_2026-05-06.yaml"
PUBLIC_DRIVE_SOURCES = "public_drive_raw_sources.csv"
RAW_SOURCE_REGISTRY = "raw_source_registry.yaml"
SOURCE_CLASS_MAPS = "source_class_maps.yaml"

RAW_CACHE_INPUT_SLUG = "eatfitai-dataset-v2-raw-audit-cache"
VIETFOOD_INPUT_SLUG = "vietfood68"


def run(cmd: list[str]) -> None:
    print("+", " ".join(cmd), flush=True)
    subprocess.run(cmd, check=True)


def install_runtime_dependencies(code_dir: Path) -> None:
    requirements = code_dir / "requirements.dataset_v2.txt"
    if requirements.exists():
        run([sys.executable, "-m", "pip", "install", "-q", "-r", str(requirements)])
    else:
        run([sys.executable, "-m", "pip", "install", "-q", "pyyaml", "pillow", "opencv-python-headless"])


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def write_csv(path: Path, rows: list[Mapping[str, object]], fieldnames: list[str] | None = None) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if fieldnames is None:
        fieldnames = []
        for row in rows:
            for key in row:
                if key not in fieldnames:
                    fieldnames.append(str(key))
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({key: row.get(key, "") for key in fieldnames})


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def find_code_dir_under(root: Path) -> Path:
    candidates = [path for path in root.rglob("build_clean_dataset.py") if (path.parent / CLEAN_SOURCE_POLICY).exists()]
    if not candidates:
        raise FileNotFoundError(f"No pipeline code dataset with {CLEAN_SOURCE_POLICY} found under {root}")
    return sorted({path.parent for path in candidates}, key=lambda item: len(item.as_posix()))[0]


def find_code_dir() -> Path:
    return find_code_dir_under(KAGGLE_INPUT)


def find_input_dir(root: Path, slug: str) -> Path | None:
    for path in sorted(root.iterdir(), key=lambda item: item.name.lower()):
        if path.is_dir() and path.name == slug:
            return path
    for path in sorted(root.iterdir(), key=lambda item: item.name.lower()):
        if path.is_dir() and slug in path.name:
            return path
    for path in sorted(root.rglob("*"), key=lambda item: (len(item.as_posix()), item.name.lower())):
        if path.is_dir() and path.name == slug:
            return path
    for path in sorted(root.rglob("*"), key=lambda item: (len(item.as_posix()), item.name.lower())):
        if path.is_dir() and slug in path.name:
            return path
    return None


def strip_zip_suffixes(name: str) -> str:
    lowered = name.lower()
    while lowered.endswith(".zip"):
        name = name[:-4]
        lowered = name.lower()
    return name


def candidate_keys_for_name(name: str) -> set[str]:
    base = Path(name).name
    stripped = strip_zip_suffixes(base)
    return {base, stripped, base.lower(), stripped.lower()}


def has_yolo_layout(path: Path) -> bool:
    if not path.is_dir():
        return False
    has_images = any(child.is_dir() and child.name == "images" for child in path.rglob("images"))
    has_labels = any(child.is_dir() and child.name == "labels" for child in path.rglob("labels"))
    if any((path / name).exists() for name in ("data.yaml", "data.yml")) and has_images and has_labels:
        return True
    if (path / "images").is_dir() and (path / "labels").is_dir():
        return True
    for split in ("train", "valid", "val", "test"):
        if (path / split / "images").is_dir() and (path / split / "labels").is_dir():
            return True
    return False


def collect_cache_entries(cache_dir: Path | None) -> dict[str, Path]:
    entries: dict[str, Path] = {}
    if cache_dir is None or not cache_dir.exists():
        return entries
    for path in sorted(cache_dir.iterdir(), key=lambda item: item.name.lower()):
        if path.name == "dataset-metadata.json":
            continue
        if path.is_dir() or ".zip" in path.name.lower():
            for key in candidate_keys_for_name(path.name):
                entries.setdefault(key, path)
    return entries


def source_policy_included_slugs(policy_rows: list[Mapping[str, str]]) -> list[str]:
    slugs: list[str] = []
    for row in policy_rows:
        if (row.get("include_in_default_clean") or "").strip().lower() in {"1", "true", "yes", "y"}:
            slugs.append(str(row.get("source_slug") or ""))
    return [slug for slug in slugs if slug]


def build_source_lookup(code_dir: Path) -> dict[str, dict[str, str]]:
    from common import load_yaml  # type: ignore

    lookup: dict[str, dict[str, str]] = {}
    public_drive_path = code_dir / PUBLIC_DRIVE_SOURCES
    if public_drive_path.exists():
        for row in read_csv(public_drive_path):
            slug = row.get("source_slug", "").strip()
            if not slug:
                continue
            lookup.setdefault(slug, {}).update(row)
            zip_name = row.get("drive_zip_name", "").strip()
            if zip_name:
                lookup[slug]["expected_name"] = zip_name

    registry_path = code_dir / RAW_SOURCE_REGISTRY
    if registry_path.exists():
        registry = load_yaml(registry_path)
        for slug, row in (registry.get("roboflow_sources") or {}).items():
            if not isinstance(row, dict):
                continue
            text_row = {key: str(value) for key, value in row.items()}
            lookup.setdefault(str(slug), {}).update(text_row)
            output_name = text_row.get("output_name", "").strip()
            if output_name:
                lookup[str(slug)]["expected_name"] = output_name
    return lookup


def resolve_cache_source_path(slug: str, lookup: Mapping[str, Mapping[str, str]], cache_entries: Mapping[str, Path]) -> Path | None:
    names = [slug]
    source_meta = lookup.get(slug, {})
    for key in ("expected_name", "drive_zip_name", "output_name", "zip_name"):
        value = source_meta.get(key, "").strip()
        if value:
            names.append(value)
    for name in names:
        for key in candidate_keys_for_name(name):
            if key in cache_entries:
                return cache_entries[key]
    return None


def find_yolo_root(path: Path) -> Path:
    if path.is_dir() and has_yolo_layout(path):
        return path
    for candidate in sorted(path.rglob("*"), key=lambda item: len(item.as_posix())):
        if candidate.is_dir() and has_yolo_layout(candidate):
            return candidate
    raise FileNotFoundError(f"No YOLO images/labels layout found under {path}")


def safe_extract_name(value: str) -> str:
    safe = "".join(ch if ch.isalnum() or ch in "._-" else "_" for ch in (value.strip() or "source"))
    return safe.strip("._-") or "source"


def safe_extract_zip(zip_path: Path, destination: Path) -> None:
    destination.mkdir(parents=True, exist_ok=True)
    root = destination.resolve()
    with zipfile.ZipFile(zip_path) as zf:
        for member in zf.infolist():
            target = (destination / member.filename).resolve()
            if target != root and root not in target.parents:
                raise ValueError(f"Refusing unsafe zip member path: {member.filename}")
            if member.is_dir():
                target.mkdir(parents=True, exist_ok=True)
                continue
            target.parent.mkdir(parents=True, exist_ok=True)
            with zf.open(member) as src, target.open("wb") as dst:
                shutil.copyfileobj(src, dst)


def first_nested_zip(path: Path) -> Path | None:
    if path.is_file() and path.suffix.lower() == ".zip":
        return path
    if path.is_dir():
        for candidate in sorted(path.rglob("*.zip"), key=lambda item: (len(item.as_posix()), item.name.lower())):
            if candidate.is_file():
                return candidate
    return None


def cache_source_yolo_root(slug: str, source_path: Path | None, extract_root: Path = WORK_DIR / "raw_cache_extract") -> Path:
    if source_path is None:
        raise FileNotFoundError(f"No raw cache path resolved for {slug}")
    current = source_path
    last_error: FileNotFoundError | None = None
    for depth in range(4):
        if current.is_dir():
            try:
                return find_yolo_root(current)
            except FileNotFoundError as exc:
                last_error = exc
                nested_zip = first_nested_zip(current)
                if nested_zip is None:
                    raise
                current = nested_zip
        if current.is_file() and current.suffix.lower() == ".zip":
            target = extract_root / safe_extract_name(slug) / f"level_{depth}" / strip_zip_suffixes(current.name)
            if not target.exists() or not any(target.iterdir()):
                safe_extract_zip(current, target)
            current = target
            continue
        break
    if last_error is not None:
        raise last_error
    raise FileNotFoundError(f"No YOLO images/labels layout found under {source_path}")


def find_vietfood_dir(input_root: Path) -> Path | None:
    dataset_dir = find_input_dir(input_root, VIETFOOD_INPUT_SLUG)
    if dataset_dir is None:
        return None
    preferred = dataset_dir / "dataset"
    if preferred.exists() and has_yolo_layout(preferred):
        return preferred
    try:
        return find_yolo_root(dataset_dir)
    except FileNotFoundError:
        return None


def manifest_row_for_source(
    slug: str,
    source_path: Path,
    source_kind: str,
    lookup: Mapping[str, Mapping[str, str]],
    code_dir: Path,
) -> dict[str, str]:
    row = {key: str(value) for key, value in lookup.get(slug, {}).items()}
    row["source_slug"] = slug
    row["status"] = "found"
    row["extracted_path"] = source_path.as_posix()
    row["package_path"] = source_path.as_posix()
    row.setdefault("initial_decision", "PENDING_AUDIT")
    if source_kind == "kaggle_dataset_direct" and slug == "vietfood67":
        row["initial_decision"] = "LICENSE_RISK_AUDIT_ONLY"
        row["class_names_file"] = str(code_dir / SOURCE_CLASS_MAPS)
        row["class_names_key"] = "vietfood67"
    return row


def audit_mounted_sources(audit_rows_input: list[dict[str, str]], report_dir: Path) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    from audit_sources import AUDIT_FIELDS, audit_mounted_source  # type: ignore

    audit_rows: list[dict[str, Any]] = []
    class_rows: list[dict[str, Any]] = []
    for row in audit_rows_input:
        metrics, candidates = audit_mounted_source(row, Path(row["extracted_path"]))
        audit_rows.append(metrics)
        class_rows.extend(candidates)
    write_csv(report_dir / "source_audit.csv", audit_rows, AUDIT_FIELDS)
    write_json(report_dir / "source_audit.json", audit_rows)
    write_csv(
        report_dir / "class_candidates.csv",
        class_rows,
        ["source_slug", "raw_class_name", "normalized_class_name", "instances", "images", "suggested_canonical_name", "decision"],
    )
    return audit_rows, class_rows


def main() -> int:
    print("Kaggle input directories:")
    for path in sorted(KAGGLE_INPUT.iterdir(), key=lambda item: item.name.lower()):
        print(" -", path)

    code_dir = find_code_dir()
    print("Pipeline code dataset:", code_dir)
    install_runtime_dependencies(code_dir)
    if str(code_dir) not in sys.path:
        sys.path.insert(0, str(code_dir))

    from build_clean_dataset import clean_dataset, filter_audit_rows_by_policy, load_source_policy  # type: ignore
    from common import load_yaml  # type: ignore
    from validate_clean_dataset import validate  # type: ignore

    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    WORK_DIR.mkdir(parents=True, exist_ok=True)

    policy_path = code_dir / CLEAN_SOURCE_POLICY
    taxonomy_path = code_dir / CLEAN_TAXONOMY
    policy_rows = read_csv(policy_path)
    included_slugs = source_policy_included_slugs(policy_rows)
    lookup = build_source_lookup(code_dir)
    cache_dir = find_input_dir(KAGGLE_INPUT, RAW_CACHE_INPUT_SLUG)
    cache_entries = collect_cache_entries(cache_dir)
    vietfood_dir = find_vietfood_dir(KAGGLE_INPUT)

    inventory_rows: list[dict[str, object]] = []
    audit_inputs: list[dict[str, str]] = []
    missing_sources: list[str] = []

    for slug in included_slugs:
        if slug == "vietfood67":
            if vietfood_dir is None:
                missing_sources.append(slug)
                inventory_rows.append({"source_slug": slug, "source_status": "missing_kaggle_dataset_direct", "expected": VIETFOOD_INPUT_SLUG})
                continue
            audit_inputs.append(manifest_row_for_source(slug, vietfood_dir, "kaggle_dataset_direct", lookup, code_dir))
            inventory_rows.append({"source_slug": slug, "source_status": "found_kaggle_dataset_direct", "path": vietfood_dir.as_posix()})
            continue
        source_path = resolve_cache_source_path(slug, lookup, cache_entries)
        if source_path is None:
            missing_sources.append(slug)
            expected = lookup.get(slug, {}).get("expected_name", slug)
            inventory_rows.append({"source_slug": slug, "source_status": "missing_raw_cache", "expected": expected})
            continue
        try:
            yolo_root = cache_source_yolo_root(slug, source_path)
        except FileNotFoundError as exc:
            missing_sources.append(slug)
            inventory_rows.append({"source_slug": slug, "source_status": "invalid_raw_cache_layout", "path": source_path.as_posix(), "error": str(exc)})
            continue
        audit_inputs.append(manifest_row_for_source(slug, yolo_root, "raw_cache", lookup, code_dir))
        inventory_rows.append({"source_slug": slug, "source_status": "found_raw_cache", "path": yolo_root.as_posix()})

    write_csv(REPORT_DIR / "clean_build_input_inventory.csv", inventory_rows)
    write_json(
        REPORT_DIR / "clean_build_preflight_summary.json",
        {
            "status": "blocked_missing_sources" if missing_sources else "ready",
            "included_source_count": len(included_slugs),
            "found_source_count": len(audit_inputs),
            "missing_sources": missing_sources,
            "raw_cache_input": cache_dir.as_posix() if cache_dir else "",
            "vietfood67_input": vietfood_dir.as_posix() if vietfood_dir else "",
            "source_policy": policy_path.as_posix(),
            "taxonomy": taxonomy_path.as_posix(),
        },
    )

    if missing_sources:
        print("Clean build blocked. Missing included source(s):", ", ".join(missing_sources), flush=True)
        run(["zip", "-qr", REPORTS_ZIP.as_posix(), str(REPORT_DIR)])
        return 0

    audit_rows, _class_rows = audit_mounted_sources(audit_inputs, REPORT_DIR)
    policy = load_source_policy(policy_path)
    selected_audit_rows = filter_audit_rows_by_policy(audit_rows, policy)
    taxonomy = load_yaml(taxonomy_path)
    summary = clean_dataset(selected_audit_rows, taxonomy, CLEAN_DATASET_DIR, REPORT_DIR)
    validation_summary = validate(CLEAN_DATASET_DIR)
    write_json(REPORT_DIR / "clean_build_summary.json", {"build": summary, "validation": validation_summary})
    run(["zip", "-qr", CLEAN_DATASET_ZIP.as_posix(), str(CLEAN_DATASET_DIR)])
    run(["zip", "-qr", REPORTS_ZIP.as_posix(), str(REPORT_DIR)])
    print(json.dumps({"build": summary, "validation": validation_summary}, ensure_ascii=False, indent=2), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
