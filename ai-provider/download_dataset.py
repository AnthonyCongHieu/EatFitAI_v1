from roboflow import Roboflow
import os

print("="*60)
print("DOWNLOADING EATFITAI INGREDIENTS DATASET FROM ROBOFLOW")
print("="*60)

# Initialize Roboflow with your API key
rf = Roboflow(api_key="fwe0I8XwhVhUhj22LiXr")

# Get your project
project = rf.workspace("conghieu").project("eatfitai-ingredients-v1-wfulm")

# Get version 4
version = project.version(4)

# Download dataset in YOLOv8 format to a shorter path
print("\nDownloading dataset to D:/datasets...")
try:
    dataset = version.download("yolov8", location="D:/datasets")
    
    print(f"\n✅ Download complete!")
    print(f"📁 Dataset location: {dataset.location}")
    
    # Copy data.yaml to our ai-provider/datasets folder
    import shutil
    os.makedirs("datasets", exist_ok=True)
    
    # Create softlink or copy
    data_yaml_source = os.path.join(dataset.location, "data.yaml")
    data_yaml_dest = "datasets/data.yaml"
    
    if os.path.exists(data_yaml_source):
        # Modify data.yaml to use absolute paths
        with open(data_yaml_source, 'r') as f:
            content = f.read()
        
        # Update paths in data.yaml to absolute paths
        dataset_dir = os.path.abspath(dataset.location).replace('\\', '/')
        content = content.replace('../train/images', f'{dataset_dir}/train/images')
        content = content.replace('../valid/images', f'{dataset_dir}/valid/images')  
        content = content.replace('../test/images', f'{dataset_dir}/test/images')
        
        with open(data_yaml_dest, 'w') as f:
            f.write(content)
        
        print(f"\n✅ Created data.yaml with absolute paths!")
        print(f"   Location: {os.path.abspath(data_yaml_dest)}")
        print(f"\n🎯 Dataset ready for training!")
        
except Exception as e:
    print(f"\n❌ Error: {e}")
    print("\nPlease check:")
    print("  1. Internet connection")
    print("  2. Roboflow API key")
    print("  3. Disk space on D: drive")
