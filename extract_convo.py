import re
import json
import html

with open("share_gemini_full.html", "r", encoding="utf-8") as f:
    content = f.read()

# Look for titles or og tags
og_title = re.findall(r'<meta property="og:title" content="([^"]+)"', content)
og_desc = re.findall(r'<meta property="og:description" content="([^"]+)"', content)
print("OG Title:", og_title)
print("OG Desc:", og_desc)

# Look for AF_initDataCallback or data-initial-data or window.WIZ_global_data
# In Google shared chats, data is usually in AF_initDataCallback with ds: key, or in WIZ_global_data or similar
# Let's search for conversation text or user prompt
# Often in gemini shares, the prompt and answers are in JSON arrays like [["...", "..."]]
# Let's search for "8445d81f3b88" in the html
print("Occurrences of 8445d81f3b88:", len(re.findall(r"8445d81f3b88", content)))

# Let's find any script tag containing the share id or Skid
scripts = re.findall(r"<script[^>]*>(.*?)</script>", content, re.DOTALL)
for i, s in enumerate(scripts):
    if "8445d81f3b88" in s:
        print(f"Found in script {i}, len {len(s)}")
        # Let's search for strings in this script
        with open(f"share_script_{i}.txt", "w", encoding="utf-8") as sf:
            sf.write(s)

# Also let's find any JSON or text in the html that has Indonesian words or code
matches = re.findall(r'(\["c_[^"]+".*?\]\n)', content)
print("c_ matches:", len(matches))

# Let's search for any long text strings in content
# In protobuf / js dump, strings are escaped like \x22 or unicode \u003c
unescaped = html.unescape(content)
# Let's find occurrences of typical Indonesian words or conversation markers
for word in ["buat", "aplikasi", "sistem", "saya", "kamu", "bisa", "tolong", "resep", "keuangan", "catatan", "kasir", "toko", "sekolah", "karyawan", "absensi", "inventaris", "jadwal", "pembukuan", "pos", "crm"]:
    found = [m.start() for m in re.finditer(r'\b' + word + r'\b', unescaped, re.IGNORECASE)]
    if found:
        print(f"Word '{word}': {len(found)} occurrences, e.g. snippet: {unescaped[max(0, found[0]-50):min(len(unescaped), found[0]+150)]!r}")
