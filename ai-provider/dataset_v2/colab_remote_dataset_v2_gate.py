# EatFitAI Dataset V2 remote gate for Google Colab.
#
# Copy this file into Colab or run:
#   %run /content/drive/MyDrive/EatFitAI-Training/dataset-v2-code/colab_remote_dataset_v2_gate.py
#
# Secrets policy:
# - Do not paste tokens into repo files.
# - In Colab, set KAGGLE_USERNAME/KAGGLE_KEY and ROBOFLOW_API_KEY in runtime only.

from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path


DRIVE_ROOT = Path("/content/drive/MyDrive/EatFitAI-Training")
RAW_DIR = DRIVE_ROOT / "datasets-raw"
REPORT_DIR = DRIVE_ROOT / "dataset-v2-reports"
WORK_DIR = Path("/content/eatfitai_dataset_v2_work")
CODE_DIR = Path("/content/eatfitai_dataset_v2_code")


def run(cmd: list[str], cwd: Path | None = None) -> None:
    print("$", " ".join(cmd))
    subprocess.run(cmd, cwd=str(cwd) if cwd else None, check=True)


def mount_drive() -> None:
    from google.colab import drive  # type: ignore

    drive.mount("/content/drive")
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    WORK_DIR.mkdir(parents=True, exist_ok=True)


def install_dependencies() -> None:
    run(["python", "-m", "pip", "install", "-q", "pyyaml", "pillow", "pandas", "tqdm", "kaggle", "roboflow"])


def copy_pipeline_from_drive_or_upload(source_dir: str | None = None) -> None:
    CODE_DIR.mkdir(parents=True, exist_ok=True)
    if source_dir:
        src = Path(source_dir)
        if src.exists():
            shutil.copytree(src, CODE_DIR, dirs_exist_ok=True)
            return
    print("Upload or copy ai-provider/dataset_v2 scripts to", CODE_DIR)


def run_public_raw_audit() -> None:
    run(
        [
            "python",
            str(CODE_DIR / "audit_sources.py"),
            "--raw-dir",
            str(RAW_DIR),
            "--manifest",
            str(CODE_DIR / "source_manifest.seed.csv"),
            "--work-dir",
            str(WORK_DIR),
            "--out-dir",
            str(REPORT_DIR),
        ]
    )
    run(
        [
            "python",
            str(CODE_DIR / "make_sample_grids.py"),
            "--audit-json",
            str(REPORT_DIR / "source_audit.json"),
            "--out-dir",
            str(REPORT_DIR / "sample_grids"),
        ]
    )


def download_kaggle_dataset(dataset_slug: str, output_name: str) -> None:
    if not os.environ.get("KAGGLE_USERNAME") or not os.environ.get("KAGGLE_KEY"):
        raise RuntimeError("Set KAGGLE_USERNAME and KAGGLE_KEY in Colab runtime before Kaggle download.")
    target = RAW_DIR / output_name
    if target.exists():
        print("Already exists:", target)
        return
    tmp = WORK_DIR / "kaggle_downloads" / dataset_slug.replace("/", "_")
    tmp.mkdir(parents=True, exist_ok=True)
    run(["python", "-m", "kaggle", "datasets", "download", "-d", dataset_slug, "-p", str(tmp)])
    zips = sorted(tmp.glob("*.zip"))
    if not zips:
        raise RuntimeError(f"No zip downloaded for {dataset_slug}")
    shutil.copy2(zips[0], target)
    print("Copied to Drive:", target)


def download_roboflow_version(workspace: str, project: str, version: int, output_name: str, fmt: str = "yolov11") -> None:
    api_key = os.environ.get("ROBOFLOW_API_KEY")
    if not api_key:
        raise RuntimeError("Set ROBOFLOW_API_KEY in Colab runtime before Roboflow download.")
    from roboflow import Roboflow  # type: ignore

    target = RAW_DIR / output_name
    if target.exists():
        print("Already exists:", target)
        return
    rf = Roboflow(api_key=api_key)
    dataset = rf.workspace(workspace).project(project).version(version).download(fmt, location=str(WORK_DIR / output_name.replace(".zip", "")))
    generated = Path(dataset.location)
    shutil.make_archive(str(target.with_suffix("")), "zip", generated)
    if target.with_suffix(".zip") != target and target.with_suffix(".zip").exists():
        target.with_suffix(".zip").rename(target)
    print("Copied to Drive:", target)


if __name__ == "__main__":
    mount_drive()
    install_dependencies()
    copy_pipeline_from_drive_or_upload()
    print("Ready. Copy pipeline scripts into CODE_DIR, then call run_public_raw_audit().")
