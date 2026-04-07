import os
import glob
import shutil
import uuid
import json
import yaml

TARGET_DIR = "./eatfit_master_dataset"
IMAGES_DIR = os.path.join(TARGET_DIR, "images/train")
LABELS_DIR = os.path.join(TARGET_DIR, "labels/train")

def setup_directories():
    os.makedirs(IMAGES_DIR, exist_ok=True)
    os.makedirs(LABELS_DIR, exist_ok=True)

def load_master_map(json_path="master_classes.json"):
    with open(json_path, "r", encoding="utf-8") as f:
        return json.load(f)

def merge_sources(raw_dir="./raw_datasets/"):
    master_map = load_master_map()
    
    # Duyệt file yaml ở mọi dự án con mới tải về
    yaml_files = glob.glob(f"{raw_dir}/**/data.yaml", recursive=True)
    
    for yaml_path in yaml_files:
        base_dir = os.path.dirname(yaml_path)
        print(f"\n[+] Đang xử lý bộ: {base_dir}")
        
        # Đọc xem bộ này có các Classes tên là gì
        with open(yaml_path, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f)
            
        local_names = data.get('names', [])
        if isinstance(local_names, dict):
            # Lật ngược key-value về list chuẩn
            local_names = [data['names'][i] for i in range(len(data['names']))]
            
        # Tạo bảng dịch map (Local ID -> Master ID) cho dự án con này
        local_to_master = {}
        for local_id, name in enumerate(local_names):
            name_lower = str(name).lower()
            if name_lower in master_map:
                local_to_master[local_id] = master_map[name_lower]
        
        # Merge các ảnh (Lấy files trong train và val gộp hết)
        # Sử dụng uuid để không bao giờ bị trùng tên ảnh
        for split in ['train', 'valid', 'val']:
            img_folder = os.path.join(base_dir, split, 'images')
            lbl_folder = os.path.join(base_dir, split, 'labels')
            
            if not os.path.exists(img_folder):
                continue
                
            for img_file in os.listdir(img_folder):
                if not img_file.endswith(('.jpg', '.png', '.jpeg')):
                    continue
                
                # Copy ảnh cấp tên bí danh
                new_id = str(uuid.uuid4().hex)[:10]
                ext = img_file.split('.')[-1]
                new_img_name = f"{new_id}.{ext}"
                new_lbl_name = f"{new_id}.txt"
                
                old_lbl_path = os.path.join(lbl_folder, img_file.rsplit('.', 1)[0] + '.txt')
                
                if not os.path.exists(old_lbl_path):
                    continue
                
                # Convert nhãn txt và ghi
                valid_boxes = []
                with open(old_lbl_path, 'r') as lbl_f:
                    for line in lbl_f:
                        parts = line.strip().split()
                        if not parts: continue
                        cls_id = int(parts[0])
                        
                        if cls_id in local_to_master:
                            master_id = local_to_master[cls_id]
                            valid_boxes.append(f"{master_id} " + " ".join(parts[1:]))
                
                # Chỉ bê những ảnh mả CÓ chứa Box đồ ăn EatFit cần thiết
                if len(valid_boxes) > 0:
                    shutil.copy(os.path.join(img_folder, img_file), os.path.join(IMAGES_DIR, new_img_name))
                    with open(os.path.join(LABELS_DIR, new_lbl_name), "w") as out_lbl:
                        out_lbl.write("\n".join(valid_boxes))

    print(f"\n[DONE] Khối dữ liệu khổng lồ EatFit đã gộp xong đưa về {TARGET_DIR}")

if __name__ == "__main__":
    setup_directories()
    merge_sources()
