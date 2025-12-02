from ultralytics import YOLO
import torch
import os
import multiprocessing

# ⚠️ CRITICAL: Fix Windows multiprocessing
if __name__ == "__main__":
    multiprocessing.freeze_support()
    
    print("="*60)
    print("🚀 OPTIMIZED RESUME - FROM EPOCH 59")
    print("="*60)
    
    # Check GPU
    print(f"\n🔍 System Check:")
    print(f"   CUDA: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"   GPU: {torch.cuda.get_device_name(0)}")
        mem_total = torch.cuda.get_device_properties(0).total_memory / 1024**3
        print(f"   Memory: {mem_total:.1f} GB")
    
    # Resume from LAST checkpoint (epoch 59)
    checkpoint_path = "runs/detect/eatfitai_ingredients/weights/last.pt"
    
    if not os.path.exists(checkpoint_path):
        print(f"\n❌ Error: Checkpoint not found at {checkpoint_path}")
        exit(1)
    
    print(f"\n📦 Resuming from checkpoint: {checkpoint_path}")
    print(f"   Last saved: Epoch 59/100")
    print(f"   Will continue from: Epoch 60")
    print(f"   Remaining: 40 epochs")
    
    model = YOLO(checkpoint_path)
    
    # ⚡ OPTIMIZED Configuration
    print(f"\n⚙️ Optimized Configuration:")
    config = {
        # ✅ RESUME MODE - will continue from epoch 59
        "resume": True,
        
        # Dataset & basic settings
        "data": "D:/datasets/data.yaml",
        "epochs": 100,
        "imgsz": 640,
        "device": 0,
        
        # ⚡ OPTIMIZATIONS (CHANGED!)
        "batch": 32,           # ← 2x faster (was 16)
        "workers": 8,          # ← More workers (was 4)
        "cache": True,         # ← Enable cache (was False)
        "amp": True,           # Mixed precision (keep)
        
        # Training control
        "patience": 15,
        "save": True,
        "save_period": 5,
        
        # Use SAME folder (important!)
        "project": "runs/detect",
        "name": "eatfitai_ingredients",
        "exist_ok": True,
    }
    
    print(f"\n📊 Key Changes:")
    print(f"   Batch size: 16 → 32 (2x faster)")
    print(f"   Workers: 4 → 8 (better CPU usage)")
    print(f"   Cache: False → True (faster data loading)")
    
    print(f"\n⏱️  Expected Performance:")
    print(f"   Before: ~18 min/epoch")
    print(f"   After:  ~7 min/epoch (2.5x faster!)")
    print(f"   Total time: ~5 hours (vs 12 hours)")
    print(f"   Completion: ~5 PM today")
    
    for key, value in config.items():
        print(f"   {key}: {value}")
    
    print(f"\n🚀 Starting optimized training...")
    print(f"=" * 60)
    
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
