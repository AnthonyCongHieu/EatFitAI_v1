from __future__ import annotations

import csv
import errno
import json
import os
import shutil
import subprocess
import sys
import urllib.request
import zipfile
from pathlib import Path
from typing import Mapping


KAGGLE_INPUT = Path("/kaggle/input")
TEMP_ROOT = Path("/tmp/eatfitai_dataset_v2_public_drive")
WORK_DIR = TEMP_ROOT / "work"
REPORT_DIR = Path("/kaggle/working/_dataset_v2_reports")
RAW_ZIP_DIR = TEMP_ROOT / "raw_zips"
SOURCE_REPORT_ROOT = TEMP_ROOT / "source_reports"
DOWNLOAD_MANIFEST = REPORT_DIR / "public_drive_download_manifest.csv"
CACHE_MANIFEST = REPORT_DIR / "raw_audit_cache_manifest.csv"
PUBLIC_DRIVE_SOURCES = "public_drive_raw_sources.csv"
PUBLIC_DRIVE_SOURCE_SCOPE = "public_drive_source_scope.csv"
SOURCE_DECISIONS = "source_decisions.public_review.csv"
MAX_SINGLE_ZIP_BYTES = 20_000_000_000
RCLONE_SECRET_LABEL = "RCLONE_DRIVE_CONF"
KAGGLE_TOKEN_SECRET_LABEL = "KAGGLE_API_TOKEN"
RCLONE_ROOT = Path("/tmp/eatfitai_rclone")
RCLONE_CONFIG_PATH = RCLONE_ROOT / "rclone.conf"
RCLONE_BIN_DIR = RCLONE_ROOT / "bin"
RCLONE_DOWNLOAD_URL = "https://downloads.rclone.org/rclone-current-linux-amd64.zip"
RAW_CACHE_DATASET_ID = "hiuinhcng/eatfitai-dataset-v2-raw-audit-cache"
RAW_CACHE_PACKAGE_DIR = TEMP_ROOT / "raw_audit_cache_dataset"
RAW_CACHE_INPUT_SLUG = "eatfitai-dataset-v2-raw-audit-cache"


class KaggleSecretUnavailable(RuntimeError):
    def __init__(self, label: str, status: str, exc: Exception):
        super().__init__(f"{label} unavailable: {status} ({type(exc).__name__})")
        self.label = label
        self.status = status
        self.error_type = type(exc).__name__


def classify_secret_exception(exc: Exception) -> str:
    error_type = type(exc).__name__
    message = str(exc).lower()
    if error_type == "ConnectionError":
        return "drive_secret_unreachable"
    if error_type == "CredentialError":
        return "drive_secret_auth_failed"
    if error_type == "NotFoundError" or "no user secrets exist" in message or "not found" in message:
        return "drive_secret_missing"
    return "drive_secret_missing"


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
    candidates = [Path.cwd(), *[path for path in sorted(input_root.iterdir()) if path.is_dir()]]
    for candidate in candidates:
        if (candidate / "audit_sources.py").exists() and (candidate / PUBLIC_DRIVE_SOURCES).exists():
            return candidate
    for candidate in sorted(input_root.rglob("*")):
        if candidate.is_dir() and (candidate / "audit_sources.py").exists() and (candidate / PUBLIC_DRIVE_SOURCES).exists():
            return candidate
    raise FileNotFoundError("No pipeline code dataset with public Drive manifest found under /kaggle/input")


def find_code_dir() -> Path:
    return find_code_dir_under(KAGGLE_INPUT)


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def filter_drive_rows_by_scope(rows: list[dict[str, str]], scope_path: Path) -> list[dict[str, str]]:
    if not scope_path.exists():
        return rows
    scope_rows = read_csv(scope_path)
    slugs = {row.get("source_slug", "").strip() for row in scope_rows if row.get("source_slug", "").strip()}
    zip_names = {row.get("drive_zip_name", "").strip() for row in scope_rows if row.get("drive_zip_name", "").strip()}
    return [
        row
        for row in rows
        if row.get("source_slug", "").strip() in slugs or row.get("drive_zip_name", "").strip() in zip_names
    ]


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


def public_drive_download_url(file_id: str) -> str:
    return f"https://drive.google.com/uc?id={file_id}"


def is_safe_kaggle_download_path(path: Path) -> bool:
    text = path.as_posix()
    return text.startswith("/tmp/") or text.startswith("/kaggle/")


