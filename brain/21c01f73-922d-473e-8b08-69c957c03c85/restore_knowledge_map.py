# -*- coding: utf-8 -*-
import sys
import io

if sys.platform.startswith('win'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

filepath = r"C:\Users\PC\OneDrive\Desktop\smartcare-prep-web\src\views\KnowledgeMap.tsx"

try:
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
        
    # Tìm kiếm đoạn bị lỗi
    broken_str = "const [activeFlowId, setActiveFlowId] = useStat  // Định nghĩa 25 nodes bám sát"
    
    restored_str = """const [activeFlowId, setActiveFlowId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Định nghĩa 25 nodes bám sát"""
    
    if broken_str in content:
        content = content.replace(broken_str, restored_str)
        print("Successfully restored states and refs in KnowledgeMap.tsx!")
    else:
        # Cách 2: Tìm kiếm tương đối nếu chuỗi bị thay đổi nhẹ
        print("Broken string not found exactly, trying search by line...")
        lines = content.splitlines()
        for idx, line in enumerate(lines):
            if "setActiveFlowId" in line and "useStat" in line:
                print(f"Found broken line at index {idx}: {line}")
                lines[idx] = """  const [activeFlowId, setActiveFlowId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);"""
                content = "\n".join(lines)
                print("Restored using line index!")
                break
                
    with open(filepath, "w", encoding="utf-8", newline="\n") as f:
        f.write(content)
        
    print("Restore completed successfully!")
    
except Exception as e:
    print(f"Error: {e}")
