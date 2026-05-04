import os
from pathlib import Path
import subprocess
import zipfile


if not os.environ.get("KAGGLE_API_TOKEN"):
    raise RuntimeError(
        "Set KAGGLE_API_TOKEN in the environment before running this script. "
        "Never hardcode Kaggle tokens in repository files."
    )

dataset = os.environ.get("EATFITAI_KAGGLE_DATASET", "hiuinhcng/eatfitai-food-dataset")
zip_path = Path("eatfitai-food-dataset.zip")
kaggle_bin = os.environ.get("KAGGLE_BIN", "kaggle")

print("Downloading dataset zip...")
subprocess.run([kaggle_bin, "datasets", "download", dataset, "--force"], check=True)

print(f"Downloaded {zip_path}, size: {zip_path.stat().st_size / (1024 * 1024):.2f} MB")
print("Scanning for duplicate lines in label files...")

files_with_duplicates = 0
total_duplicate_lines = 0
total_txt_files = 0

with zipfile.ZipFile(zip_path, "r") as z:
    for filename in z.namelist():
        if filename.endswith(".txt") and "labels" in filename:
            total_txt_files += 1
            with z.open(filename) as f:
                lines = [line.decode("utf-8").strip() for line in f.readlines()]
                unique_lines = set(lines)
                if len(lines) > len(unique_lines):
                    files_with_duplicates += 1
                    total_duplicate_lines += len(lines) - len(unique_lines)

print("-" * 30)
print("KẾT QUẢ KIỂM TRA:")
print(f"Tổng số file labels (.txt): {total_txt_files}")
print(f"Số file bị trùng lặp: {files_with_duplicates}")
print(f"Tổng số dòng dư thừa (duplicate): {total_duplicate_lines}")
print("-" * 30)

print("Cleaning up...")
try:
    zip_path.unlink()
except OSError as exc:
    print(f"Could not remove {zip_path}: {exc}")
