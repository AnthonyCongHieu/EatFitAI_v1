from ultralytics import YOLO
import torch
import os
import multiprocessing

# ⚠️ CRITICAL: Fix Windows multiprocessing
if __name__ == "__main__":
    multiprocessing.freeze_support()
    
    print("="*60)
    print("🔙 BACK TO STABLE CONFIG - FROM EPOCH 60")
    print("="*60)
    
    # Check GPU
    print(f"\n🔍 System Check:")
    print(f"   CUDA: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"   GPU: {torch.cuda.get_device_name(0)}")
        mem_total = torch.cuda.get_device_properties(0).total_memory / 1024**3
        print(f"   Memory: {mem_total:.1f} GB")
    
    # Resume from LAST checkpoint (epoch 60)
    checkpoint_path = "runs/detect/eatfitai_ingredients/weights/last.pt"
    
    if not os.path.exists(checkpoint_path):
        print(f"\n❌ Error: Checkpoint not found at {checkpoint_path}")
        exit(1)
    
    print(f"\n📦 Resuming from checkpoint: {checkpoint_path}")
    print(f"   Last saved: Epoch 60/100")
    print(f"   Will continue from: Epoch 61")
    print(f"   Remaining: 39 epochs")
    
    model = YOLO(checkpoint_path)
    
    # ✅ STABLE Configuration (PROVEN TO WORK)
    print(f"\n⚙️ Stable Configuration (Back to Original):")
    config = {
        # ✅ RESUME MODE
        "resume": True,
        
        # Dataset & basic settings
        "data": "D:/datasets/data.yaml",
        "epochs": 100,
        "imgsz": 640,
        "device": 0,
        
        # ✅ STABLE SETTINGS (Same as first 59 epochs)
        "batch": 16,           # ← Back to 16 (stable)
        "workers": 4,          # ← Back to 4 (stable)
        "cache": False,        # ← NO CACHE (avoid issues)
        "amp": True,           # Mixed precision
        
        # Training control
        "patience": 15,
        "save": True,
        "save_period": 5,
        
        # Use SAME folder
        "project": "runs/detect",
        "name": "eatfitai_ingredients",
        "exist_ok": True,
    }
    
    print(f"\n📊 Configuration:")
    print(f"   Batch: 16 (proven stable)")
    print(f"   Workers: 4 (proven stable)")
    print(f"   Cache: False (no disk bottleneck)")
    
    print(f"\n⏱️  Expected Performance:")
    print(f"   Speed: ~18 min/epoch (consistent)")
    print(f"   Total time: 39 × 18 = ~12 hours")
    print(f"   Completion: ~1:00 AM tomorrow")
    
    for key, value in config.items():
        print(f"   {key}: {value}")
    
    print(f"\n🚀 Starting stable training...")
    print(f"   This configuration already trained 59 epochs successfully!")
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
