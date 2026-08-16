"""Watch crawler speed: per-seed time + saves per minute, from the log."""
import re
import time
from pathlib import Path

LOG = Path("D:/karm/repordar/crawl_sweep5.log")
last_lines = 0
start = time.time()
start_repos = None
start_seed = None
seen_seed_start = {}

# find the restart point: last "Searching:" line at start of watch
lines = LOG.read_text(encoding="utf-8", errors="replace").splitlines()
for i in range(len(lines) - 1, -1, -1):
    if lines[i].startswith("🔍 Searching:"):
        start_seed = lines[i]
        last_lines = i
        break

print(f"watch started at line {last_lines}: {start_seed.strip()}")
for _ in range(30):  # 30 x 10s = 5 min watch
    time.sleep(10)
    lines = LOG.read_text(encoding="utf-8", errors="replace").splitlines()
    new = lines[last_lines:]
    saves = sum(1 for l in new if " README " in l and "chars" in l)
    rejects = sum(1 for l in new if "rejected:" in l or "too fresh" in l or "too short" in l)
    cur_seed = None
    for l in reversed(new):
        if l.startswith("🔍 Searching:"):
            cur_seed = l.strip()
            break
    elapsed = time.time() - start
    print(f"[{elapsed:5.0f}s] +{len(new):4d} lines | saves={saves:3d} rejects={rejects:3d} | now: {cur_seed}")
    last_lines += len(new)
    if len(new) == 0 and elapsed > 60:
        break
print("watch done")