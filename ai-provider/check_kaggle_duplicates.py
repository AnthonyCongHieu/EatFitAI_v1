import os
import zipfile
import subprocess

os.environ['KAGGLE_API_TOKEN'] = "KGAT_67e7f4007306f61d680fb471dc60c68b"

dataset = "hiuinhcng/eatfitai-food-dataset"
zip_path = "eatfitai-food-dataset.zip"

print("Downloading dataset zip...")
# Using full path to kaggle binary just in case
kaggle_bin = r"C:\Users\pc2\AppData\Roaming\Python\Python311\Scripts\kaggle"
subprocess.run([kaggle_bin, "datasets", "download", dataset], check=True)

print(f"Downloaded {zip_path}, size: {os.path.getsize(zip_path) / (1024*1024):.2f} MB")
print("Scanning for duplicate lines in label files...")

files_with_duplicates = 0
total_duplicate_lines = 0
total_txt_files = 0

with zipfile.ZipFile(zip_path, 'r') as z:
    for filename in z.namelist():
        if filename.endswith(".txt") and "labels" in filename:
            total_txt_files += 1
            with z.open(filename) as f:
                lines = [line.decode('utf-8') for line in f.readlines()]
                unique_lines = set(lines)
                if len(lines) > len(unique_lines):
                    files_with_duplicates += 1
                    total_duplicate_lines += (len(lines) - len(unique_lines))

print("-" * 30)
print(f"KẾT QUẢ KIỂM TRA:")
print(f"Tổng số file labels (.txt): {total_txt_files}")
print(f"Số file bị trùng lặp: {files_with_duplicates}")
print(f"Tổng số dòng dư thừa (duplicate): {total_duplicate_lines}")
print("-" * 30)

print("Cleaning up...")
try:
    os.remove(zip_path)
except:
    pass
