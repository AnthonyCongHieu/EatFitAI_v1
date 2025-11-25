from ultralytics import YOLO
import os

print("Downloading YOLOv8m model...")
try:
    model = YOLO("yolov8m.pt")
    print(f"Model downloaded to {os.path.abspath('yolov8m.pt')}")
except Exception as e:
    print(f"Error downloading model: {e}")
