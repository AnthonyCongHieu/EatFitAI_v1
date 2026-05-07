from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path


KAGGLE_INPUT = Path("/kaggle/input")
WORK_DIR = Path("/kaggle/working/_dataset_v2_work")
REPORT_DIR = Path("/kaggle/working/_dataset_v2_reports")
RAW_ZIP_DIR = Path("/kaggle/working/_dataset_v2_raw_zips")


def run(cmd: list[str]) -> None:
    print("$", " ".join(cmd), flush=True)
    subprocess.run(cmd, check=True)


def find_code_dir() -> Path:
    candidates = [Path.cwd(), *sorted(KAGGLE_INPUT.glob("*pipeline-code*"))]
    for candidate in candidates:
        if (candidate / "audit_sources.py").exists() and (candidate / "make_sample_grids.py").exists():
            return candidate
    raise FileNotFoundError("No pipeline code dataset found under /kaggle/input")


def package_extracted_sources(raw_root: Path) -> Path:
    RAW_ZIP_DIR.mkdir(parents=True, exist_ok=True)
    existing_zips = list(raw_root.rglob("*.zip"))
    if existing_zips:
        return raw_root

    data_yamls = sorted(raw_root.rglob("data.y*ml"))
    packaged = 0
    for data_yaml in data_yamls:
        source_root = data_yaml.parent
        if "pipeline-code" in str(source_root):
            continue
        if not list(source_root.rglob("labels")) or not list(source_root.rglob("images")):
            continue
        out_base = RAW_ZIP_DIR / source_root.name.replace(" ", "_")
        shutil.make_archive(str(out_base), "zip", source_root)
        packaged += 1
    if packaged:
        print(f"Packaged {packaged} extracted source directories into zips.")
        return RAW_ZIP_DIR
    raise FileNotFoundError("No raw zip files or extracted YOLO source directories found under /kaggle/input")


def find_raw_dataset_dir() -> Path:
    candidates = [path for path in sorted(KAGGLE_INPUT.iterdir()) if path.is_dir() and "pipeline-code" not in path.name]
    print("Input tree preview:")
    for root in candidates:
        print(" -", root)
        for path in sorted(root.rglob("*"))[:40]:
            print("   ", path.relative_to(root))
    for candidate in candidates:
        if list(candidate.rglob("*.zip")) or list(candidate.rglob("data.y*ml")):
            return package_extracted_sources(candidate)
    raise FileNotFoundError("No raw source dataset found under /kaggle/input")


def find_raw_manifest(raw_root: Path) -> Path | None:
    direct = raw_root / "raw_source_manifest.csv"
    if direct.exists():
        return direct
    manifests = sorted(raw_root.rglob("raw_source_manifest.csv"))
    return manifests[0] if manifests else None


def main() -> int:
    print("Kaggle input directories:")
    for path in sorted(KAGGLE_INPUT.iterdir()):
        print(" -", path)

    code_dir = find_code_dir()
    print("Kernel working directory:", code_dir)
    print("Kernel files:")
    for path in sorted(code_dir.iterdir()):
        print(" -", path.name)

    raw_dir = find_raw_dataset_dir()
    raw_manifest = find_raw_manifest(raw_dir)
    print("Raw dataset:", raw_dir)
    if raw_manifest:
        print("Raw manifest:", raw_manifest)
    print("Raw zip files:")
    for path in sorted(raw_dir.rglob("*.zip")):
        print(" -", path.name, path.stat().st_size)

    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    WORK_DIR.mkdir(parents=True, exist_ok=True)

    audit_script = code_dir / "audit_sources.py"
    grid_script = code_dir / "make_sample_grids.py"

    audit_cmd = [
        sys.executable,
        str(audit_script),
        "--raw-dir",
        str(raw_dir),
        "--work-dir",
        str(WORK_DIR),
        "--out-dir",
        str(REPORT_DIR),
    ]
    if raw_manifest:
        audit_cmd.extend(["--manifest", str(raw_manifest)])
    run(audit_cmd)
    run(
        [
            sys.executable,
            str(grid_script),
            "--audit-json",
            str(REPORT_DIR / "source_audit.json"),
            "--out-dir",
            str(REPORT_DIR / "sample_grids"),
        ]
    )
    shutil.make_archive("/kaggle/working/dataset_v2_reports", "zip", REPORT_DIR)
    shutil.rmtree(WORK_DIR, ignore_errors=True)
    shutil.rmtree(RAW_ZIP_DIR, ignore_errors=True)
    print("Audit reports ready: /kaggle/working/dataset_v2_reports.zip")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
