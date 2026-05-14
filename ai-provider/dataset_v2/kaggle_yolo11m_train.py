from __future__ import annotations

import argparse
from dataclasses import dataclass
import json
import os
import shutil
import subprocess
import sys
import tarfile
import zipfile
from pathlib import Path


KAGGLE_INPUT = Path("/kaggle/input")
KAGGLE_WORKING = Path("/kaggle/working")
DATASET_EXTRACT_DIR = Path(os.environ.get("EATFITAI_DATASET_EXTRACT_DIR", "/tmp/eatfitai_yolo11m_dataset"))
DATASET_DIR = KAGGLE_WORKING / os.environ.get("EATFITAI_YOLO_DATASET_DIR_NAME", "eatfitai_clean_v1")
RUN_PROJECT = KAGGLE_WORKING / "runs" / "food-detection"
RUN_NAME = os.environ.get("EATFITAI_YOLO_RUN_NAME", "yolo11m-eatfitai-clean-v1")
CHECKPOINT_DIR = KAGGLE_WORKING / "_yolo11m_checkpoints"
REQUIRE_T4X2 = os.environ.get("EATFITAI_REQUIRE_T4X2", "1").strip().lower() not in {"0", "false", "no"}
MIN_FREE_BYTES_AFTER_EXTRACT = int(float(os.environ.get("EATFITAI_MIN_FREE_GB_AFTER_EXTRACT", "2")) * 1024**3)
TRAIN_EPOCHS = int(os.environ.get("EATFITAI_YOLO11M_EPOCHS", "150"))
SAVE_PERIOD = int(os.environ.get("EATFITAI_SAVE_PERIOD", "-1"))
SKIP_SMOKE_ON_RESUME = os.environ.get("EATFITAI_SKIP_SMOKE_ON_RESUME", "1").strip().lower() not in {"0", "false", "no"}
PREFERRED_ARCHIVE_PATTERNS = (
    "**/eatfitai_clean_v1.tar",
    "**/eatfitai_dataset_v2_clean_candidate.zip",
    "**/eatfitai_clean_v1.zip",
)
RESUME_CHECKPOINT_PATTERNS = (
    "**/_yolo11m_checkpoints/last.pt",
    "**/yolo11m_last.pt",
    "**/last.pt",
)


@dataclass(frozen=True)
class CheckpointPlan:
    model_source: Path | str
    resume_training: bool
    skip_when_target_reached: bool


def checkpoint_mode() -> str:
    mode = os.environ.get("EATFITAI_YOLO_CHECKPOINT_MODE", "resume").strip().lower()
    if mode in {"resume", "finetune", "none"}:
        return mode
    raise ValueError("EATFITAI_YOLO_CHECKPOINT_MODE must be one of: resume, finetune, none")


def resolve_checkpoint_plan(resume_checkpoint: Path | None) -> CheckpointPlan:
    mode = checkpoint_mode()
    if resume_checkpoint is None or mode == "none":
        return CheckpointPlan("yolo11m.pt", resume_training=False, skip_when_target_reached=False)
    if mode == "finetune":
        return CheckpointPlan(resume_checkpoint, resume_training=False, skip_when_target_reached=False)
    return CheckpointPlan(resume_checkpoint, resume_training=True, skip_when_target_reached=True)


def ensure_ultralytics() -> None:
    try:
        import ultralytics  # noqa: F401
    except Exception:
        subprocess.run([sys.executable, "-m", "pip", "install", "-q", "ultralytics>=8.3.0"], check=True)


def print_gpu_info() -> tuple[int, object, int]:
    import torch

    gpu_count = torch.cuda.device_count()
    names: list[str] = []
    print(f"PyTorch: {torch.__version__}")
    print(f"CUDA available: {torch.cuda.is_available()}")
    print(f"GPU count: {gpu_count}")
    for idx in range(gpu_count):
        props = torch.cuda.get_device_properties(idx)
        names.append(props.name)
        print(f"GPU {idx}: {props.name} ({props.total_memory / 1024**3:.1f} GB)")
    if gpu_count <= 0:
        raise RuntimeError("Kaggle GPU is not visible. Stop before full YOLO11m train.")
    if REQUIRE_T4X2 and (gpu_count < 2 or not all("T4" in name.upper() for name in names)):
        raise RuntimeError(f"Expected Kaggle GPU T4 x2, got gpu_count={gpu_count}, names={names}.")
    device = [0, 1] if gpu_count >= 2 else 0
    batch = 32 if gpu_count >= 2 else 16
    return gpu_count, device, batch


def _assert_safe_member_path(dest: Path, member_name: str, archive_kind: str) -> Path:
    dest_resolved = dest.resolve()
    target = (dest / member_name).resolve()
    try:
        target.relative_to(dest_resolved)
    except ValueError as exc:
        raise RuntimeError(f"Unsafe {archive_kind} member path: {member_name}") from exc
    return target


