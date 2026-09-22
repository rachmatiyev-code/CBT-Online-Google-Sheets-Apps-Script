import urllib.request
import urllib.parse
import json

# Let's try calling batchexecute with common Bard shared chat RPCs
# Common RPCs: "hptQsf", "W2hh4b", "k8F34d", "KUM7Z", "e7Hzgb", "yGfSdd"
share_id = "8445d81f3b88"

# Let's inspect what RPC is used for loading a share
# In Bard, RPC for get shared conversation is typically invoked with [share_id]
candidates = ["hptQsf", "KUM7Z", "e7Hzgb", "yGfSdd", "SpsfSb", "zbML3c", "zr1jrb", "PoEs9b"]

for rpc in candidates:
    payload = [[ [rpc, json.dumps([share_id, None, 1]), None, "generic"] ]]
    body = "f.req=" + urllib.parse.quote(json.dumps(payload))
    req = urllib.request.Request(
        "https://gemini.google.com/_/BardChatUi/data/batchexecute?rpcids=" + rpc,
        data=body.encode("utf-8"),
        headers={
            "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
            "User-Agent": "Mozilla/5.0"
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = resp.read().decode("utf-8")
            if "wrb.fr" in data and not "null" in data[:100]:
                print(f"RPC {rpc} returned data of len {len(data)}: {data[:300]}")
    except Exception as e:
        pass
print("Done candidate scan.")
