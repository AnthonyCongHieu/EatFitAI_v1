import json
import re
import os

with open('kaggle_train_yolo11.py', 'r', encoding='utf-8') as f:
    content = f.read()

cells = []

# Global markdown header
cells.append({
    'cell_type': 'markdown',
    'metadata': {},
    'source': [
        '# 🍜 EatFitAI — Kaggle Training Pipeline\n',
        '**Model:** YOLO11m | **GPU:** T4/P100 x2 | **Dataset:** EatFitAI Food Dataset\n',
        '\n',
        'Chạy tuần tự từ Cell 1. Notebook sẽ tự động tìm data và resume training nếu có checkpoint.'
    ]
})

blocks = re.split(r'# ==================== CELL \d+: .*? ====================', content)
titles = re.findall(r'# ==================== (CELL \d+: .*?) ====================', content)

for title, block in zip(titles, blocks[1:]):
    lines = block.strip().split('\n')
    md_lines = ['## ' + title + '\n']
    code_lines = []
    
    in_md = True
    for line in lines:
        if in_md and line.startswith('#'):
            clean_line = line.lstrip('#').strip()
            if clean_line == '---':
                continue
            md_lines.append(clean_line + '\n')
        else:
            in_md = False
            code_lines.append(line + '\n')
            
    if md_lines:
        cells.append({
            'cell_type': 'markdown',
            'metadata': {},
            'source': md_lines
        })
    if code_lines:
        cells.append({
            'cell_type': 'code',
            'execution_count': None,
            'metadata': {},
            'outputs': [],
            'source': code_lines
        })

notebook = {
    'nbformat': 4,
    'nbformat_minor': 0,
    'metadata': {
        'colab': {'provenance': []},
        'kernelspec': {'name': 'python3', 'display_name': 'Python 3'},
        'language_info': {'name': 'python'}
    },
    'cells': cells
}

out_path = "EatFitAI_Kaggle_Training.ipynb"
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(notebook, f, ensure_ascii=False, indent=1)

print(f"✅ Đã tạo: {out_path}")
print(f"📐 Size: {os.path.getsize(out_path)/1024:.1f} KB")
print(f"\n🚀 Upload file này lên Kaggle Notebook → chạy tuần tự từ Cell 1!")
