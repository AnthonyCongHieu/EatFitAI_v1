from __future__ import annotations

import csv
import errno
import json
import os
import shutil
import subprocess
import sys
import time
import urllib.request
import zipfile
from collections.abc import Callable
from pathlib import Path
from typing import Mapping


KAGGLE_INPUT = Path("/kaggle/input")
TEMP_ROOT = Path("/tmp/eatfitai_dataset_v2_public_drive")
WORK_DIR = TEMP_ROOT / "work"
REPORT_DIR = Path("/kaggle/working/_dataset_v2_reports")
RAW_ZIP_DIR = TEMP_ROOT / "raw_zips"
SOURCE_REPORT_ROOT = TEMP_ROOT / "source_reports"
REMOTE_CACHE_DOWNLOAD_DIR = TEMP_ROOT / "existing_raw_cache_download"
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
RAW_CACHE_DATASET_ID = "hiuinhcng/eatfitai-dataset-v2-public-drive-raw-cache-v2"
RAW_CACHE_PACKAGE_DIR = TEMP_ROOT / "raw_audit_cache_dataset"
RAW_CACHE_INPUT_SLUG = "eatfitai-dataset-v2-raw-audit-cache-v2"
RAW_CACHE_UPLOAD_VERIFY_TIMEOUT_SECONDS = 900
RAW_CACHE_UPLOAD_VERIFY_INTERVAL_SECONDS = 30
CACHE_WRAPPER_SUFFIX = ".zip.cache"


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


def strip_cache_archive_suffixes(name: str) -> str:
    lowered = name.lower()
    for suffix in (CACHE_WRAPPER_SUFFIX, ".cache"):
        if lowered.endswith(suffix):
            name = name[: -len(suffix)]
            lowered = name.lower()
            break
    while lowered.endswith(".zip"):
        name = name[:-4]
        lowered = name.lower()
    return name


def safe_cache_source_name(value: str) -> str:
    raw = strip_cache_archive_suffixes(Path(value.strip() or "source").name)
    while raw.lower().endswith(".zip"):
        raw = raw[:-4]
    safe = "".join(ch if ch.isalnum() or ch in "._-" else "_" for ch in raw)
    return safe.strip("._-") or "source"


def cache_wrapper_path(cache_dir: Path, source_slug: str) -> Path:
    return cache_dir / f"{safe_cache_source_name(source_slug)}{CACHE_WRAPPER_SUFFIX}"


def zip_entry_has_safe_prefix(zip_path: Path, prefix: str) -> bool:
    prefix_text = f"{safe_cache_source_name(prefix)}/"
    try:
        with zipfile.ZipFile(zip_path) as zf:
            names = [name for name in zf.namelist() if name and not name.endswith("/")]
    except zipfile.BadZipFile:
        return False
    return bool(names) and all(name.startswith(prefix_text) for name in names)


def write_cache_wrapper_zip(source: Path, destination: Path, source_slug: str) -> None:
    if destination.exists():
        return
    destination.parent.mkdir(parents=True, exist_ok=True)
    prefix = safe_cache_source_name(source_slug)
    with zipfile.ZipFile(destination, "w", compression=zipfile.ZIP_STORED, allowZip64=True) as zf:
        if source.is_dir():
            for item in sorted(source.rglob("*"), key=lambda path: path.as_posix()):
                if item.is_file():
                    zf.write(item, f"{prefix}/{item.relative_to(source).as_posix()}")
        else:
            zf.write(source, f"{prefix}/{source.name}")


def add_cache_path_to_package(source_slug: str, source_path: Path, cache_dir: Path = RAW_CACHE_PACKAGE_DIR) -> Path:
    write_raw_cache_dataset_metadata(cache_dir)
    destination = cache_wrapper_path(cache_dir, source_slug)
    if source_path.is_file() and zipfile.is_zipfile(source_path) and zip_entry_has_safe_prefix(source_path, source_slug):
        if not destination.exists():
            link_or_copy(source_path, destination)
    else:
        write_cache_wrapper_zip(source_path, destination, source_slug)
    return destination


