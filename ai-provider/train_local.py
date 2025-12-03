from ultralytics import YOLO
import torch
import os
import glob

if __name__ == "__main__":
    print("="*60)
    print("TRAINING YOLO MODEL FOR EATFITAI INGREDIENTS")
    print("="*60)

    # Check CUDA availability
    print(f"\n🔍 System Check:")
    print(f"   CUDA available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"   GPU: {torch.cuda.get_device_name(0)}")
        print(f"   CUDA version: {torch.version.cuda}")
        print(f"   GPU memory: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")
    else:
        print(f"   ⚠️  WARNING: CUDA not available. Training will be VERY slow on CPU!")
        response = input("\nDo you want to continue training on CPU? (yes/no): ")
        if response.lower() not in ['yes', 'y']:
            print("Training cancelled.")
            exit(0)

    # Find data.yaml file
    print(f"\n📁 Looking for data.yaml...")
    data_yaml_files = glob.glob("datasets/**/data.yaml", recursive=True)

    if not data_yaml_files:
        print("❌ Error: data.yaml not found!")
        print("   Please run download_dataset.py first to download the dataset.")
        exit(1)

    data_yaml = data_yaml_files[0]
    print(f"✅ Found: {data_yaml}")

    # Load pretrained model
    model_name = "yolov8s.pt"  # Using yolov8s (lighter and faster than yolov8x)
    print(f"\n📦 Loading pretrained model: {model_name}")
    model = YOLO(model_name)

    # Training configuration
    print(f"\n⚙️  Training Configuration:")
    config = {
        "data": data_yaml,
        "epochs": 100,
        "imgsz": 640,
        "batch": 8,  # Safe for RTX 3050 6GB
        "device": 0 if torch.cuda.is_available() else "cpu",
        "workers": 0,  # ⚠️ Set to 0 to avoid Windows multiprocessing issues
        "patience": 20,  # Early stopping
        "save": True,
        "save_period": 10,  # Save checkpoint every 10 epochs
        "project": "runs/detect",
        "name": "eatfitai_ingredients",
        "exist_ok": True,
        "amp": True,  # Automatic Mixed Precision (saves VRAM)
        "cache": False,  # Don't cache images (saves RAM)
        # Data augmentation
        "hsv_h": 0.015,
        "hsv_s": 0.7,
        "hsv_v": 0.4,
        "degrees": 10.0,
        "translate": 0.1,
        "scale": 0.5,
        "fliplr": 0.5,
        "mosaic": 1.0,
    }

    for key, value in config.items():
        print(f"   {key}: {value}")

    print(f"\n🚀 Starting training...")
    print(f"   Estimated time: 3-5 hours (large dataset with workers=0)")
    print(f"   Monitor GPU usage: Open another terminal and run 'nvidia-smi -l 1'")
    print(f"\n" + "="*60)

    # Train the model
    results = model.train(**config)

    print(f"\n" + "="*60)
    print(f"✅ TRAINING COMPLETE!")
    print(f"="*60)
    print(f"\n📊 Results:")
    print(f"   Save directory: {results.save_dir}")
    print(f"   Best model: {results.save_dir}/weights/best.pt")
    print(f"   Last model: {results.save_dir}/weights/last.pt")

    # Copy best.pt to ai-provider root for easy access
    best_pt_source = os.path.join(results.save_dir, "weights", "best.pt")
    best_pt_dest = "best.pt"

    if os.path.exists(best_pt_source):
        import shutil
        shutil.copy2(best_pt_source, best_pt_dest)
        print(f"\n✅ Copied best.pt to {os.path.abspath(best_pt_dest)}")
        print(f"   The AI Provider will automatically use this model when you restart it.")
    else:
        print(f"\n⚠️  Warning: best.pt not found at {best_pt_source}")

    print(f"\n🎯 Next steps:")
    print(f"   1. View results: Check {results.save_dir}/results.png")
    print(f"   2. Export model: Run export_model.py")
    print(f"   3. Test model: python app.py")
    print(f"\n" + "="*60)

