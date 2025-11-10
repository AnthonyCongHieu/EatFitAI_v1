from PIL import Image
import os
from ultralytics import YOLO
img_path = os.path.join('ai-provider','uploads','test.jpg')
os.makedirs(os.path.dirname(img_path), exist_ok=True)
Image.new('RGB',(320,240),(128,128,128)).save(img_path)
model = YOLO('ai-provider/yolov8n.pt')
res = model(img_path)
print('boxes', len(res[0].boxes))
