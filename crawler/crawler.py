"""
RepoRadar crawler — fetch GitHub repos + READMEs via the free API.

Phase 1 goal: ~100K repos with READMEs, stored for later embedding.
Rate-limit aware: parses X-RateLimit-* headers, sleeps on 403.

Usage:
    python crawler.py --seed "topic:python" --limit 500
    python crawler.py --seed "language:python stars:>50" --limit 1000

Output: crawler/data/repos.jsonl (append-only, resumable)
"""

import argparse
import base64
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

TOKEN = os.environ.get("GITHUB_TOKEN", "")
HEADERS = {
    "User-Agent": "repordar-crawler/0.1",
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
}
if TOKEN:
    HEADERS["Authorization"] = f"Bearer {TOKEN}"

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)
OUT_FILE = DATA_DIR / "repos.jsonl"


def api_get(url: str, retries: int = 4) -> tuple[dict | None, dict]:
    """GET a GitHub API URL, honoring rate limits. Returns (json, headers).
    Retries on transient network errors (timeouts, resets)."""
    for attempt in range(retries):
        req = urllib.request.Request(url, headers=HEADERS)
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.load(resp), dict(resp.headers)
        except urllib.error.HTTPError as e:
            remaining = e.headers.get("X-RateLimit-Remaining", "?")
            if e.code == 403 and remaining == "0":
                reset = int(e.headers.get("X-RateLimit-Reset", time.time()))
                wait = max(0, reset - time.time()) + 2
                print(f"  ⏳ Rate limited — sleeping {wait:.0f}s until reset", flush=True)
                time.sleep(wait)
                return api_get(url)
            if e.code in (404, 422):
                return None, {}
            print(f"  ⚠️ HTTP {e.code}: {url}", file=sys.stderr)
            return None, {}
        except (urllib.error.URLError, TimeoutError, OSError) as e:
            wait = 10 * (attempt + 1)
            print(f"  🌐 Network error ({e}) — retry {attempt+1}/{retries} in {wait}s", flush=True)
            time.sleep(wait)
    print(f"  ❌ Giving up after {retries} tries: {url}", file=sys.stderr)
    return None, {}


def get_readme(full_name: str) -> str:
    """Fetch a repo's README. Returns truncated text, '' if none."""
    data, _ = api_get(f"https://api.github.com/repos/{full_name}/readme")
    if not data or "content" not in data:
        return ""
    try:
        text = base64.b64decode(data["content"]).decode("utf-8", errors="replace")
    except Exception:
        return ""
    return text[:4000]  # truncate: search needs the head, not the whole book


def search_repos(query: str, limit: int, per_page: int = 30) -> list[dict]:
    """Search repos sorted by stars, paginating the search API (10 req/min)."""
    results = []
    pages = min(10, (limit + per_page - 1) // per_page)
    for page in range(1, pages + 1):
        q = urllib.parse.quote(query)
        url = (f"https://api.github.com/search/repositories?q={q}"
               f"&sort=stars&order=desc&per_page={per_page}&page={page}")
        data, _ = api_get(url)
        if not data or "items" not in data:
            break
        results.extend(data["items"])
        print(f"  📦 page {page}: {len(results)} repos so far", flush=True)
        time.sleep(6)  # search API hard cap: 10/min
        if len(results) >= limit:
            break
    return results[:limit]


def seen_ids() -> set[str]:
    """IDs already crawled — resume support."""
    if not OUT_FILE.exists():
        return set()
    ids = set()
    for line in OUT_FILE.open(encoding="utf-8"):
        try:
            ids.add(json.loads(line)["id"])
        except (json.JSONDecodeError, KeyError):
            continue
    return ids


def passes_gate(repo: dict, readme: str) -> tuple[bool, str]:
    """Quality gate for long-tail repos: is this a real, working project?
    Returns (pass, reason-if-failed)."""
    if repo.get("archived"):
        return False, "archived"
    if len(readme.strip()) < 200:
        return False, "README too short"
    lic = (repo.get("license") or {}).get("spdx_id", "")
    if not lic or lic == "NOASSERTION":
        return False, "no real license"
    if not (repo.get("description") or "").strip():
        return False, "no description"
    pushed = repo.get("pushed_at", "")
    if not pushed:
        return False, "no push date"
    try:
        from datetime import datetime, timezone
        pushed_dt = datetime.fromisoformat(pushed.replace("Z", "+00:00"))
        age_days = (datetime.now(timezone.utc) - pushed_dt).days
        if age_days > 730:  # 2 years inactive = likely dead
            return False, f"inactive {age_days}d"
    except ValueError:
        return False, "bad date"
    return True, ""


def crawl(query: str, limit: int, gate: bool = False) -> int:
    print(f"🔍 Searching: {query}")
    repos = search_repos(query, limit)
    seen = seen_ids()
    saved = 0
    skipped = 0
    with OUT_FILE.open("a", encoding="utf-8") as out:
        for repo in repos:
            full_name = repo["full_name"]
            if repo["id"] in seen:
                continue
            readme = get_readme(full_name)
            if gate:
                ok, reason = passes_gate(repo, readme)
                if not ok:
                    skipped += 1
                    print(f"  ⏭️  {full_name} — rejected: {reason}", flush=True)
                    seen.add(repo["id"])  # don't re-check next pass
                    time.sleep(1)
                    continue
            row = {
                "id": repo["id"],
                "full_name": full_name,
                "description": repo.get("description") or "",
                "stars": repo.get("stargazers_count", 0),
                "forks": repo.get("forks_count", 0),
                "language": repo.get("language") or "",
                "topics": repo.get("topics", []),
                "license": (repo.get("license") or {}).get("spdx_id", ""),
                "pushed_at": repo.get("pushed_at", ""),
                "readme": readme,
            }
            out.write(json.dumps(row) + "\n")
            saved += 1
            seen.add(repo["id"])
            print(f"  💾 {full_name} ({row['stars']}★) — README {len(readme)} chars", flush=True)
            time.sleep(1)  # stay gentle on core API
    print(f"✅ Done: {saved} saved, {skipped} rejected (quality gate) → {OUT_FILE}")
    return saved


def main():
    parser = argparse.ArgumentParser(description="RepoRadar crawler")
    parser.add_argument("--seed", help='e.g. "topic:python stars:>50"')
    parser.add_argument("--seeds-file", help="path to file with one query per line")
    parser.add_argument("--limit", type=int, default=300)
    parser.add_argument("--gate", action="store_true", help="quality-gate long-tail repos")
    args = parser.parse_args()
    if not TOKEN:
        print("⚠️  No GITHUB_TOKEN in env — crawling unauthenticated (60 req/hr).")
        print("    Export GITHUB_TOKEN for 5,000 req/hr.")

    queries = []
    if args.seeds_file:
        with open(args.seeds_file, encoding="utf-8") as f:
            queries = [line.strip() for line in f if line.strip()]
    elif args.seed:
        queries = [args.seed]
    else:
        parser.error("provide --seed or --seeds-file")

    total = 0
    for q in queries:
        total += crawl(q, args.limit, gate=args.gate)
    print(f"\n🏁 Full pass done: {total} new repos saved → {OUT_FILE}")


if __name__ == "__main__":
    main()