def find_input_dir(root: Path, slug: str) -> Path | None:
    if not root.exists():
        return None
    owner = RAW_CACHE_DATASET_ID.split("/", 1)[0]
    direct_candidates = [
        root / slug,
        root / owner / slug,
        root / "datasets" / slug,
        root / "datasets" / owner / slug,
    ]
    for candidate in direct_candidates:
        if candidate.is_dir():
            return candidate
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
    remote_cache_getter: Callable[[], Path | None] | None = None,
) -> dict[str, object]:
    existing_cache = find_input_dir(input_root, input_slug)
    seed_status = "seeded_existing_cache"
    if existing_cache is None:
        if remote_cache_getter is None:
            return {"seed_status": "existing_cache_not_mounted", "seeded_entries": 0}
        existing_cache = remote_cache_getter()
        if existing_cache is None or not existing_cache.exists():
            return {"seed_status": "existing_cache_unavailable", "seeded_entries": 0}
        seed_status = "seeded_existing_cache_remote"
    cache_dir.mkdir(parents=True, exist_ok=True)
    seeded = 0
    for entry in sorted(existing_cache.iterdir(), key=lambda item: item.name.lower()):
        if entry.name == "dataset-metadata.json":
            continue
        add_cache_path_to_package(safe_cache_source_name(entry.name), entry, cache_dir)
        seeded += 1
    write_raw_cache_dataset_metadata(cache_dir)
    return {"seed_status": seed_status, "seeded_entries": seeded, "existing_cache_path": existing_cache.as_posix()}


def download_existing_raw_cache_dataset(
    dataset_id: str = RAW_CACHE_DATASET_ID,
    out_dir: Path = REMOTE_CACHE_DOWNLOAD_DIR,
) -> Path | None:
    try:
        if out_dir.exists():
            shutil.rmtree(out_dir, ignore_errors=True)
        out_dir.mkdir(parents=True, exist_ok=True)

        from kaggle.api.kaggle_api_extended import KaggleApi  # type: ignore

        api = KaggleApi()
        api.authenticate()
        api.dataset_download_files(dataset_id, path=str(out_dir), force=True, quiet=True, unzip=True)
    except Exception:
        return None
    return out_dir if any(path.name != "dataset-metadata.json" for path in out_dir.iterdir()) else None


def add_raw_zip_to_cache_package(source: Mapping[str, str], zip_path: Path) -> dict[str, object]:
    source_slug = source.get("source_slug", "") or zip_path.stem
    destination = add_cache_path_to_package(source_slug, zip_path, RAW_CACHE_PACKAGE_DIR)
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


def json_safe_value(value: object) -> object:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if hasattr(value, "isoformat"):
        try:
            iso_value = value.isoformat()  # type: ignore[attr-defined]
            if isinstance(iso_value, str):
                return iso_value
        except Exception:
            pass
    return str(value)


def cache_package_summary(cache_dir: Path) -> dict[str, object]:
    zip_paths = sorted(path for path in cache_dir.rglob("*") if path.is_file() and path.name != "dataset-metadata.json")
    return {
        "zip_count": len(zip_paths),
        "total_zip_bytes": sum(path.stat().st_size for path in zip_paths),
        "zip_names_sample": [path.name for path in zip_paths[:30]],
    }


def api_response_summary(response: object) -> dict[str, object]:
    summary: dict[str, object] = {}
    for attr in ("status", "url", "error", "error_message", "message", "version_number"):
        value = getattr(response, attr, None)
        if value.__class__.__module__.startswith("unittest.mock"):
            continue
        if value not in (None, ""):
            summary[attr] = json_safe_value(value)
    if not summary:
        summary["repr"] = str(response)[:500]
    return summary


def dataset_fingerprint(api: object, dataset_id: str) -> dict[str, object]:
    owner, slug = dataset_id.split("/", 1)
    fingerprint: dict[str, object] = {"dataset_id": dataset_id, "exists": False}
    try:
        for item in api.dataset_list(search=slug, user=owner) or []:
            if getattr(item, "ref", "") != dataset_id:
                continue
            fingerprint.update(
                {
                    "exists": True,
                    "id": json_safe_value(getattr(item, "id", None)),
                    "current_version_number": json_safe_value(getattr(item, "current_version_number", None)),
                    "total_bytes": json_safe_value(getattr(item, "total_bytes", None)),
                    "last_updated": json_safe_value(getattr(item, "last_updated", None)),
                }
            )
            break
    except Exception as exc:
        fingerprint["metadata_error"] = sanitize_error_message(exc)
    try:
        page = api.dataset_list_files(dataset_id, page_size=1000)
        files = list(getattr(page, "files", []) or [])
        roots = sorted({str(getattr(file_info, "name", "")).split("/", 1)[0] for file_info in files if getattr(file_info, "name", "")})
        fingerprint["file_count_sample"] = len(files)
        fingerprint["file_roots_sample"] = roots[:50]
        fingerprint["has_more_files"] = bool(getattr(page, "next_page_token", None))
    except Exception as exc:
        fingerprint["files_error"] = sanitize_error_message(exc)
    return fingerprint


