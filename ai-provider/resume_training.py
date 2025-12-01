from ultralytics import YOLO
import torch
import os
import multiprocessing

# ⚠️ QUAN TRỌNG: Fix Windows multiprocessing
if __name__ == "__main__":
    # Freeze support for Windows
    multiprocessing.freeze_support()
    
    print("="*60)
    print("RESUMING YOLO TRAINING - OPTIMIZED CONFIG")
    print("="*60)
    
    # Check GPU
    print(f"\n🔍 System Check:")
    print(f"   CUDA: {torch.cuda.is_available()}")
    print(f"   GPU: {torch.cuda.get_device_name(0)}")
    print(f"   Memory: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")
    
    # Find checkpoint
    checkpoint_path = "runs/detect/eatfitai_ingredients/weights/last.pt"
    
    if not os.path.exists(checkpoint_path):
        print(f"\n❌ Error: Checkpoint not found at {checkpoint_path}")
        print("   Make sure you have run training at least once!")
        exit(1)
    
    print(f"\n📦 Loading checkpoint: {checkpoint_path}")
    model = YOLO(checkpoint_path)
    
    # Optimized configuration
    print(f"\n⚙️  Optimized Configuration:")
    config = {
        # Resume settings
        "resume": True,
        
        # Dataset
        "data": "datasets/data.yaml",
        
        # Training params - OPTIMIZED FOR SPEED + ACCURACY
        "epochs": 100,      # Keep 100 epochs (early stopping will handle)
        "imgsz": 640,       # Keep 640 for accuracy
        "batch": 16,        # ⬆️ INCREASED from 8 (test if GPU can handle)
        "device": 0,
        "workers": 4,       # ⬆️ INCREASED from 0 (2-3x faster!)
        
        # Optimization
        "patience": 15,     # ⬇️ Reduced from 20 (stop earlier if no improvement)
        "save": True,
        "save_period": 5,   # ⬇️ Save more frequently (every 5 epochs)
        "amp": True,        # Mixed precision
        "cache": False,     # Don't cache (save RAM)
        
        # Project
        "project": "runs/detect",
        "name": "eatfitai_ingredients",
        "exist_ok": True,
        
        # Data augmentation (keep same for consistency)
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
    
    print(f"\n🚀 Resuming training...")
    print(f"   Changes from previous run:")
    print(f"   - workers: 0 → 4 (2-3x faster data loading!)")
    print(f"   - batch: 8 → 16 (if GPU allows, else will auto-reduce)")
    print(f"   - patience: 20 → 15 (stop earlier if plateauing)")
    print(f"   - save_period: 10 → 5 (save checkpoints more often)")
    print(f"\n   Estimated time remaining: ~4-6 hours")
    print(f"   Monitor: nvidia-smi -l 1")
    print(f"\n" + "="*60)
    
    try:
        # Train with error handling
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
            print(f"   Batch size 16 is too large for RTX 3050 6GB")
            print(f"   Please restart with batch=12 or batch=8")
        else:
            print(f"\n❌ Error: {e}")
            raise
    
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        print(f"\n💡 If you see multiprocessing error:")
        print(f"   Try reducing workers to 2:")
        print(f"   Edit this file and change workers: 4 → 2")
        raise
