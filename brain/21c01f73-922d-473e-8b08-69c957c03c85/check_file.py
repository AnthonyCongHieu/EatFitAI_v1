# -*- coding: utf-8 -*-
import sys
import io

if sys.platform.startswith('win'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

filepath = r"C:\Users\PC\OneDrive\Desktop\smartcare-prep-web\src\views\KnowledgeMap.tsx"

try:
    with open(filepath, "r", encoding="utf-8") as f:
        lines = f.readlines()
        
    print("--- Lines 285 to 325 ---")
    for i in range(284, min(len(lines), 325)):
        print(f"{i+1}: {lines[i]}", end="")
except Exception as e:
    print(f"Error: {e}")
