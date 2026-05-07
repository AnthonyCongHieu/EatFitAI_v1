from __future__ import annotations

import glob
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
DATASET_DIR_NAME = "eatfitai_clean_v1"
RUN_PROJECT = KAGGLE_WORKING / "runs" / "food-detection"
REQUIRE_T4X2 = os.environ.get("EATFITAI_REQUIRE_T4X2", "1").strip().lower() not in {"0", "false", "no"}
MIN_FREE_BYTES_AFTER_EXTRACT = int(float(os.environ.get("EATFITAI_MIN_FREE_GB_AFTER_EXTRACT", "2")) * 1024**3)

PREFERRED_ARCHIVE_PATTERNS = (
    "**/eatfitai_clean_v1.tar",
    "**/eatfitai_dataset_v2_clean_candidate.zip",
    "**/eatfitai_clean_v1.zip",
)
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def ensure_ultralytics() -> None:
    try:
        import ultralytics  # noqa: F401
    except Exception:
        subprocess.run([sys.executable, "-m", "pip", "install", "-q", "ultralytics>=8.3.0"], check=True)


def print_gpu_info() -> tuple[int, object, int]:
    import torch

    gpu_count = torch.cuda.device_count()
    names: list[str] = []
    print(f"PyTorch: {torch.__version__}", flush=True)
    print(f"CUDA available: {torch.cuda.is_available()}", flush=True)
    print(f"GPU count: {gpu_count}", flush=True)
    for idx in range(gpu_count):
        props = torch.cuda.get_device_properties(idx)
        names.append(props.name)
        print(f"GPU {idx}: {props.name} ({props.total_memory / 1024**3:.1f} GB)", flush=True)
    if gpu_count <= 0:
        raise RuntimeError("Kaggle GPU is not visible. Stop before smoke train.")
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


def input_inventory(input_root: Path) -> list[str]:
    if not input_root.exists():
        return []
    return sorted(path.as_posix() for path in input_root.iterdir())


def find_dataset_archive(input_root: Path = KAGGLE_INPUT) -> Path:
    print("Kaggle input directories:", flush=True)
    for path in input_inventory(input_root):
        print(f" - {path}", flush=True)
    for pattern in PREFERRED_ARCHIVE_PATTERNS:
        candidates = sorted(input_root.glob(pattern))
        if candidates:
            print(f"Clean dataset archive: {candidates[0]}", flush=True)
            return candidates[0]
    fallback = sorted(input_root.glob("**/*.tar"))
    if fallback:
        print(f"Fallback clean dataset tar: {fallback[0]}", flush=True)
        return fallback[0]
    available = sorted(str(path) for path in input_root.glob("**/*") if path.suffix.lower() in {".tar", ".zip"})
    raise FileNotFoundError(f"No clean dataset archive found under {input_root}. Available archives: {available[:20]}")


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
    payload = {
        "archive": str(archive_path),
        "archive_bytes": archive_path.stat().st_size,
        "uncompressed_bytes": uncompressed,
        "working_free_bytes": free,
        "min_free_bytes_after_extract": MIN_FREE_BYTES_AFTER_EXTRACT,
    }
    print("Smoke archive preflight:", json.dumps(payload, ensure_ascii=False), flush=True)
    if free - uncompressed < MIN_FREE_BYTES_AFTER_EXTRACT:
        raise RuntimeError(f"Not enough /kaggle/working disk for clean dataset extract: {payload}")


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


def find_extracted_dataset_dir(search_root: Path, working_dir: Path) -> Path:
    preferred = (
        search_root / DATASET_DIR_NAME / "data.yaml",
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
    raise RuntimeError(f"Extracted data.yaml was not under writable working dir: {working_dir}")


def extract_dataset_archive(archive_path: Path, working_dir: Path = KAGGLE_WORKING) -> Path:
    existing = working_dir / DATASET_DIR_NAME
    if existing.exists() and (existing / "data.yaml").exists():
        return existing
    assert_disk_room_for_archive(archive_path, working_dir)
    suffix = archive_path.suffix.lower()
    if suffix == ".tar":
        print(f"Extracting clean dataset tar {archive_path} to {working_dir}", flush=True)
        safe_extract_tar(archive_path, working_dir)
        return find_extracted_dataset_dir(working_dir, working_dir)
    if suffix == ".zip":
        extract_root = working_dir / "clean_archive_extract"
        if extract_root.exists():
            shutil.rmtree(extract_root)
        print(f"Extracting clean dataset zip {archive_path} to {extract_root}", flush=True)
        safe_extract_zip(archive_path, extract_root)
        return find_extracted_dataset_dir(extract_root, working_dir)
    raise RuntimeError(f"Unsupported clean dataset archive type: {archive_path}")


def extract_dataset() -> Path:
    return extract_dataset_archive(find_dataset_archive(), KAGGLE_WORKING)


def _count_images(path: Path) -> int:
    if not path.exists():
        return 0
    return sum(1 for file in path.rglob("*") if file.suffix.lower() in IMAGE_EXTENSIONS)


def verify_dataset_layout(dataset_dir: Path) -> dict[str, object]:
    data_yaml = dataset_dir / "data.yaml"
    if not data_yaml.exists():
        raise FileNotFoundError(data_yaml)
    splits: dict[str, dict[str, int]] = {}
    for split in ("train", "valid", "test"):
        split_dir = dataset_dir / split
        splits[split] = {
            "images": _count_images(split_dir / "images"),
            "labels": len(list((split_dir / "labels").glob("*.txt"))) if (split_dir / "labels").exists() else 0,
        }
    payload = {"dataset_dir": str(dataset_dir), "data_yaml": str(data_yaml), "splits": splits}
    print("Smoke dataset preflight:", json.dumps(payload, ensure_ascii=False), flush=True)
    if splits["train"]["images"] <= 0 or splits["train"]["labels"] <= 0:
        raise RuntimeError(f"Clean dataset train split is empty or unlabeled: {payload}")
    return payload


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
    print(f"Rebased training data yaml: {target}", flush=True)
    return target


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
        print("Skipping full train by smoke-kernel guard.", flush=True)
        return None
    raise RuntimeError("Smoke kernel is not allowed to run full YOLO11m training.")


def copy_smoke_artifacts() -> None:
    run_dir = RUN_PROJECT / "smoke-yolo11s-clean-v1"
    for pattern in [str(run_dir / "weights" / "*.pt"), str(run_dir / "results.csv"), str(run_dir / "args.yaml")]:
        for src in glob.glob(pattern):
            shutil.copy2(src, KAGGLE_WORKING / f"smoke_{Path(src).name}")


def main() -> int:
    _gpu_count, device, batch = print_gpu_info()
    dataset_dir = extract_dataset()
    verify_dataset_layout(dataset_dir)
    ensure_ultralytics()
    data_yaml = prepare_training_data_yaml(dataset_dir)
    print(f"Training data: {data_yaml}", flush=True)
    train_model(data_yaml, device, batch, skip_smoke=False, skip_full=True)
    copy_smoke_artifacts()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
