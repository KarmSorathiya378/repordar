"""Final gate proof: any save AFTER the --gate restart with README < 200 chars?"""
import re
from pathlib import Path

lines = Path("D:/karm/repordar/crawl_sweep5.log").read_text(encoding="utf-8", errors="replace").splitlines()

# Find restart boundary: the "productivity terminal tool" search that followed
# the relaunch (it was the first seed of the gated run per earlier tails)
boundary = None
for i, l in enumerate(lines):
    if l.startswith("🔍 Searching: productivity terminal tool"):
        boundary = i
print(f"boundary (gated run start) at line {boundary}")
if boundary is None:
    print("no boundary found"); raise SystemExit

viol = 0
checked = 0
for l in lines[boundary:]:
    m = re.search(r"chars$", l)
    if m and "README" in l and "Download" not in l:
        sz = re.search(r"README (\d+) chars", l)
        if sz:
            checked += 1
            v = int(sz.group(1))
            if v < 200:
                viol += 1
                print("  VIOLATION:", l.strip()[:100])
print(f"post-restart saves checked: {checked}, violations (<200 chars): {viol}")
print("GATE OK" if viol == 0 else "GATE BROKEN")