def build_rclone_copyid_command(
    rclone_binary: str,
    config_path: Path,
    drive_file_id: str,
    output: Path,
) -> list[str]:
    if not is_safe_kaggle_download_path(output):
        raise ValueError(f"Refusing non-Kaggle download destination: {output}")
    return [
        rclone_binary,
        "--config",
        config_path.as_posix(),
        "backend",
        "copyid",
        "eatfitai_drive:",
        drive_file_id,
        output.as_posix(),
    ]


def get_kaggle_secret(label: str) -> str | None:
    try:
        from kaggle_secrets import UserSecretsClient  # type: ignore

        return UserSecretsClient().get_secret(label)
    except Exception as exc:
        status = classify_secret_exception(exc)
        print(f"Kaggle secret {label} unavailable: {type(exc).__name__} ({status})", flush=True)
        raise KaggleSecretUnavailable(label, status, exc) from exc


def normalize_rclone_config_secret(secret_value: str) -> str:
    value = secret_value.strip()
    if "\\n" in value and "\n" not in value:
        value = value.replace("\\r\\n", "\n").replace("\\n", "\n")
    value = value.replace("\r\n", "\n").replace("\r", "\n")
    return value.rstrip() + "\n"


def write_rclone_config_secret(secret_value: str, config_path: Path = RCLONE_CONFIG_PATH) -> Path:
    config_text = normalize_rclone_config_secret(secret_value)
    if not any(line.strip() == "[eatfitai_drive]" for line in config_text.splitlines()):
        raise ValueError("RCLONE_DRIVE_CONF must contain an [eatfitai_drive] remote")
    config_path.parent.mkdir(parents=True, exist_ok=True)
    config_path.write_text(config_text, encoding="utf-8")
    os.chmod(config_path, 0o600)
    return config_path


def ensure_rclone_binary() -> str:
    existing = shutil.which("rclone")
    if existing:
        return existing

    RCLONE_BIN_DIR.mkdir(parents=True, exist_ok=True)
    target = RCLONE_BIN_DIR / "rclone"
    if target.exists():
        return target.as_posix()

    archive = RCLONE_ROOT / "rclone-current-linux-amd64.zip"
    urllib.request.urlretrieve(RCLONE_DOWNLOAD_URL, archive)
    with zipfile.ZipFile(archive) as zf:
        member = next(name for name in zf.namelist() if name.endswith("/rclone"))
        with zf.open(member) as src, target.open("wb") as dst:
            shutil.copyfileobj(src, dst)
    os.chmod(target, 0o755)
    return target.as_posix()


def run_rclone_copyid(command: list[str]) -> None:
    subprocess.run(command, check=True, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)


def sanitize_error_message(value: object, max_chars: int = 500) -> str:
    text = str(value)
    return " ".join(text.split())[:max_chars]


def format_subprocess_error(exc: BaseException, max_chars: int = 1200) -> str:
    if isinstance(exc, subprocess.CalledProcessError):
        parts = [str(exc)]
        output = getattr(exc, "output", None)
        if output:
            parts.append(str(output))
        stderr = getattr(exc, "stderr", None)
        if stderr:
            parts.append(str(stderr))
        return sanitize_error_message(" ".join(parts), max_chars)
    return sanitize_error_message(exc, max_chars)


def classify_rclone_exception(exc: BaseException) -> str:
    if isinstance(exc, FileNotFoundError):
        return "rclone_install_failed"
    message = format_subprocess_error(exc).lower()
    if any(marker in message for marker in ("oauth", "token", "invalid_grant", "unauthorized", "permission", "403")):
        return "drive_oauth_failed"
    if isinstance(exc, subprocess.CalledProcessError):
        return "drive_oauth_failed"
    return "download_failed_exception"


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
        "description": "private raw audit cache for authenticated Drive-sourced EatFitAI Dataset V2 zip files.",
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


def copy_cache_entry(source: Path, destination: Path) -> None:
    if destination.exists():
        return
    if source.is_dir():
        shutil.copytree(source, destination)
    else:
        link_or_copy(source, destination)


def seed_existing_raw_cache_dataset(
    cache_dir: Path,
    input_root: Path = KAGGLE_INPUT,
    input_slug: str = RAW_CACHE_INPUT_SLUG,
) -> dict[str, object]:
    existing_cache = find_input_dir(input_root, input_slug)
    if existing_cache is None:
        return {"seed_status": "existing_cache_not_mounted", "seeded_entries": 0}
    cache_dir.mkdir(parents=True, exist_ok=True)
    seeded = 0
    for entry in sorted(existing_cache.iterdir(), key=lambda item: item.name.lower()):
        if entry.name == "dataset-metadata.json":
            continue
        copy_cache_entry(entry, cache_dir / entry.name)
        seeded += 1
    write_raw_cache_dataset_metadata(cache_dir)
    return {"seed_status": "seeded_existing_cache", "seeded_entries": seeded, "existing_cache_path": existing_cache.as_posix()}


