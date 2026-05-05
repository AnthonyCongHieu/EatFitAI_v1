from __future__ import annotations

import argparse
import json
import os
import stat
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Mapping

from kaggle_remote_orchestrator import (
    create_or_version_dataset,
    download_kernel_output,
    prepare_kernel_folder,
    push_kernel,
    wait_kernel,
)
from prepare_kaggle_packages import prepare_pipeline_code_package, prepare_raw_sources_package


DEFAULT_DRIVE_ROOT = Path("/content/drive/MyDrive/EatFitAI-Training")
DEFAULT_WORK_ROOT = Path("/content/eatfitai_dataset_v2_kaggle_packages")


@dataclass(frozen=True)
class CloudPaths:
    drive_root: Path
    code_dir: Path
    raw_dir: Path
    report_dir: Path
    package_root: Path
    pipeline_package: Path
    raw_sources_package: Path
    raw_audit_kernel: Path
    kernel_output_dir: Path


def run(cmd: list[str]) -> None:
    print("$", " ".join(cmd), flush=True)
    subprocess.run(cmd, check=True)


def is_colab_runtime() -> bool:
    return Path("/content").exists() and "google.colab" in sys.modules


def mount_drive_if_colab() -> None:
    try:
        from google.colab import drive  # type: ignore
    except Exception:
        return
    drive.mount("/content/drive")


def chmod_owner_only(path: Path) -> None:
    try:
        path.chmod(stat.S_IRUSR | stat.S_IWUSR)
    except OSError:
        pass