def int_or_none(value: object) -> int | None:
    try:
        if value is None or value == "":
            return None
        return int(value)
    except (TypeError, ValueError):
        return None


def dataset_publish_changed(before: Mapping[str, object], after: Mapping[str, object]) -> bool:
    if not before.get("exists"):
        return bool(after.get("exists"))
    before_version = int_or_none(before.get("current_version_number"))
    after_version = int_or_none(after.get("current_version_number"))
    if before_version is not None and after_version is not None:
        return after_version > before_version
    if before.get("last_updated") and after.get("last_updated") and before.get("last_updated") != after.get("last_updated"):
        return True
    if before.get("total_bytes") is not None and after.get("total_bytes") is not None:
        return before.get("total_bytes") != after.get("total_bytes")
    return False


def safe_dataset_status(api: object, dataset_id: str) -> str:
    try:
        return str(api.dataset_status(dataset_id))
    except Exception as exc:
        return f"status_unavailable: {sanitize_error_message(exc)}"


def wait_for_dataset_publish(
    api: object,
    dataset_id: str,
    before: Mapping[str, object],
    timeout_seconds: int = RAW_CACHE_UPLOAD_VERIFY_TIMEOUT_SECONDS,
    interval_seconds: int = RAW_CACHE_UPLOAD_VERIFY_INTERVAL_SECONDS,
    sleep_fn: Callable[[float], None] = time.sleep,
) -> dict[str, object]:
    deadline = time.monotonic() + max(0, timeout_seconds)
    while True:
        after = dataset_fingerprint(api, dataset_id)
        after["dataset_status"] = safe_dataset_status(api, dataset_id)
        if dataset_publish_changed(before, after):
            after["publish_verified"] = True
            return after
        if time.monotonic() >= deadline:
            after["publish_verified"] = False
            return after
        sleep_fn(max(1, interval_seconds))