def add_raw_zip_to_cache_package(source: Mapping[str, str], zip_path: Path) -> dict[str, object]:
    write_raw_cache_dataset_metadata(RAW_CACHE_PACKAGE_DIR)
    destination = RAW_CACHE_PACKAGE_DIR / zip_path.name
    if not destination.exists():
        link_or_copy(zip_path, destination)
    return {
        "source_slug": source.get("source_slug", ""),
        "drive_zip_name": source.get("drive_zip_name", ""),
        "drive_file_id": source.get("drive_file_id", ""),
        "cache_path": destination.name,
        "size_bytes": destination.stat().st_size,
        "cache_status": "prepared_for_cache",
    }


def dataset_exists(api: object, dataset_id: str) -> bool:
    owner, slug = dataset_id.split("/", 1)
    for item in api.dataset_list(search=slug, user=owner) or []:
        if getattr(item, "ref", "") == dataset_id:
            return True
    return False


def upload_raw_cache_dataset(
    cache_dir: Path = RAW_CACHE_PACKAGE_DIR,
    dataset_id: str = RAW_CACHE_DATASET_ID,
    secret_getter=get_kaggle_secret,
) -> dict[str, object]:
    if not cache_dir.exists() or not any(path.suffix.lower() == ".zip" for path in cache_dir.iterdir()):
        return {"cache_status": "no_cache_candidates"}

    try:
        token = secret_getter(KAGGLE_TOKEN_SECRET_LABEL)
    except KaggleSecretUnavailable as exc:
        return {"cache_status": "cache_upload_failed", "error": str(exc), "secret_status": exc.status}
    if not token:
        return {"cache_status": "cache_upload_failed", "error": "missing KAGGLE_API_TOKEN secret"}
    os.environ["KAGGLE_API_TOKEN"] = token

    try:
        seed_result = seed_existing_raw_cache_dataset(cache_dir)
        write_raw_cache_dataset_metadata(cache_dir, dataset_id=dataset_id)

        from kaggle.api.kaggle_api_extended import KaggleApi  # type: ignore

        api = KaggleApi()
        api.authenticate()
        if dataset_exists(api, dataset_id):
            api.dataset_create_version(
                str(cache_dir),
                version_notes="Cache authenticated Drive raw zips after successful source audit",
                quiet=True,
                convert_to_csv=False,
                dir_mode="zip",
            )
        else:
            api.dataset_create_new(
                str(cache_dir),
                public=False,
                quiet=True,
                convert_to_csv=False,
                dir_mode="zip",
            )
    except Exception as exc:
        return {"cache_status": "cache_upload_failed", "error": sanitize_error_message(exc)}
    return {"cache_status": "cached_to_kaggle_dataset", "dataset_id": dataset_id, **seed_result}


def decision_text(row: Mapping[str, str]) -> str:
    return " ".join(
        row.get(key, "")
        for key in (
            "initial_decision",
            "public_decision",
            "decision",
        )
    ).upper()


def should_download_public_drive_source(source: Mapping[str, str], decision: Mapping[str, str]) -> bool:
    if not source.get("drive_zip_name") or not source.get("drive_file_id"):
        return False
    text = decision_text(decision)
    return "QUARANTINE" not in text and "REJECT" not in text


def parse_optional_int(value: object) -> int | None:
    text = str(value or "").strip()
    if not text:
        return None
    try:
        return int(text)
    except ValueError:
        return None


def is_expected_size_blocked(source: Mapping[str, str], max_bytes: int = MAX_SINGLE_ZIP_BYTES) -> bool:
    expected_size = parse_optional_int(source.get("expected_size_bytes"))
    return expected_size is not None and expected_size > max_bytes


def classify_download_exception(exc: BaseException) -> str:
    message = str(exc).lower()
    if "too many users have viewed or downloaded" in message or "download quota" in message:
        return "download_blocked_drive_quota"
    if isinstance(exc, OSError) and exc.errno == errno.ENOSPC:
        return "resource_blocked_no_space"
    return "download_failed_exception"


def cleanup_paths(*paths: Path) -> None:
    for path in paths:
        if path.is_dir():
            shutil.rmtree(path, ignore_errors=True)
        elif path.exists():
            try:
                path.unlink()
            except OSError:
                pass


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


