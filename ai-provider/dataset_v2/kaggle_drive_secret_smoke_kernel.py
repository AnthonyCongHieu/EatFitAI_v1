from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import urllib.request
import zipfile
from pathlib import Path


KAGGLE_INPUT = Path("/kaggle/input")
REPORT_DIR = Path("/kaggle/working/_dataset_v2_reports")
SMOKE_REPORT = REPORT_DIR / "drive_secret_smoke.json"
PUBLIC_DRIVE_SOURCES = "public_drive_raw_sources.csv"
RCLONE_SECRET_LABEL = "RCLONE_DRIVE_CONF"
RCLONE_ROOT = Path("/tmp/eatfitai_rclone")
RCLONE_CONFIG_PATH = RCLONE_ROOT / "rclone.conf"
RCLONE_BIN_DIR = RCLONE_ROOT / "bin"
RCLONE_DOWNLOAD_URL = "https://downloads.rclone.org/rclone-current-linux-amd64.zip"


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


def find_code_dir() -> Path:
    candidates = [Path.cwd(), *[path for path in sorted(KAGGLE_INPUT.iterdir()) if path.is_dir()]]
    for candidate in candidates:
        if (candidate / "audit_sources.py").exists() and (candidate / PUBLIC_DRIVE_SOURCES).exists():
            return candidate
    for candidate in sorted(KAGGLE_INPUT.rglob("*")):
        if candidate.is_dir() and (candidate / "audit_sources.py").exists() and (candidate / PUBLIC_DRIVE_SOURCES).exists():
            return candidate
    raise FileNotFoundError("No pipeline code dataset with public Drive manifest found under /kaggle/input")


def install_runtime_dependencies(code_dir: Path) -> None:
    requirements = code_dir / "requirements.dataset_v2.txt"
    if requirements.exists():
        run([sys.executable, "-m", "pip", "install", "-q", "-r", str(requirements)])
    else:
        run([sys.executable, "-m", "pip", "install", "-q", "kaggle", "pyyaml", "pillow", "opencv-python-headless"])


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


def sanitize_error_message(value: object, max_chars: int = 500) -> str:
    return " ".join(str(value).split())[:max_chars]


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


def probe_url(url: str, timeout: int = 15) -> dict[str, object]:
    try:
        with urllib.request.urlopen(url, timeout=timeout) as response:
            return {"ok": True, "status_code": getattr(response, "status", None)}
    except Exception as exc:
        return {"ok": False, "error_type": type(exc).__name__, "error": sanitize_error_message(exc, 200)}


def write_report(data: dict[str, object]) -> None:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    SMOKE_REPORT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    print("Kaggle input directories:")
    for path in sorted(KAGGLE_INPUT.iterdir()):
        print(" -", path)

    code_dir = find_code_dir()
    print("Pipeline code dataset:", code_dir)

    report: dict[str, object] = {
        "secret_label": RCLONE_SECRET_LABEL,
        "secret_present": False,
        "rclone_installed": False,
        "remote_list_ok": False,
        "network_probe": {
            "kaggle_home": probe_url("https://www.kaggle.com"),
            "rclone_download": probe_url(RCLONE_DOWNLOAD_URL),
        },
    }
    try:
        secret_value = get_kaggle_secret(RCLONE_SECRET_LABEL)
    except KaggleSecretUnavailable as exc:
        report["status"] = exc.status
        report["secret_error_type"] = exc.error_type
        report["error"] = str(exc)
        write_report(report)
        return 0
    if not secret_value:
        report["status"] = "drive_secret_missing"
        write_report(report)
        return 0
    report["secret_present"] = True

    try:
        config_path = write_rclone_config_secret(secret_value)
        rclone_binary = ensure_rclone_binary()
        report["rclone_installed"] = True
        command = [
            rclone_binary,
            "--config",
            config_path.as_posix(),
            "lsd",
            "eatfitai_drive:EatFitAI-Training",
            "--max-depth",
            "1",
        ]
        subprocess.run(command, check=True, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    except Exception as exc:
        report["status"] = "drive_oauth_failed"
        report["error"] = format_subprocess_error(exc)
        write_report(report)
        return 0

    report["remote_list_ok"] = True
    report["status"] = "drive_oauth_ok"
    write_report(report)
    print("Drive secret smoke report ready:", SMOKE_REPORT)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