def upload_raw_cache_dataset(
    cache_dir: Path = RAW_CACHE_PACKAGE_DIR,
    dataset_id: str = RAW_CACHE_DATASET_ID,
    secret_getter=get_kaggle_secret,
    api_factory: Callable[[], object] | None = None,
    remote_cache_getter: Callable[[], Path | None] | None = None,
    seed_existing: bool = True,
    allow_existing_dataset_version: bool = True,
    verify_timeout_seconds: int = RAW_CACHE_UPLOAD_VERIFY_TIMEOUT_SECONDS,
    verify_interval_seconds: int = RAW_CACHE_UPLOAD_VERIFY_INTERVAL_SECONDS,
    sleep_fn: Callable[[float], None] = time.sleep,
) -> dict[str, object]:
    cache_files = (
        sorted(path for path in cache_dir.rglob("*") if path.is_file() and path.name != "dataset-metadata.json")
        if cache_dir.exists()
        else []
    )
    if not cache_files:
        all_files = sorted(path for path in cache_dir.rglob("*") if path.is_file()) if cache_dir.exists() else []
        return {
            "cache_status": "no_cache_candidates",
            "cache_dir": cache_dir.as_posix(),
            "cache_dir_exists": cache_dir.exists(),
            "cache_file_count": 0,
            "cache_dir_files_sample": [path.name for path in all_files[:30]],
        }

    try:
        token = secret_getter(KAGGLE_TOKEN_SECRET_LABEL)
    except KaggleSecretUnavailable as exc:
        return {"cache_status": "cache_upload_failed", "error": str(exc), "secret_status": exc.status}
    if not token:
        return {"cache_status": "cache_upload_failed", "error": "missing KAGGLE_API_TOKEN secret"}
    os.environ["KAGGLE_API_TOKEN"] = token

    api: object | None = None
    package_summary: dict[str, object] = {}
    before_upload: dict[str, object] = {}
    seed_result: dict[str, object] = {}
    try:
        if seed_existing:
            if remote_cache_getter is None:
                remote_cache_getter = lambda: download_existing_raw_cache_dataset(dataset_id)
            seed_result = seed_existing_raw_cache_dataset(
                cache_dir,
                remote_cache_getter=remote_cache_getter,
            )
        else:
            seed_result = {"seed_status": "seed_skipped", "seeded_entries": 0}
        write_raw_cache_dataset_metadata(cache_dir, dataset_id=dataset_id)

        if api_factory is None:
            from kaggle.api.kaggle_api_extended import KaggleApi  # type: ignore

            api_factory = KaggleApi

        api = api_factory()
        api.authenticate()
        package_summary = cache_package_summary(cache_dir)
        before_upload = dataset_fingerprint(api, dataset_id)
        dataset_already_exists = bool(before_upload.get("exists"))
        print("Raw cache upload package:", json.dumps(package_summary, ensure_ascii=False), flush=True)
        print("Raw cache dataset before upload:", json.dumps(before_upload, ensure_ascii=False), flush=True)
        if dataset_already_exists:
            if not allow_existing_dataset_version:
                return {
                    "cache_status": "cache_upload_failed",
                    "error": "cache dataset already exists; choose a new immutable cache dataset id",
                    "dataset_id": dataset_id,
                    "package_summary": package_summary,
                    "pre_upload": before_upload,
                    **seed_result,
                }
            response = api.dataset_create_version(
                str(cache_dir),
                version_notes="Cache authenticated Drive raw zips after successful source audit",
                quiet=False,
                convert_to_csv=False,
                dir_mode="skip",
            )
        else:
            response = api.dataset_create_new(
                str(cache_dir),
                public=False,
                quiet=False,
                convert_to_csv=False,
                dir_mode="skip",
            )
        response_summary = api_response_summary(response)
        if response_summary:
            print("Raw cache upload response:", json.dumps(response_summary, ensure_ascii=False), flush=True)
        post_upload = wait_for_dataset_publish(
            api,
            dataset_id,
            before_upload,
            timeout_seconds=verify_timeout_seconds,
            interval_seconds=verify_interval_seconds,
            sleep_fn=sleep_fn,
        )
        print("Raw cache dataset after upload:", json.dumps(post_upload, ensure_ascii=False), flush=True)
    except Exception as exc:
        upload_error = sanitize_error_message(exc)
        expected_file_count = int_or_none(package_summary.get("zip_count"))
        if api is not None and expected_file_count:
            try:
                post_upload = wait_for_dataset_publish(
                    api,
                    dataset_id,
                    before_upload,
                    timeout_seconds=min(verify_timeout_seconds, 180),
                    interval_seconds=verify_interval_seconds,
                    sleep_fn=sleep_fn,
                )
                print("Raw cache dataset after upload exception:", json.dumps(post_upload, ensure_ascii=False), flush=True)
                published_file_count = int_or_none(post_upload.get("file_count_sample"))
                if post_upload.get("exists") and published_file_count is not None and published_file_count >= expected_file_count:
                    post_upload["publish_verified"] = True
                    return {
                        "cache_status": "cached_to_kaggle_dataset",
                        "dataset_id": dataset_id,
                        "package_summary": package_summary,
                        "pre_upload": before_upload,
                        "post_upload": post_upload,
                        "upload_warning": upload_error,
                        **seed_result,
                    }
            except Exception as verify_exc:
                upload_error = f"{upload_error}; verify_after_exception={sanitize_error_message(verify_exc)}"
        return {"cache_status": "cache_upload_failed", "error": upload_error}
    if not post_upload.get("publish_verified"):
        return {
            "cache_status": "cache_upload_failed",
            "error": "raw cache dataset publish was not verified after Kaggle upload",
            "dataset_id": dataset_id,
            "package_summary": package_summary,
            "pre_upload": before_upload,
            "post_upload": post_upload,
            **seed_result,
        }
    return {
        "cache_status": "cached_to_kaggle_dataset",
        "dataset_id": dataset_id,
        "package_summary": package_summary,
        "pre_upload": before_upload,
        "post_upload": post_upload,
        **seed_result,
    }


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

    cache_upload_result = (
        upload_raw_cache_dataset(seed_existing=False, allow_existing_dataset_version=False)
        if cache_rows
        else {"cache_status": "no_cache_candidates"}
    )
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