def download_one_public_drive_source(
    source: Mapping[str, str],
    decision: Mapping[str, str],
    raw_dir: Path,
    max_single_zip_bytes: int = MAX_SINGLE_ZIP_BYTES,
    secret_getter=get_kaggle_secret,
    rclone_binary_getter=ensure_rclone_binary,
    command_runner=run_rclone_copyid,
) -> dict[str, object]:
    raw_dir.mkdir(parents=True, exist_ok=True)
    zip_name = source["drive_zip_name"]
    output = raw_dir / zip_name
    base = {
        **source,
        "public_decision": decision.get("public_decision", ""),
        "domain_role": decision.get("domain_role", ""),
        "path": str(output),
    }
    if not should_download_public_drive_source(source, decision):
        return {**base, "download_status": "skipped_by_decision"}
    if is_expected_size_blocked(source, max_single_zip_bytes):
        return {
            **base,
            "download_status": "resource_blocked_expected_size",
            "resource_limit_bytes": max_single_zip_bytes,
        }
    if output.exists() and output.stat().st_size > 0:
        return {**base, "download_status": "already_exists", "size_bytes": output.stat().st_size}

    try:
        secret_value = secret_getter(RCLONE_SECRET_LABEL)
    except KaggleSecretUnavailable as exc:
        return {**base, "download_status": exc.status, "error": str(exc)}
    if not secret_value:
        return {**base, "download_status": "drive_secret_missing"}

    try:
        config_path = write_rclone_config_secret(secret_value)
    except Exception as exc:
        return {**base, "download_status": "drive_oauth_failed", "error": sanitize_error_message(exc)}

    try:
        rclone_binary = rclone_binary_getter()
    except Exception as exc:
        return {**base, "download_status": "rclone_install_failed", "error": sanitize_error_message(exc)}

    print("Downloading", zip_name, "from authenticated Drive file", source["drive_file_id"], flush=True)
    try:
        command = build_rclone_copyid_command(rclone_binary, config_path, source["drive_file_id"], output)
        command_runner(command)
    except Exception as exc:
        cleanup_paths(output)
        return {**base, "download_status": classify_rclone_exception(exc), "error": format_subprocess_error(exc)}
    if not output.exists() or output.stat().st_size == 0:
        cleanup_paths(output)
        return {**base, "download_status": "download_failed_empty"}
    return {**base, "download_status": "downloaded_oauth_drive", "size_bytes": output.stat().st_size}


def audit_one_downloaded_source(
    code_dir: Path,
    source: Mapping[str, str],
    decision: Mapping[str, str],
    zip_path: Path,
) -> tuple[list[dict[str, object]], list[dict[str, object]], list[dict[str, object]], dict[str, object]]:
    slug = source["source_slug"]
    source_report_dir = SOURCE_REPORT_ROOT / slug
    source_work_dir = WORK_DIR / slug
    manifest_path = TEMP_ROOT / "manifests" / f"{slug}.csv"
    write_single_manifest(manifest_path, decision)

    try:
        run(
            [
                sys.executable,
                str(code_dir / "audit_sources.py"),
                "--raw-dir",
                str(zip_path.parent),
                "--manifest",
                str(manifest_path),
                "--work-dir",
                str(source_work_dir),
                "--out-dir",
                str(source_report_dir),
            ]
        )
        run(
            [
                sys.executable,
                str(code_dir / "make_sample_grids.py"),
                "--audit-json",
                str(source_report_dir / "source_audit.json"),
                "--out-dir",
                str(REPORT_DIR / "sample_grids"),
            ]
        )
    except subprocess.CalledProcessError as exc:
        return [], [], [], {"source_slug": slug, "audit_status": "audit_failed", "returncode": exc.returncode}

    audit_rows = read_json_rows(source_report_dir / "source_audit.json")
    inventory_rows = [dict(row) for row in read_csv(source_report_dir / "raw_inventory.csv")] if (source_report_dir / "raw_inventory.csv").exists() else []
    class_rows = [dict(row) for row in read_csv(source_report_dir / "class_candidates.csv")] if (source_report_dir / "class_candidates.csv").exists() else []
    return inventory_rows, audit_rows, class_rows, {"source_slug": slug, "audit_status": "audited", "audit_rows": len(audit_rows)}


