# -*- coding: utf-8 -*-
import io
import sys

if sys.platform.startswith('win'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

filepath = r"C:\Users\PC\OneDrive\Desktop\smartcare-prep-web\src\views\KnowledgeMap.tsx"

try:
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
        
    # Tìm chuỗi lỗi và thay thế
    target = 'như `{ "intent": "RECORD_MEDICATION", "medicationName": "Paracetamol" }` giúp'
    replacement = "như `{ 'intent': 'RECORD_MEDICATION', 'medicationName': 'Paracetamol' }` giúp"
    
    if target in content:
        content = content.replace(target, replacement)
        print("Found and replaced target quotes in file!")
    else:
        # Cách thay thế trực tiếp dòng 403
        lines = content.splitlines()
        if len(lines) >= 403 and "RECORD_MEDICATION" in lines[402]:
            print(f"Line 403 before: {lines[402]}")
            lines[402] = lines[402].replace('"intent"', "'intent'").replace('"RECORD_MEDICATION"', "'RECORD_MEDICATION'").replace('"medicationName"', "'medicationName'").replace('"Paracetamol"', "'Paracetamol'")
            content = "\n".join(lines)
            print(f"Line 403 after: {lines[402]}")
            
    with open(filepath, "w", encoding="utf-8", newline="\n") as f:
        f.write(content)
        
    print("Quote fix completed successfully!")
    
except Exception as e:
    print(f"Error: {e}")