def ensure_kaggle_credentials(home_dir: Path | None = None, env: Mapping[str, str] | None = None) -> str:
    home_dir = home_dir or Path.home()
    env = os.environ if env is None else env
    kaggle_dir = home_dir / ".kaggle"
    kaggle_dir.mkdir(parents=True, exist_ok=True)

    access_token_path = kaggle_dir / "access_token"
    kaggle_json_path = kaggle_dir / "kaggle.json"
    api_token = str(env.get("KAGGLE_API_TOKEN", "")).strip()
    if api_token:
        access_token_path.write_text(api_token, encoding="utf-8")
        chmod_owner_only(access_token_path)
        return "api_token"

    username = str(env.get("KAGGLE_USERNAME", "")).strip()
    key = str(env.get("KAGGLE_KEY", "")).strip()
    if username and key:
        kaggle_json_path.write_text(
            json.dumps({"username": username, "key": key}, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        chmod_owner_only(kaggle_json_path)
        return "legacy_json"

    if access_token_path.exists() or kaggle_json_path.exists():
        return "existing"

    raise RuntimeError(
        "Kaggle credentials are missing. Set KAGGLE_API_TOKEN, or set KAGGLE_USERNAME/KAGGLE_KEY in the cloud runtime."
    )


def resolve_cloud_paths(
    drive_root: Path = DEFAULT_DRIVE_ROOT,
    code_dir: Path | None = None,
    package_root: Path = DEFAULT_WORK_ROOT,
) -> CloudPaths:
    code_dir = code_dir or Path(__file__).resolve().parent
    return CloudPaths(
        drive_root=drive_root,
        code_dir=code_dir,
        raw_dir=drive_root / "datasets-raw",
        report_dir=drive_root / "dataset-v2-reports",
        package_root=package_root,
        pipeline_package=package_root / "pipeline-code",
        raw_sources_package=package_root / "raw-sources",
        raw_audit_kernel=package_root / "raw-audit-kernel",
        kernel_output_dir=drive_root / "dataset-v2-kaggle-outputs" / "raw-audit",
    )


def install_dependencies(code_dir: Path) -> None:
    requirements = code_dir / "requirements.dataset_v2.txt"
    if requirements.exists():
        run([sys.executable, "-m", "pip", "install", "-q", "-r", str(requirements)])
    else:
        run([sys.executable, "-m", "pip", "install", "-q", "kaggle", "pyyaml", "requests", "pillow", "opencv-python-headless"])


def ensure_cloud_dirs(paths: CloudPaths) -> None:
    for directory in (paths.raw_dir, paths.report_dir, paths.package_root, paths.kernel_output_dir):
        directory.mkdir(parents=True, exist_ok=True)


def package_and_push_pipeline_code(paths: CloudPaths) -> None:
    summary = prepare_pipeline_code_package(
        source_dir=paths.code_dir,
        out_dir=paths.pipeline_package,
        kaggle_id="hiuinhcng/eatfitai-dataset-v2-pipeline-code",
        title="EatFitAI Dataset V2 Pipeline Code",
        license_name="Apache-2.0",
    )
    print(json.dumps({"pipeline_code": summary}, ensure_ascii=False, indent=2))
    create_or_version_dataset(paths.pipeline_package, "Dataset V2 pipeline code from cloud bridge")


def package_and_push_raw_sources(paths: CloudPaths, fail_on_missing: bool) -> None:
    manifest = paths.code_dir / "source_decisions.public_review.csv"
    summary = prepare_raw_sources_package(
        raw_dir=paths.raw_dir,
        manifest_path=manifest,
        out_dir=paths.raw_sources_package,
        kaggle_id="hiuinhcng/eatfitai-dataset-v2-raw-sources",
        title="EatFitAI Dataset V2 Raw Sources",
        license_name="CC-BY-4.0",
        include_quarantine=False,
        fail_on_missing=fail_on_missing,
    )
    print(json.dumps({"raw_sources": summary}, ensure_ascii=False, indent=2))
    create_or_version_dataset(paths.raw_sources_package, "Dataset V2 raw sources from cloud Drive bridge")


def prepare_and_push_raw_audit_kernel(paths: CloudPaths) -> str:
    prepare_kernel_folder(
        source_dir=paths.code_dir,
        out_dir=paths.raw_audit_kernel,
        kernel_metadata=paths.code_dir / "kaggle_raw_audit_kernel_metadata.json",
        extra_files=[],
    )
    kernel_id = push_kernel(paths.raw_audit_kernel)
    print("Raw audit kernel:", kernel_id)
    return kernel_id


def run_cloud_audit(paths: CloudPaths, fail_on_missing: bool, wait: bool, timeout_seconds: int) -> str:
    ensure_cloud_dirs(paths)
    package_and_push_pipeline_code(paths)
    package_and_push_raw_sources(paths, fail_on_missing=fail_on_missing)
    kernel_id = prepare_and_push_raw_audit_kernel(paths)
    if wait:
        status = wait_kernel(kernel_id, poll_seconds=60, timeout_seconds=timeout_seconds)
        print("Raw audit kernel status:", status)
        download_kernel_output(kernel_id, paths.kernel_output_dir)
    return kernel_id


def main() -> int:
    parser = argparse.ArgumentParser(description="Run EatFitAI Dataset V2 without local raw data by bridging Google Drive to Kaggle from Colab.")
    parser.add_argument("--drive-root", type=Path, default=DEFAULT_DRIVE_ROOT)
    parser.add_argument("--code-dir", type=Path, default=Path(__file__).resolve().parent)
    parser.add_argument("--package-root", type=Path, default=DEFAULT_WORK_ROOT)
    parser.add_argument("--skip-install", action="store_true")
    parser.add_argument("--skip-drive-mount", action="store_true")
    parser.add_argument("--fail-on-missing", action="store_true")
    parser.add_argument("--wait", action="store_true", help="Poll the Kaggle raw-audit kernel and download outputs to Drive.")
    parser.add_argument("--timeout-seconds", type=int, default=12 * 60 * 60)
    args = parser.parse_args()

    if not args.skip_drive_mount:
        mount_drive_if_colab()
    if not args.skip_install:
        install_dependencies(args.code_dir)
    credential_mode = ensure_kaggle_credentials()
    print("Kaggle credential mode:", credential_mode)
    paths = resolve_cloud_paths(args.drive_root, args.code_dir, args.package_root)
    kernel_id = run_cloud_audit(paths, fail_on_missing=args.fail_on_missing, wait=args.wait, timeout_seconds=args.timeout_seconds)
    print(json.dumps({"kernel_id": kernel_id, "outputs": str(paths.kernel_output_dir)}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