def find_dataset_archive(input_root: Path = KAGGLE_INPUT) -> Path:
    for pattern in PREFERRED_ARCHIVE_PATTERNS:
        candidates = sorted(input_root.glob(pattern))
        if candidates:
            return candidates[0]
    candidates = sorted(input_root.glob("**/*.tar"))
    if candidates:
        return candidates[0]
    expected = ", ".join(pattern.replace("**/", "") for pattern in PREFERRED_ARCHIVE_PATTERNS)
    raise FileNotFoundError(f"No clean dataset archive found under {input_root}. Expected one of: {expected}.")


def safe_extract_tar(tar_path: Path, dest: Path) -> None:
    dest.mkdir(parents=True, exist_ok=True)
    with tarfile.open(tar_path, "r") as tar:
        for member in tar.getmembers():
            _assert_safe_member_path(dest, member.name, "tar")
        tar.extractall(dest)


def safe_extract_zip(zip_path: Path, dest: Path) -> None:
    dest.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path, "r") as zf:
        for member in zf.infolist():
            _assert_safe_member_path(dest, member.filename, "zip")
        zf.extractall(dest)


def archive_uncompressed_size(archive_path: Path) -> int:
    if archive_path.suffix.lower() == ".zip":
        with zipfile.ZipFile(archive_path, "r") as zf:
            return sum(info.file_size for info in zf.infolist())
    if archive_path.suffix.lower() == ".tar":
        with tarfile.open(archive_path, "r") as tar:
            return sum(member.size for member in tar.getmembers() if member.isfile())
    return archive_path.stat().st_size


def assert_disk_room_for_archive(archive_path: Path, working_dir: Path) -> None:
    working_dir.mkdir(parents=True, exist_ok=True)
    uncompressed = archive_uncompressed_size(archive_path)
    free = shutil.disk_usage(working_dir).free
    print(
        {
            "archive": str(archive_path),
            "archive_bytes": archive_path.stat().st_size,
            "uncompressed_bytes": uncompressed,
            "extract_free_bytes": free,
            "min_free_bytes_after_extract": MIN_FREE_BYTES_AFTER_EXTRACT,
        },
        flush=True,
    )
    if free - uncompressed < MIN_FREE_BYTES_AFTER_EXTRACT:
        raise RuntimeError(
            f"Not enough disk to extract clean dataset: free={free}, uncompressed={uncompressed}, "
            f"min_free_after={MIN_FREE_BYTES_AFTER_EXTRACT}"
        )


def find_extracted_dataset_dir(search_root: Path, working_dir: Path) -> Path:
    preferred = (
        search_root / "eatfitai_clean_v1" / "data.yaml",
        search_root / "eatfitai_dataset_v2_clean_candidate" / "data.yaml",
    )
    candidates = [path for path in preferred if path.exists()]
    candidates.extend(sorted(search_root.glob("**/data.yaml")))
    if not candidates:
        raise FileNotFoundError("data.yaml not found after extracting clean dataset.")

    working_resolved = working_dir.resolve()
    for data_yaml in candidates:
        dataset_dir = data_yaml.parent.resolve()
        try:
            dataset_dir.relative_to(working_resolved)
        except ValueError:
            continue
        return dataset_dir
    raise RuntimeError(f"Extracted data.yaml was not under the writable working directory: {working_dir}")


def extract_dataset_archive(archive_path: Path, working_dir: Path = KAGGLE_WORKING) -> Path:
    dataset_dir = working_dir / DATASET_DIR.name
    if dataset_dir.exists() and (dataset_dir / "data.yaml").exists():
        return dataset_dir
    working_dir.mkdir(parents=True, exist_ok=True)
    assert_disk_room_for_archive(archive_path, working_dir)
    suffix = archive_path.suffix.lower()
    if suffix == ".tar":
        print(f"Extracting clean dataset tar {archive_path} to {working_dir}")
        safe_extract_tar(archive_path, working_dir)
        return find_extracted_dataset_dir(working_dir, working_dir)
    if suffix == ".zip":
        extract_root = working_dir / "clean_archive_extract"
        if extract_root.exists():
            shutil.rmtree(extract_root)
        print(f"Extracting clean dataset zip {archive_path} to {extract_root}")
        safe_extract_zip(archive_path, extract_root)
        return find_extracted_dataset_dir(extract_root, working_dir)
    raise RuntimeError(f"Unsupported clean dataset archive type: {archive_path}")


def extract_dataset() -> Path:
    return extract_dataset_archive(find_dataset_archive(), DATASET_EXTRACT_DIR)


