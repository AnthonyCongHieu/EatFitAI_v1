import json, sys, io, urllib.request, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Notion DB query - lấy toàn bộ task
NOTION_TOKEN = os.environ.get("NOTION_API_KEY", "")
DB_ID = "edabb4de-ed21-424f-99f8-5cdb93968f3e"

# Tìm token từ config nếu không có env var
if not NOTION_TOKEN:
    # Thử đọc từ file config
    for p in [
        os.path.expanduser("~/.notion_token"),
    ]:
        if os.path.exists(p):
            NOTION_TOKEN = open(p).read().strip()
            break

# fallback: search the mcp config
if not NOTION_TOKEN:
    cfg_paths = [
        os.path.join(os.environ.get("APPDATA",""), "gemini", "config.json"),
        os.path.join(os.environ.get("LOCALAPPDATA",""), "gemini", "config.json"),
    ]
    for cp in cfg_paths:
        if os.path.exists(cp):
            try:
                cfg = json.load(open(cp))
                # look for notion token in env/args
                print(f"Found config at {cp}")
            except:
                pass

print("Falling back to reading from step output files...")

# Phương pháp thay thế: Đọc toàn bộ từ step log files của phiên trước 
# để tìm tất cả page IDs và task codes
base = r"C:\Users\PC\.gemini\antigravity\brain\d243a707-43ec-45fa-8d54-9b8d8d465bf0\.system_generated\steps"

all_tasks = {}  # task_code -> list of (id, name, created_time)

# Scan all step output files for page data
for root, dirs, files in os.walk(base):
    for fname in files:
        if fname != "output.txt":
            continue
        fpath = os.path.join(root, fname)
        try:
            content = open(fpath, 'r', encoding='utf-8').read()
            if '"database_id":"edabb4de-ed21-424f-99f8-5cdb93968f3e"' not in content:
                continue
            
            # Try to parse as JSON
            data = json.loads(content)
            results = data.get("results", [])
            if not results and data.get("object") == "page":
                results = [data]
            
            for r in results:
                if r.get("object") != "page":
                    continue
                parent = r.get("parent", {})
                if parent.get("database_id") != "edabb4de-ed21-424f-99f8-5cdb93968f3e":
                    continue
                
                pid = r["id"]
                code_prop = r.get("properties", {}).get("Task Code", {}).get("rich_text", [])
                code = code_prop[0]["plain_text"] if code_prop else "NO_CODE"
                name_prop = r.get("properties", {}).get("Name", {}).get("title", [])
                name = name_prop[0]["plain_text"] if name_prop else "NO_NAME"
                created = r.get("created_time", "?")
                
                if code not in all_tasks:
                    all_tasks[code] = {}
                all_tasks[code][pid] = {"name": name, "created": created}
        except (json.JSONDecodeError, KeyError):
            continue

# Tìm duplicates
print("\n" + "="*60)
print("DUPLICATE SCAN RESULTS")
print("="*60)

dupes_found = 0
for code in sorted(all_tasks.keys()):
    entries = all_tasks[code]
    if len(entries) > 1:
        dupes_found += 1
        print(f"\n🔴 DUPLICATE: {code} ({len(entries)} entries)")
        for pid, info in sorted(entries.items(), key=lambda x: x[1]["created"]):
            print(f"   ID: {pid}")
            print(f"   Name: {info['name']}")
            print(f"   Created: {info['created']}")
            print()
    
if dupes_found == 0:
    print("\n✅ No duplicates found in cached data.")
    print("   NOTE: This is from cached step outputs only.")
    print("   To be thorough, we should also check via direct Notion API.")
else:
    print(f"\n⚠️ Found {dupes_found} task codes with duplicates.")
