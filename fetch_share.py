import urllib.request
import re
import html
import json

url = "https://share.gemini.google/yguENR0LmB9m"
req = urllib.request.Request(
    url,
    headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
)

try:
    with urllib.request.urlopen(req, timeout=15) as resp:
        content = resp.read().decode("utf-8", errors="ignore")
        with open("share_page.html", "w", encoding="utf-8") as f:
            f.write(content)
        print("Successfully wrote share_page.html, size:", len(content))
        
        # Search for interesting data
        # Gemini share pages often put data in data-initial-data or window.WIZ_global_data or AF_initDataCallback
        callbacks = re.findall(r"AF_initDataCallback\((\{.*?\})\);", content, re.DOTALL)
        print("Found callbacks:", len(callbacks))
        for i, cb in enumerate(callbacks):
            with open(f"cb_{i}.txt", "w", encoding="utf-8") as cf:
                cf.write(cb)
        
        # Also let's extract all human readable text or strings in quotes
        title_m = re.search(r"<title>(.*?)</title>", content)
        if title_m:
            print("TITLE:", title_m.group(1))
            
        og_desc = re.search(r'<meta property="og:description" content="([^"]+)"', content)
        if og_desc:
            print("OG:DESC:", html.unescape(og_desc.group(1)))
            
        og_title = re.search(r'<meta property="og:title" content="([^"]+)"', content)
        if og_title:
            print("OG:TITLE:", html.unescape(og_title.group(1)))

except Exception as e:
    print("Error fetching:", e)
