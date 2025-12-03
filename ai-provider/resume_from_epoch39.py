from ultralytics import YOLO
import torch
import os
import multiprocessing

# ⚠️ CRITICAL: Fix Windows multiprocessing
if __name__ == "__main__":
    multiprocessing.freeze_support()
    
    print("="*60)
    print("RESUME TRAINING FROM EPOCH 39")
    print("="*60)
    
    # Check GPU
    print(f"\n🔍 System Check:")
    print(f"   CUDA: {torch.cuda.is_available()}")
    print(f"   GPU: {torch.cuda.get_device_name(0)}")
    print(f"   Memory: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")
    
    # Resume from OLD checkpoint (epoch 39)
    checkpoint_path = "runs/detect/eatfitai_ingredients/weights/last.pt"
    
    if not os.path.exists(checkpoint_path):
        print(f"\n❌ Error: Checkpoint not found at {checkpoint_path}")
        exit(1)
    
    print(f"\n📦 Resuming from checkpoint: {checkpoint_path}")
    print(f"   This checkpoint is at epoch 39")
    print(f"   Will continue to epoch 100 (61 more epochs)")
    
    model = YOLO(checkpoint_path)
    
    # Resume configuration
    print(f"\n⚙️  Resume Configuration:")
    config = {
        # ✅ RESUME MODE - will continue from epoch 39
        "resume": True,
        
        # These will be loaded from checkpoint
        "data": "D:/datasets/data.yaml",
        "epochs": 100,
        "imgsz": 640,
        "batch": 16,
        "device": 0,
        "workers": 4,
        
        # Optimization
        "patience": 15,
        "save": True,
        "save_period": 5,
        "amp": True,
        "cache": False,
        
        # Use SAME folder
        "project": "runs/detect",
        "name": "eatfitai_ingredients",  # ← Same folder!
        "exist_ok": True,
    }
    
    for key, value in config.items():
        print(f"   {key}: {value}")
    
    print(f"\n🚀 Resuming training...")
    print(f"   Starting from: Epoch 39/100")
    print(f"   Remaining: 61 epochs")
    print(f"   Estimated time: ~10 hours")
    print(f"   Completion: ~8:30 AM tomorrow")
    print(f"\n" + "="*60)
    
    try:
        results = model.train(**config)
        
        print(f"\n" + "="*60)
        print(f"✅ TRAINING COMPLETE!")
        print(f"="*60)
        print(f"\n📊 Results:")
        print(f"   Save directory: {results.save_dir}")
        print(f"   Best model: {results.save_dir}/weights/best.pt")
        
        # Copy best.pt
        import shutil
        best_pt_source = os.path.join(results.save_dir, "weights", "best.pt")
        best_pt_dest = "best.pt"
        
        if os.path.exists(best_pt_source):
            shutil.copy2(best_pt_source, best_pt_dest)
            print(f"\n✅ Copied best.pt to {os.path.abspath(best_pt_dest)}")
        
        print(f"\n🎯 Next: Run export_model.py")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        raise