def main() -> int:
    print("Kaggle input directories:")
    for path in sorted(KAGGLE_INPUT.iterdir()):
        print(" -", path)

    code_dir = find_code_dir()
    print("Pipeline code dataset:", code_dir)
    install_runtime_dependencies(code_dir)

    WORK_DIR.mkdir(parents=True, exist_ok=True)
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    RAW_ZIP_DIR.mkdir(parents=True, exist_ok=True)
    SOURCE_REPORT_ROOT.mkdir(parents=True, exist_ok=True)

    drive_rows = read_csv(code_dir / PUBLIC_DRIVE_SOURCES)
    scope_path = code_dir / PUBLIC_DRIVE_SOURCE_SCOPE
    drive_rows = filter_drive_rows_by_scope(drive_rows, scope_path)
    if scope_path.exists():
        print("Public Drive source scope:", scope_path, "rows:", len(drive_rows), flush=True)
    decision_rows = {
        row.get("drive_zip_name", ""): row
        for row in read_csv(code_dir / SOURCE_DECISIONS)
        if row.get("drive_zip_name")
    }
    download_rows: list[dict[str, object]] = []
    inventory_rows: list[dict[str, object]] = []
    audit_rows: list[dict[str, object]] = []
    class_rows: list[dict[str, object]] = []
    audit_status_rows: list[dict[str, object]] = []
    cache_rows: list[dict[str, object]] = []

    for source in drive_rows:
        zip_name = source["drive_zip_name"]
        decision = decision_rows.get(zip_name, {})
        zip_path = RAW_ZIP_DIR / zip_name
        download_row = download_one_public_drive_source(source, decision, RAW_ZIP_DIR)
        download_rows.append(download_row)
        write_csv(DOWNLOAD_MANIFEST, download_rows)
        if download_row.get("download_status") not in {"downloaded_oauth_drive", "already_exists"}:
            audit_status_rows.append(
                {
                    "source_slug": source.get("source_slug", ""),
                    "drive_zip_name": zip_name,
                    "audit_status": "not_audited",
                    "reason": download_row.get("download_status", ""),
                }
            )
            continue
        one_inventory, one_audit, one_classes, audit_status = audit_one_downloaded_source(code_dir, source, decision, zip_path)
        inventory_rows.extend(one_inventory)
        audit_rows.extend(one_audit)
        class_rows.extend(one_classes)
        audit_status_rows.append(audit_status)
        if audit_status.get("audit_status") == "audited":
            cache_rows.append(add_raw_zip_to_cache_package(source, zip_path))
        cleanup_paths(zip_path, WORK_DIR / source["source_slug"], SOURCE_REPORT_ROOT / source["source_slug"])

    cache_upload_result = upload_raw_cache_dataset() if cache_rows else {"cache_status": "no_cache_candidates"}
    if cache_rows:
        for row in cache_rows:
            row["cache_status"] = cache_upload_result.get("cache_status", "")
            row["cache_dataset_id"] = cache_upload_result.get("dataset_id", "")
            row["cache_error"] = cache_upload_result.get("error", "")
    write_csv(CACHE_MANIFEST, cache_rows)
    write_csv(REPORT_DIR / "raw_inventory.csv", inventory_rows)
    write_csv(REPORT_DIR / "source_audit.csv", audit_rows)
    write_json(REPORT_DIR / "source_audit.json", audit_rows)
    write_csv(REPORT_DIR / "class_candidates.csv", class_rows)
    write_csv(REPORT_DIR / "public_drive_audit_status.csv", audit_status_rows)

    status_counts: dict[str, int] = {}
    for row in download_rows:
        status = str(row.get("download_status", ""))
        status_counts[status] = status_counts.get(status, 0) + 1
    audit_counts: dict[str, int] = {}
    for row in audit_status_rows:
        status = str(row.get("audit_status", ""))
        audit_counts[status] = audit_counts.get(status, 0) + 1
    cache_counts: dict[str, int] = {}
    for row in cache_rows:
        status = str(row.get("cache_status", ""))
        cache_counts[status] = cache_counts.get(status, 0) + 1
    (REPORT_DIR / "public_drive_audit_summary.json").write_text(
        json.dumps(
            {
                "download_status_counts": status_counts,
                "audit_status_counts": audit_counts,
                "cache_status_counts": cache_counts,
                "cache_upload": cache_upload_result,
                "download_manifest": str(DOWNLOAD_MANIFEST),
                "cache_manifest": str(CACHE_MANIFEST),
                "source_audit": str(REPORT_DIR / "source_audit.json"),
                "sample_grids": str(REPORT_DIR / "sample_grids"),
                "source_scope": str(scope_path) if scope_path.exists() else "",
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    run(["zip", "-qr", "/kaggle/working/dataset_v2_public_drive_raw_audit_reports.zip", str(REPORT_DIR)])
    print("Audit reports ready: /kaggle/working/dataset_v2_public_drive_raw_audit_reports.zip")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
