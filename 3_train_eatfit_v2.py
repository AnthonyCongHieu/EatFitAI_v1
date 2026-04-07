import yaml
from ultralytics import YOLO

def create_master_yaml():
    yaml_content = {
        "path": "./eatfit_master_dataset",
        "train": "images/train",
        "val": "images/train",  # Có thể set val thư mục riêng để test mAP
        "names": {
            0: "tomato",
            1: "beef",
            2: "onion",
            3: "potato",
            4: "burger",
            5: "pizza",
            6: "hotdog",
            7: "apple",
            8: "cabbage",
            9: "carrot"
            # Thêm theo list trong file master_classes.json
        }
    }
    with open("./eatfit_master_dataset/data.yaml", "w") as f:
        yaml.dump(yaml_content, f)

if __name__ == "__main__":
    # 1. Sinh file YAML
    create_master_yaml()
    print("[INFO] Đã khởi tạo data.yaml chính thức.")
    
    # 2. Khởi tạo Model v11 - Khuyên dùng size Medium (yolo11m) cho bài toán ẩm thực khó đoán
    print("[INFO] Load YOLO11 Medium Model...")
    model = YOLO('yolo11m.pt') 

    # 3. Quá trình huấn luyện với Data Lớn & Hyper parameter cấp cao
    print("[INFO] Bắt đầu phá đảo Training EatFit V2...")
    model.train(
        data='./eatfit_master_dataset/data.yaml',
        epochs=150, 
        imgsz=640,
        batch=16,          # Hạ nếu máy cháy VRAM
        workers=8,         # Khai thác đa luồng đọc file
        device=0,          # GPU số 0
        optimizer='auto',  
        
        # ----- TRICK BÍ MẬT TRAIN DATA ẨM THỰC CHỒNG CHÉO -----
        mosaic=1.0,        # Bắn 4 ảnh vào nhau
        mixup=0.2,         # Làm đồ ăn bồng bềnh mờ xếp đè
        copy_paste=0.1,    # Bốc ảnh quả táo dán sang ảnh thịt gà
        degrees=15.0,      # Xoay dĩa đồ ăn
        hsv_s=0.5,         # Thay đổi độ bão hoà (màu ẩm thực thật/giả)
        vfl_loss=True      # Bật cơ chế Variational Focal Loss mới của YOLOv11
    )
    print("HOÀN TẤT HUẤN LUYỆN! Check folder ./runs/train/")