def prepare_training_data_yaml(dataset_dir: Path) -> Path:
    source = dataset_dir / "data.yaml"
    if not source.exists():
        raise FileNotFoundError(source)
    lines = source.read_text(encoding="utf-8").splitlines()
    rebased_lines: list[str] = []
    replaced_path = False
    for line in lines:
        if line.lstrip().startswith("path:"):
            rebased_lines.append(f"path: {dataset_dir.as_posix()}")
            replaced_path = True
        else:
            rebased_lines.append(line)
    if not replaced_path:
        rebased_lines.insert(0, f"path: {dataset_dir.as_posix()}")
    target = dataset_dir / "data.rebased.yaml"
    target.write_text("\n".join(rebased_lines) + "\n", encoding="utf-8")
    print(f"Rebased training data yaml: {target}")
    return target


def find_resume_checkpoint(input_root: Path = KAGGLE_INPUT) -> Path | None:
    explicit = os.environ.get("EATFITAI_RESUME_CHECKPOINT")
    if explicit:
        checkpoint = Path(explicit)
        if checkpoint.exists():
            print(f"Resume checkpoint from EATFITAI_RESUME_CHECKPOINT: {checkpoint}")
            return checkpoint
        raise FileNotFoundError(f"EATFITAI_RESUME_CHECKPOINT does not exist: {checkpoint}")

    for pattern in RESUME_CHECKPOINT_PATTERNS:
        candidates = [path for path in sorted(input_root.glob(pattern)) if path.is_file() and path.stat().st_size > 0]
        if candidates:
            checkpoint = candidates[-1]
            print(f"Resume checkpoint discovered: {checkpoint}")
            return checkpoint
    return None


def copy_training_artifacts(run_dir: Path, working_dir: Path = KAGGLE_WORKING, checkpoint_dir: Path = CHECKPOINT_DIR) -> None:
    weights = run_dir / "weights"
    checkpoint_dir.mkdir(parents=True, exist_ok=True)
    working_dir.mkdir(parents=True, exist_ok=True)

    cleanup_epoch_checkpoints(weights, checkpoint_dir, working_dir)

    for src in (weights / "last.pt", weights / "best.pt"):
        if not src.exists():
            continue
        shutil.copy2(src, checkpoint_dir / src.name)
        shutil.copy2(src, working_dir / f"yolo11m_{src.name}")
        shutil.copy2(src, working_dir / f"yolo11m_resume_{src.name}")
    for src in sorted(weights.glob("*.onnx")) if weights.exists() else []:
        shutil.copy2(src, working_dir / src.name)
        shutil.copy2(src, working_dir / f"yolo11m_{src.name}")
    for name in ("results.csv", "args.yaml"):
        src = run_dir / name
        if src.exists():
            shutil.copy2(src, checkpoint_dir / name)
            shutil.copy2(src, working_dir / f"yolo11m_{name}")
    write_resume_manifest(run_dir, working_dir)
    print_disk_summary("artifact_sync", working_dir)


def cleanup_epoch_checkpoints(*directories: Path) -> None:
    removed = 0
    for directory in directories:
        if not directory.exists():
            continue
        for checkpoint in directory.glob("epoch*.pt"):
            checkpoint.unlink(missing_ok=True)
            removed += 1
    if removed:
        print(f"Removed {removed} per-epoch checkpoint artifact(s); last/best are retained.", flush=True)


def print_disk_summary(label: str, path: Path = KAGGLE_WORKING) -> None:
    usage = shutil.disk_usage(path)
    print(
        {
            "disk_label": label,
            "free_gb": round(usage.free / 1024**3, 3),
            "used_gb": round(usage.used / 1024**3, 3),
            "total_gb": round(usage.total / 1024**3, 3),
        },
        flush=True,
    )


def last_recorded_epoch(results_csv: Path) -> int | None:
    if not results_csv.exists():
        return None
    last_epoch: int | None = None
    for line in results_csv.read_text(encoding="utf-8").splitlines()[1:]:
        parts = [part.strip() for part in line.split(",")]
        if not parts or not parts[0]:
            continue
        try:
            last_epoch = int(float(parts[0]))
        except ValueError:
            continue
    return last_epoch


def resume_results_csv(resume_checkpoint: Path) -> Path | None:
    for candidate in (
        resume_checkpoint.parent / "results.csv",
        resume_checkpoint.parent.parent / "results.csv",
        resume_checkpoint.parent.parent / "yolo11m_results.csv",
    ):
        if candidate.exists():
            return candidate
    return None


def resume_checkpoint_reached_target(resume_checkpoint: Path, target_epochs: int = TRAIN_EPOCHS) -> bool:
    results_csv = resume_results_csv(resume_checkpoint)
    if results_csv is None:
        return False
    last_epoch = last_recorded_epoch(results_csv)
    return last_epoch is not None and last_epoch >= target_epochs


