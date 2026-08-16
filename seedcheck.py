import re
from pathlib import Path

lines = Path("D:/karm/repordar/crawl_sweep5.log").read_text(encoding="utf-8", errors="replace").splitlines()

seeds = Path("D:/karm/repordar/crawler/seeds_resume.txt").read_text(encoding="utf-8").splitlines()
print(f"seeds file: {len(seeds)} seeds")

searched = set()
for l in lines:
    m = re.match(r"🔍 Searching: (.+)$", l.strip())
    if m:
        searched.add(m.group(1))

# match by first 12 chars approx
done = sum(1 for s in seeds if any(s[:12] in x for x in searched))
print(f"seeds completed (approx): {done}/{len(seeds)}")
rem = [s for s in seeds if not any(s[:12] in x for x in searched)]
print(f"remaining: {len(rem)}")
for s in rem[:20]:
    print("  -", s)

# was a full pass ever finished?
print("\npass-finished markers in log:", lines.count('🏁 Full pass done'))
print("Done markers per seed:", sum(1 for l in lines if "Done:" in l))