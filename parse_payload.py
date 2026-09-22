with open("share_page.html", "r", encoding="utf-8") as f:
    text = f.read()

import re
import html
import json

# Check what data is in script 0 (WIZ_global_data)
# Let's extract key-values or strings from WIZ_global_data
wiz_match = re.search(r"window\.WIZ_global_data\s*=\s*(\{.*?\});", text, re.DOTALL)
if wiz_match:
    try:
        wiz = json.loads(wiz_match.group(1))
        print("WIZ keys:", list(wiz.keys()))
        for k, v in wiz.items():
            s = str(v)
            if len(s) > 100:
                print(f"Key {k} (len {len(s)}): {s[:200]}")
    except Exception as e:
        print("WIZ parse error:", e)

# Also check AF_initDataChunkQueue or AF_dataServiceRequests
print("AF chunk matches:", re.findall(r"AF_initDataCallback\((.*?)\);", text, re.DOTALL))

# Let's check data-payload attribute
payloads = re.findall(r'data-payload="([^"]*)"', text)
print("data-payload count:", len(payloads))
for p in payloads:
    print("Payload:", p[:300])

# Let's check for any mention of Indonesian words or text
indo_words = ["aplikasi", "buat", "sistem", "web", "data", "fitur", "user", "pengguna", "login", "daftar", "tabel", "database"]
for w in indo_words:
    cnt = len(re.findall(re.escape(w), text, re.IGNORECASE))
    if cnt > 0:
        print(f"Word '{w}' found {cnt} times")
