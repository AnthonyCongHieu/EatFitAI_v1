from ultralytics import YOLO
import os

print("="*60)
print("EXPORTING MODEL FOR ANDROID/PRODUCTION")
print("="*60)

# Find best.pt
best_pt_path = "best.pt"
if not os.path.exists(best_pt_path):
    # Try to find in runs/detect
    import glob
    training_runs = glob.glob("runs/detect/**/weights/best.pt", recursive=True)
    if training_runs:
        best_pt_path = training_runs[0]
        print(f"✅ Found trained model: {best_pt_path}")
    else:
        print("❌ Error: No trained model found!")
        print("   Please run train_local.py first to train a model.")
        exit(1)
else:
    print(f"✅ Using model: {best_pt_path}")

# Load model
print(f"\n📦 Loading model...")
model = YOLO(best_pt_path)

# Create exports directory
os.makedirs("exports", exist_ok=True)

print(f"\n🔄 Starting export process...")

# 1. Export to TFLite (FP16) - Recommended for Android
print(f"\n[1/4] Exporting to TFLite (FP16)...")
try:
    model.export(format="tflite", imgsz=640, int8=False)
    print(f"   ✅ TFLite FP16 export complete (~22MB)")
except Exception as e:
    print(f"   ❌ Failed: {e}")

# 2. Export to TFLite (INT8) - Smaller and faster
print(f"\n[2/4] Exporting to TFLite (INT8 quantized)...")
try:
    model.export(format="tflite", imgsz=640, int8=True)
    print(f"   ✅ TFLite INT8 export complete (~11MB)")
except Exception as e:
    print(f"   ❌ Failed: {e}")

# 3. Export to ONNX - Cross-platform
print(f"\n[3/4] Exporting to ONNX...")
try:
    model.export(format="onnx", imgsz=640, simplify=True)
    print(f"   ✅ ONNX export complete")
except Exception as e:
    print(f"   ❌ Failed: {e}")

# 4. Export to NCNN - Very lightweight for mobile
print(f"\n[4/4] Exporting to NCNN...")
try:
    model.export(format="ncnn", imgsz=640)
    print(f"   ✅ NCNN export complete")
except Exception as e:
    print(f"   ❌ Failed: {e}")

print(f"\n" + "="*60)
print(f"✅ EXPORT COMPLETE!")
print(f"="*60)

# List exported files
print(f"\n📁 Exported files:")

import glob
base_dir = os.path.dirname(best_pt_path) if os.path.dirname(best_pt_path) else "."

# Find all exported files
tflite_files = glob.glob(f"{base_dir}/*_saved_model/*.tflite")
onnx_files = glob.glob(f"{base_dir}/*.onnx")
ncnn_dirs = glob.glob(f"{base_dir}/*_ncnn_model")

if tflite_files:
    print(f"\n📱 TensorFlow Lite (Android):")
    for f in tflite_files:
        size = os.path.getsize(f) / 1024 / 1024
        print(f"   - {f} ({size:.1f} MB)")

if onnx_files:
    print(f"\n🌐 ONNX (Cross-platform):")
    for f in onnx_files:
        size = os.path.getsize(f) / 1024 / 1024
        print(f"   - {f} ({size:.1f} MB)")

if ncnn_dirs:
    print(f"\n📲 NCNN (Ultra-lightweight mobile):")
    for d in ncnn_dirs:
        print(f"   - {d}/")

print(f"\n🎯 Next steps:")
print(f"   1. For Android: Use the .tflite files")
print(f"   2. Copy models to your Android project's assets folder")
print(f"   3. Integrate using TensorFlow Lite Android library")
print(f"\n" + "="*60)
