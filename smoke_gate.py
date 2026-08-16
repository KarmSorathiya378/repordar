"""Smoke test for the gate-reorder — temp OUT_FILE, no pollution of real data."""
import json
import sys
from pathlib import Path

import crawler.crawler as mod

# Redirect output to a temp file
mod.OUT_FILE = Path("D:/karm/repordar/.smoke_repos.jsonl")
if mod.OUT_FILE.exists():
    mod.OUT_FILE.unlink()

# 1) gate_meta unit assertions (no network)
cases = [
    ({"archived": True, "license": {"spdx_id": "MIT"}, "description": "x", "pushed_at": "2026-01-01T00:00:00Z"}, (False, "archived")),
    ({"archived": False, "license": {}, "description": "x", "pushed_at": "2026-01-01T00:00:00Z"}, (False, "no real license")),
    ({"archived": False, "license": {"spdx_id": "MIT"}, "description": "", "pushed_at": "2026-01-01T00:00:00Z"}, (False, "no description")),
    ({"archived": False, "license": {"spdx_id": "MIT"}, "description": "x", "pushed_at": ""}, (False, "no push date")),
    ({"archived": False, "license": {"spdx_id": "MIT"}, "description": "x", "pushed_at": "2020-01-01T00:00:00Z"}, (False, "inactive")),
    ({"archived": False, "license": {"spdx_id": "MIT"}, "description": "x", "pushed_at": "2026-08-01T00:00:00Z"}, (True, "")),
]
for repo, expect in cases:
    got = mod.gate_meta(repo)
    if expect[1].startswith("inactive"):
        assert got[0] == False and got[1].startswith("inactive"), f"FAIL {repo}: got {got} expect {expect}"
    else:
        assert got == expect, f"FAIL {repo}: got {got} expect {expect}"
print("gate_meta: 6/6 assertions pass")

# 2. Live smoke: search + gate on, tiny limit — exercises the network path
n = mod.crawl("language:elixir stars:>200", limit=3, gate=True)
print(f"crawl smoke: saved={n}")
rows = [json.loads(l) for l in mod.OUT_FILE.open(encoding="utf-8") if l.strip()]
assert all("readme" in r for r in rows), "saved rows must carry readme"
print(f"smoke rows: {len(rows)} — all carry readme")

mod.OUT_FILE.unlink()
print("SMOKE OK")