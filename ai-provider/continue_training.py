from ultralytics import YOLO
import torch
import os
import multiprocessing

# ⚠️ CRITICAL: Fix Windows multiprocessing
if __name__ == "__main__":
    multiprocessing.freeze_support()
    
    print("="*60)
    print("CONTINUE TRAINING - FORCE WORKERS=4 WORKAROUND")
    print("="*60)
    
    # Check GPU
    print(f"\n🔍 System Check:")
    print(f"   CUDA: {torch.cuda.is_available()}")
    print(f"   GPU: {torch.cuda.get_device_name(0)}")
    print(f"   Memory: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")
    
    # Load checkpoint as pretrained weights (NOT resume mode)
    checkpoint_path = "runs/detect/eatfitai_ingredients/weights/last.pt"
    
    if not os.path.exists(checkpoint_path):
        print(f"\n❌ Error: Checkpoint not found!")
        exit(1)
    
    print(f"\n📦 Loading checkpoint as pretrained weights: {checkpoint_path}")
    print(f"   ⚠️  NOT using resume=True (to force new config)")
    model = YOLO(checkpoint_path)
    
    # NEW optimized config - will override checkpoint settings
    print(f"\n⚙️  Optimized Configuration (FORCED):")
    config = {
        # ❌ NO resume=True - this is the workaround!
        
        # Dataset
        "data": "datasets/data.yaml",
        
        # Training params - WILL BE APPLIED
        "epochs": 100,      # Total epochs (will continue from where left off)
        "imgsz": 640,
        "batch": 16,        # ⬆️ TRY 16 first
        "device": 0,
        "workers": 4,       # ⬆️ THIS WILL WORK NOW!
        
        # Optimization
        "patience": 15,
        "save": True,
        "save_period": 5,
        "amp": True,
        "cache": False,
        
        # Project - use different name to avoid confusion
        "project": "runs/detect",
        "name": "eatfitai_ingredients_v2",  # New name
        "exist_ok": True,
        
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
    print(f"   Strategy: Continue from checkpoint weights WITHOUT resume mode")
    print(f"   This forces workers=4 and batch=16 to take effect")
    print(f"   Optimizer will reset but weights are from epoch 20")
    print(f"\n   Estimated time: ~6-8 hours")
    print(f"   Monitor: nvidia-smi -l 1")
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
        
    except RuntimeError as e:
        if "out of memory" in str(e).lower():
            print(f"\n⚠️  GPU Out of Memory!")
            print(f"   Reduce batch: Edit this file, change batch=16 to batch=12")
            print(f"   Then run: python continue_training.py")
        else:
            raise
    
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        if "multiprocessing" in str(e).lower() or "spawn" in str(e).lower():
            print(f"\n💡 Multiprocessing error detected")
            print(f"   Reduce workers: Edit this file, change workers=4 to workers=2")
            print(f"   Then run: python continue_training.py")
        raise
