"""Analyze crawler log: before/after the --gate restart."""
import re
from pathlib import Path

log = Path("D:/karm/repordar/crawl_sweep5.log").read_text(encoding="utf-8", errors="replace")
lines = log.splitlines()

# Find restart marker: the last 'Searching: ' seed is where the new run began is
# hard to pin; instead find last occurrence of the relaunch seed
saves = [(i, l) for i, l in enumerate(lines) if "README " in l and "chars" in l]
rejects = [(i, l) for i, l in enumerate(lines) if "rejected" in l or "too fresh" in l or "too short" in l]
searches = [(i, l) for i, l in enumerate(lines) if "Searching: " in l]

print(f"total lines: {len(lines)}, saves: {len(saves)}, rejects: {len(rejects)}, searches: {len(searches)}")

# Print the last 3 seeds with their save/reject counts
for si, (i, l) in enumerate(searches[-4:]):
    end = searches[si+1][0] if si+1 < len(searches) else len(lines)
    s = sum(1 for j, x in saves if i <= j < end)
    r = sum(1 for j, x in rejects if i <= j < end)
    print(f"  seed '{l.strip()}' -> saves={s} rejects={r}")

# Show raw last 15 lines as the log sees them
print("\n=== last 15 raw lines ===")
for l in lines[-15:]:
    print(" ", l)