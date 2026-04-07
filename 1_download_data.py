import os
import shutil

# Hướng dẫn cài đặt trước khi chạy: 
# pip install kaggle roboflow
# Lưu ý: Cần setup mã Kaggle API (Lấy ở mục Kaggle Account -> Create New API Token) và để file kaggle.json vào thư mục người dùng.

# --- 1. TẢI TỪ KAGGLE (ĐÃ VERIFY) ---
import kaggle

def download_kaggle_dataset(dataset_slug, download_path="./raw_datasets/"):
    print(f"Bắt đầu tải bộ dữ liệu Kaggle: {dataset_slug}")
    os.makedirs(download_path, exist_ok=True)
    # Lệnh tải bộ dữ liệu, mặc định sẽ giải nén
    kaggle.api.dataset_download_cli(dataset_slug, path=download_path, unzip=True)
    print(f"Đã tải xong Kaggle Dataset vào: {download_path}\n")

# --- 2. TẢI TỪ ROBOFLOW API ---
from roboflow import Roboflow

def download_roboflow_dataset(api_key, workspace, project, version, format="yolov11"):
    print(f"Bắt đầu tải dữ liệu thô từ Roboflow: {project}")
    rf = Roboflow(api_key=api_key)
    project_rf = rf.workspace(workspace).project(project)
    
    # format hỗ trợ: yolov8, yolov11 (Roboflow lưu trữ yolo format khá giống nhau)
    dataset = project_rf.version(version).download(format)
    
    # Di chuyển folder lấy được vào raw_datasets cho dễ quản lý
    target_dir = f"./raw_datasets/roboflow_{project}"
    if os.path.exists(target_dir):
        shutil.rmtree(target_dir)
    shutil.move(dataset.location, target_dir)
    print(f"Đã tải xong Roboflow Dataset vào: {target_dir}\n")

if __name__ == "__main__":
    # 1. Kéo tập Junk Food đã được verify sống 100%
    download_kaggle_dataset("youssefahmed003/junk-food-object-detection-dataset-yolo-format")
    
    # 2. Bạn thay API_KEY của Roboflow vào đây thì nó sẽ tự kéo bộ Vegetables về nhé
    # ROBOFLOW_API_KEY = "ĐIỀN-MÃ-API-VÀO-ĐÂY"
    # Lệnh chạy tham khảo:
    # download_roboflow_dataset(ROBOFLOW_API_KEY, "roboflow-100", "vegetables", version=1, format="yolov8")
    
    print("HOÀN TẤT QUÁ TRÌNH CÀO DATA RAW.")