def stage_completed_resume_artifacts(resume_checkpoint: Path, run_dir: Path) -> None:
    weights = run_dir / "weights"
    weights.mkdir(parents=True, exist_ok=True)
    shutil.copy2(resume_checkpoint, weights / "last.pt")

    best_candidates = (
        resume_checkpoint.parent / "best.pt",
        resume_checkpoint.parent / "yolo11m_resume_best.pt",
        resume_checkpoint.parent.parent / "best.pt",
        resume_checkpoint.parent.parent / "yolo11m_resume_best.pt",
    )
    for best_checkpoint in best_candidates:
        if best_checkpoint.exists():
            shutil.copy2(best_checkpoint, weights / "best.pt")
            break

    results_csv = resume_results_csv(resume_checkpoint)
    if results_csv is not None:
        shutil.copy2(results_csv, run_dir / "results.csv")
    for candidate in (resume_checkpoint.parent / "args.yaml", resume_checkpoint.parent.parent / "yolo11m_args.yaml"):
        if candidate.exists():
            shutil.copy2(candidate, run_dir / "args.yaml")
            break


def write_resume_manifest(run_dir: Path, working_dir: Path = KAGGLE_WORKING) -> None:
    weights = run_dir / "weights"
    last_src = weights / "last.pt"
    best_src = weights / "best.pt"
    onnx_src = weights / "best.onnx"
    manifest = {
        "status": "checkpoint_available" if last_src.exists() else "no_checkpoint_yet",
        "run_dir": str(run_dir),
        "last_checkpoint": "yolo11m_resume_last.pt" if last_src.exists() else None,
        "best_checkpoint": "yolo11m_resume_best.pt" if best_src.exists() else None,
        "onnx_export": "best.onnx" if onnx_src.exists() else None,
        "last_recorded_epoch": last_recorded_epoch(run_dir / "results.csv"),
        "resume_note": (
            "Attach this Kaggle output as an input dataset on the next run; "
            "the script will auto-discover _yolo11m_checkpoints/last.pt."
        ),
    }
    (working_dir / "yolo11m_resume_manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def register_checkpoint_callbacks(model: object, run_dir: Path) -> None:
    def sync_checkpoint(_trainer: object | None = None) -> None:
        copy_training_artifacts(run_dir)
        print(f"Checkpoint artifacts synced to {CHECKPOINT_DIR}", flush=True)

    for event in ("on_model_save", "on_fit_epoch_end", "on_train_end"):
        add_callback = getattr(model, "add_callback", None)
        if add_callback is not None:
            add_callback(event, sync_checkpoint)


def train_model(data_yaml: Path, device: object, batch: int, skip_smoke: bool, skip_full: bool) -> Path | None:
    from ultralytics import YOLO

    resume_checkpoint = find_resume_checkpoint()
    checkpoint_plan = resolve_checkpoint_plan(resume_checkpoint)
    if not skip_smoke:
        if resume_checkpoint and SKIP_SMOKE_ON_RESUME:
            print("Skipping smoke train because a resume checkpoint is mounted.")
        else:
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
    run_dir = RUN_PROJECT / RUN_NAME

    if resume_checkpoint and checkpoint_plan.skip_when_target_reached and resume_checkpoint_reached_target(resume_checkpoint):
        print(f"Resume checkpoint already reached target epoch {TRAIN_EPOCHS}; exporting compact artifacts only.")
        stage_completed_resume_artifacts(resume_checkpoint, run_dir)
        copy_training_artifacts(run_dir)
        best = run_dir / "weights" / "best.pt"
        if best.exists():
            YOLO(str(best)).export(format="onnx")
            copy_training_artifacts(run_dir)
        return run_dir

    model = YOLO(str(checkpoint_plan.model_source))
    register_checkpoint_callbacks(model, run_dir)
    model.train(
        data=str(data_yaml),
        epochs=TRAIN_EPOCHS,
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
        save_period=SAVE_PERIOD,
        amp=True,
        resume=checkpoint_plan.resume_training,
    )
    copy_training_artifacts(run_dir)
    weights = run_dir / "weights"
    best = weights / "best.pt"
    if best.exists():
        YOLO(str(best)).export(format="onnx")
        copy_training_artifacts(run_dir)
    return run_dir


def main() -> int:
    parser = argparse.ArgumentParser(description="Kaggle YOLO11m train script for EatFitAI clean dataset.")
    parser.add_argument("--skip-smoke", action="store_true")
    parser.add_argument("--skip-full", action="store_true")
    args = parser.parse_args()

    _gpu_count, device, batch = print_gpu_info()
    ensure_ultralytics()
    dataset_dir = extract_dataset()
    data_yaml = prepare_training_data_yaml(dataset_dir)
    if not data_yaml.exists():
        raise FileNotFoundError(data_yaml)
    print(f"Training data: {data_yaml}")
    train_model(data_yaml, device, batch, args.skip_smoke, args.skip_full)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
