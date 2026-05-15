from __future__ import annotations

import json
import os
import subprocess
import sys
import zipfile
from pathlib import Path


KAGGLE_INPUT = Path("/kaggle/input")
REPORT_DIR = Path("/kaggle/working/_dataset_v2_clean_build_v4_class_expansion_train_artifact_reports")
CLEAN_DATASET_DIR = Path("/tmp/eatfitai_dataset_v2_clean_v4_class_expansion_candidate")
CLEAN_DATASET_ZIP = Path("/kaggle/working/eatfitai_dataset_v2_clean_v4_class_expansion_candidate.zip")
REPORTS_ZIP = Path("/kaggle/working/eatfitai_dataset_v2_clean_build_v4_class_expansion_train_artifact_reports.zip")
CLEAN_MAX_IMAGES = int(os.environ.get("EATFITAI_CLEAN_V4_CLASS_EXPANSION_MAX_IMAGES", "260000"))
WRITE_DATASET_ZIP = os.environ.get(
    "EATFITAI_CLEAN_V4_CLASS_EXPANSION_WRITE_DATASET_ZIP",
    "true",
).strip().lower() in {"1", "true", "yes", "y"}
CLEAN_SOURCE_POLICY = os.environ.get(
    "EATFITAI_CLEAN_V4_CLASS_EXPANSION_SOURCE_POLICY",
    "clean_candidate_sources_v4_class_expansion_private_2026-05-14.csv",
)
CLEAN_TAXONOMY = os.environ.get(
    "EATFITAI_CLEAN_V4_CLASS_EXPANSION_TAXONOMY",
    "class_taxonomy.clean_v4_expanded_class_expansion_private_2026-05-14.yaml",
)


def run(cmd: list[str]) -> None:
    print("+", " ".join(cmd), flush=True)
    subprocess.run(cmd, check=True)


def find_code_dir(root: Path = KAGGLE_INPUT) -> Path:
    candidates = [Path(__file__).resolve().parent, Path.cwd()]
    if root.exists():
        candidates.extend(
            [
                root / "eatfitai-dataset-v2-pipeline-code",
                root / "datasets" / "hiuinhcng" / "eatfitai-dataset-v2-pipeline-code",
            ]
        )
        candidates.extend(path for path in root.glob("*pipeline-code*") if path.is_dir())
    for candidate in candidates:
        if (candidate / CLEAN_SOURCE_POLICY).exists() and (candidate / CLEAN_TAXONOMY).exists():
            return candidate
    raise FileNotFoundError(f"Could not find {CLEAN_SOURCE_POLICY} and {CLEAN_TAXONOMY} in Kaggle inputs")


def install_runtime_dependencies(code_dir: Path) -> None:
    requirements = code_dir / "requirements.dataset_v2.txt"
    if requirements.exists():
        run([sys.executable, "-m", "pip", "install", "-q", "-r", str(requirements)])
    else:
        run([sys.executable, "-m", "pip", "install", "-q", "pyyaml", "pillow"])


def zip_path(source: Path, destination: Path) -> None:
    with zipfile.ZipFile(destination, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for path in sorted(source.rglob("*")):
            if path.is_file():
                zf.write(path, path.relative_to(source.parent))


def main() -> int:
    print("Kaggle input directories:")
    for path in sorted(KAGGLE_INPUT.iterdir(), key=lambda item: item.name.lower()):
        print(" -", path)
    code_dir = find_code_dir()
    print("Pipeline code dataset:", code_dir)
    install_runtime_dependencies(code_dir)
    if str(code_dir) not in sys.path:
        sys.path.insert(0, str(code_dir))

    from build_clean_dataset_v4_from_kaggle_sources import build_clean_v4_dataset  # type: ignore
    from validate_clean_dataset import validate  # type: ignore

    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    summary = build_clean_v4_dataset(
        source_policy_path=code_dir / CLEAN_SOURCE_POLICY,
        taxonomy_path=code_dir / CLEAN_TAXONOMY,
        out_dataset=CLEAN_DATASET_DIR,
        out_reports=REPORT_DIR,
        max_images=CLEAN_MAX_IMAGES,
        kaggle_input=KAGGLE_INPUT,
    )
    validation_summary = validate(CLEAN_DATASET_DIR)
    payload = {"build": summary, "validation": validation_summary}
    (REPORT_DIR / "clean_build_v4_result.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if WRITE_DATASET_ZIP:
        zip_path(CLEAN_DATASET_DIR, CLEAN_DATASET_ZIP)
    else:
        print("Skipping dataset zip; Kaggle output keeps the dataset directory.", flush=True)
    zip_path(REPORT_DIR, REPORTS_ZIP)
    print(json.dumps(payload, ensure_ascii=False, indent=2), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
