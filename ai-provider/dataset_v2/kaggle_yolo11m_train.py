from __future__ import annotations

import argparse
import glob
import os
import shutil
import subprocess
import sys
import tarfile
from pathlib import Path


KAGGLE_INPUT = Path("/kaggle/input")
KAGGLE_WORKING = Path("/kaggle/working")
DATASET_DIR = KAGGLE_WORKING / "eatfitai_clean_v1"
RUN_PROJECT = KAGGLE_WORKING / "runs" / "food-detection"
RUN_NAME = "yolo11m-eatfitai-clean-v1"


def ensure_ultralytics() -> None:
    try:
        import ultralytics  # noqa: F401
    except Exception:
        subprocess.run([sys.executable, "-m", "pip", "install", "-q", "ultralytics>=8.3.0"], check=True)


def print_gpu_info() -> tuple[int, object, int]:
    import torch

    gpu_count = torch.cuda.device_count()
    print(f"PyTorch: {torch.__version__}")
    print(f"CUDA available: {torch.cuda.is_available()}")
    print(f"GPU count: {gpu_count}")
    for idx in range(gpu_count):
        props = torch.cuda.get_device_properties(idx)
        print(f"GPU {idx}: {props.name} ({props.total_memory / 1024**3:.1f} GB)")
    if gpu_count <= 0:
        raise RuntimeError("Kaggle GPU is not visible. Stop before full YOLO11m train.")
    device = [0, 1] if gpu_count >= 2 else 0
    batch = 32 if gpu_count >= 2 else 16
    return gpu_count, device, batch


def find_dataset_tar() -> Path:
    candidates = sorted(KAGGLE_INPUT.glob("**/eatfitai_clean_v1.tar")) or sorted(KAGGLE_INPUT.glob("**/*.tar"))
    if not candidates:
        raise FileNotFoundError("No clean dataset tar found under /kaggle/input.")
    return candidates[0]


def safe_extract_tar(tar_path: Path, dest: Path) -> None:
    with tarfile.open(tar_path, "r") as tar:
        dest_resolved = dest.resolve()
        for member in tar.getmembers():
            target = (dest / member.name).resolve()
            if not str(target).startswith(str(dest_resolved)):
                raise RuntimeError(f"Unsafe tar member path: {member.name}")
        tar.extractall(dest)


def extract_dataset() -> Path:
    tar_path = find_dataset_tar()
    if DATASET_DIR.exists() and (DATASET_DIR / "data.yaml").exists():
        return DATASET_DIR
    KAGGLE_WORKING.mkdir(parents=True, exist_ok=True)
    print(f"Extracting {tar_path} to {KAGGLE_WORKING}")
    safe_extract_tar(tar_path, KAGGLE_WORKING)
    if not (DATASET_DIR / "data.yaml").exists():
        nested = next(KAGGLE_WORKING.glob("**/data.yaml"), None)
        if nested is None:
            raise FileNotFoundError("data.yaml not found after extracting clean dataset.")
        return nested.parent
    return DATASET_DIR


def train_model(data_yaml: Path, device: object, batch: int, skip_smoke: bool, skip_full: bool) -> Path | None:
    from ultralytics import YOLO

    if not skip_smoke:
        smoke = YOLO("yolo11s.pt")
        smoke.train(
            data=str(data_yaml),
            epochs=3,
            imgsz=640,
            batch=max(4, batch // 2),
            workers=4,
            device=device,
            fraction=0.15,
            project=str(RUN_PROJECT),
            name="smoke-yolo11s-clean-v1",
            exist_ok=True,
            cache=False,
            amp=True,
        )
    if skip_full:
        print("Skipping full train by request.")
        return None
    model = YOLO("yolo11m.pt")
    model.train(
        data=str(data_yaml),
        epochs=150,
        imgsz=640,
        batch=batch,
        patience=30,
        workers=4,
        device=device,
        cache=False,
        project=str(RUN_PROJECT),
        name=RUN_NAME,
        exist_ok=True,
        optimizer="auto",
        lr0=0.01,
        lrf=0.01,
        cos_lr=True,
        hsv_h=0.015,
        hsv_s=0.7,
        hsv_v=0.4,
        degrees=10.0,
        translate=0.1,
        scale=0.5,
        flipud=0.0,
        fliplr=0.5,
        mosaic=1.0,
        mixup=0.05,
        save=True,
        save_period=5,
        amp=True,
    )
    run_dir = RUN_PROJECT / RUN_NAME
    weights = run_dir / "weights"
    best = weights / "best.pt"
    if best.exists():
        YOLO(str(best)).export(format="onnx")
    for pattern in [str(weights / "*.pt"), str(run_dir / "results.csv"), str(run_dir / "args.yaml"), str(weights / "*.onnx")]:
        for src in glob.glob(pattern):
            shutil.copy2(src, KAGGLE_WORKING / Path(src).name)
    return run_dir


def main() -> int:
    parser = argparse.ArgumentParser(description="Kaggle YOLO11m train script for EatFitAI clean dataset.")
    parser.add_argument("--skip-smoke", action="store_true")
    parser.add_argument("--skip-full", action="store_true")
    args = parser.parse_args()

    ensure_ultralytics()
    _gpu_count, device, batch = print_gpu_info()
    dataset_dir = extract_dataset()
    data_yaml = dataset_dir / "data.yaml"
    if not data_yaml.exists():
        raise FileNotFoundError(data_yaml)
    print(f"Training data: {data_yaml}")
    train_model(data_yaml, device, batch, args.skip_smoke, args.skip_full)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
