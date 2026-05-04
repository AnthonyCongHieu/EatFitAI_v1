import os
from pathlib import Path

print("Bắt đầu kiểm tra dữ liệu trùng lặp trên Kaggle...")

# Thư mục chứa labels trên Kaggle
dataset_dir = "/kaggle/input/eatfitai-food-dataset/merged_dataset"
for split in ['train', 'val']:
    labels_dir = os.path.join(dataset_dir, split, 'labels')
    print(f"Checking {labels_dir} ...")
    if not os.path.exists(labels_dir):
        print(f"Directory not found: {labels_dir}")
        continue
    
    path = Path(labels_dir)
    txt_files = list(path.glob("*.txt"))
    total_files = len(txt_files)
    files_with_duplicates = 0
    total_duplicate_lines = 0
    
    for txt_file in txt_files:
        with open(txt_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        unique_lines = set(lines)
        if len(lines) > len(unique_lines):
            files_with_duplicates += 1
            total_duplicate_lines += (len(lines) - len(unique_lines))
            
    print(f"[{split}] Total txt files: {total_files}")
    print(f"[{split}] Files with duplicates: {files_with_duplicates}")
    print(f"[{split}] Total duplicate lines: {total_duplicate_lines}")
    print("-" * 40)

print("Hoàn tất kiểm tra!")
