import json, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

base = r"C:\Users\PC\.gemini\antigravity\brain\d243a707-43ec-45fa-8d54-9b8d8d465bf0\.system_generated\steps"
for s in [321, 322]:
    data = json.load(open(f"{base}\\{s}\\output.txt", 'r', encoding='utf-8'))
    print(f"=== Step {s} ===")
    for r in data['results']:
        if r.get('parent',{}).get('database_id') != 'edabb4de-ed21-424f-99f8-5cdb93968f3e':
            continue
        code_rt = r['properties']['Task Code']['rich_text']
        code = code_rt[0]['plain_text'] if code_rt else 'N/A'
        name = r['properties']['Name']['title'][0]['plain_text'] if r['properties']['Name']['title'] else 'N/A'
        print(f"  {r['id']} | {code} | {name} | {r['created_time']}")
