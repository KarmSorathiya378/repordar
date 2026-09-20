"""
RepoRadar Production Discovery & Crawling Engine (Refactored Pipeline).

Key Capabilities:
- Fast O(1) Identity & Canonical Deduplication (ID + normalized owner/repo name)
- Decoupled Candidate Processing Queue & Parallel README Gate Workers
- Structured Rejection Logging (crawler/data/rejections.jsonl)
- Token-Rotated Rate-Limit Aware API Client
- Yield & Exhaustion Tracking per Seed/Strategy
- Real-time Observability & Telemetry Metrics (high_quality_repos_per_hour)

Usage:
    python crawler/crawler.py --seeds-file crawler/seeds_universal.txt --gate --loop
"""

import argparse
import base64
import http.client
import itertools
import json
import os
import queue
import re
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

# UTF-8 Encoding Enforcement
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# --- Configuration & Parameters ---
TARGET_NEW_CANDIDATES = 50
MAX_QUERY_VARIANTS = 4
SEARCH_STRATEGIES = [
    ("stars", "desc"),
    ("updated", "desc"),
    ("created", "desc"),
]
MAX_PAGES_PER_QUERY = 10
LOW_YIELD_THRESHOLD = 0.05
EXHAUSTION_THRESHOLD = 3
MIN_CREATED_DAYS = 30
MAX_WORKERS = 40  # Parallel README fetch threads


DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)
OUT_FILE = DATA_DIR / "repos.jsonl"
REJECT_FILE = DATA_DIR / "rejections.jsonl"
STATS_FILE = DATA_DIR / "query_stats.json"

# --- Multi-Token Pool Setup ---
TOKENS = []
t1 = os.environ.get("GITHUB_TOKEN", "")
if t1:
    TOKENS.append(t1)

env_file = Path(__file__).resolve().parent.parent / ".env"
if env_file.exists():
    for line in env_file.open(encoding="utf-8", errors="ignore"):
        if line.startswith("GITHUB_TOKEN"):
            val = line.split("=", 1)[1].strip().strip('"').strip("'")
            if val and val not in TOKENS:
                TOKENS.append(val)

if not TOKENS:
    print("⚠️  No GITHUB_TOKEN in env or .env")

token_cycle = itertools.cycle(TOKENS) if TOKENS else None
token_lock = threading.Lock()


def get_headers(is_raw: bool = False) -> dict:
    """Get HTTP headers with rotating token authorization."""
    accept = "application/vnd.github.raw+json" if is_raw else "application/vnd.github+json"
    headers = {
        "User-Agent": "repordar-crawler/0.2",
        "Accept": accept,
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if token_cycle:
        with token_lock:
            t = next(token_cycle)
        headers["Authorization"] = f"Bearer {t}"
    return headers


def api_get(url: str, is_raw: bool = False, retries: int = 3) -> tuple[str | dict | None, dict]:
    """GET a GitHub API URL with auto-rotating token pool and exponential backoff."""
    for attempt in range(retries):
        headers = get_headers(is_raw)
        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                if is_raw:
                    content = resp.read().decode("utf-8", errors="replace")
                    return content, dict(resp.headers)
                return json.load(resp), dict(resp.headers)
        except urllib.error.HTTPError as e:
            remaining = e.headers.get("X-RateLimit-Remaining", "?")
            if e.code == 403 and remaining == "0":
                print("  🔄 Token rate limit hit — rotating token in pool", flush=True)
                time.sleep(1.0)
                return api_get(url, is_raw=is_raw)
            if e.code in (404, 422):
                return "" if is_raw else None, {}
            time.sleep(0.5 * (attempt + 1))
        except Exception:
            time.sleep(0.5 * (attempt + 1))
    return "" if is_raw else None, {}


def get_readme_raw(full_name: str) -> str:
    """Fetch raw text README directly in 1 request."""
    url = f"https://api.github.com/repos/{full_name}/readme"
    text, _ = api_get(url, is_raw=True)
    if isinstance(text, str):
        return text[:12000]
    return ""


def normalize_repo_name(name_or_url: str) -> str:
    """Canonicalize repo identity string (e.g. 'https://github.com/user/repo.git/' -> 'user/repo')."""
    clean = str(name_or_url).strip().lower()
    clean = re.sub(r"^(https?://github\.com/|git@github\.com:)", "", clean)
    clean = re.sub(r"\.git$", "", clean)
    clean = clean.strip("/")
    return clean


# --- Requirement 1 & 2: Fast Canonical Identity Deduplication ---
class GlobalClaimManager:
    """Thread-safe global repo claimer (IDs + normalized names)."""

    def __init__(self, out_file: Path, reject_file: Path):
        self.out_file = out_file
        self.reject_file = reject_file
        self.lock = threading.Lock()
        self.claimed_ids = set()
        self.claimed_names = set()
        self._load_historical()

    def _load_historical(self):
        # 1. Load accepted repos
        if self.out_file.exists():
            with self.out_file.open(encoding="utf-8", errors="ignore") as f:
                for line in f:
                    try:
                        data = json.loads(line)
                        if "id" in data:
                            self.claimed_ids.add(str(data["id"]))
                        if "full_name" in data:
                            self.claimed_names.add(normalize_repo_name(data["full_name"]))
                    except Exception:
                        continue

        # 2. Load historical rejections to avoid reprocessing
        if self.reject_file.exists():
            with self.reject_file.open(encoding="utf-8", errors="ignore") as f:
                for line in f:
                    try:
                        data = json.loads(line)
                        if "id" in data and data["id"]:
                            self.claimed_ids.add(str(data["id"]))
                        if "repo" in data and data["repo"]:
                            self.claimed_names.add(normalize_repo_name(data["repo"]))
                    except Exception:
                        continue

        print(f"🔒 Global Claim Manager initialized: {len(self.claimed_ids)} IDs & {len(self.claimed_names)} canonical names loaded.", flush=True)

    def claim_repo(self, repo_id: str | int, full_name: str) -> bool:
        sid = str(repo_id)
        cname = normalize_repo_name(full_name)
        with self.lock:
            if sid in self.claimed_ids or cname in self.claimed_names:
                return False
            self.claimed_ids.add(sid)
            self.claimed_names.add(cname)
            return True


# --- Requirement 12: Structured Rejection Logger ---
class RejectionLogger:
    """Thread-safe rejection logger to preserve structured audit trails."""

    def __init__(self, reject_file: Path):
        self.reject_file = reject_file
        self.lock = threading.Lock()

    def log_rejection(self, repo_id: str | int, full_name: str, seed: str, reason: str, stage: str, metadata: dict = None):
        entry = {
            "id": str(repo_id),
            "repo": full_name,
            "seed": seed,
            "reason": reason,
            "stage": stage,
            "stars": (metadata or {}).get("stargazers_count", 0),
            "language": (metadata or {}).get("language", ""),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        with self.lock:
            with open(self.reject_file, "a", encoding="utf-8") as f:
                f.write(json.dumps(entry) + "\n")


# --- Deterministic Query Expander ---
class QueryExpander:
    """Generates deterministic multi-term query variants."""

    FILLER_WORDS = {"starter", "template", "boilerplate", "fast", "local", "minimal", "example", "setup", "quickstart"}

    @classmethod
    def expand(cls, seed: str) -> list[str]:
        variants = [seed]

        # 1. Base clean query
        clean = re.sub(r'\b\d+(\.\d+)*\b', '', seed)
        clean = re.sub(r'\s+', ' ', clean).strip()

        # 2. Add language / topic qualifier if applicable
        words = clean.split()
        if len(words) >= 2:
            base_kw = " ".join(words[:2])
            variants.append(base_kw)
            variants.append(f"{base_kw} stars:>10")
            variants.append(f"{base_kw} stars:50..5000")
            variants.append(f"{base_kw} pushed:>2024-01-01")

        if len(words) >= 3:
            variants.append(f"{words[0]} {words[1]} {words[2]}")

        return list(dict.fromkeys(variants))[:MAX_QUERY_VARIANTS]



# --- Productivity & Stats Tracker ---
class QueryStatsTracker:
    """Tracks productivity, yield ratios, and exhaustion states per seed/query."""

    def __init__(self, stats_file: Path):
        self.stats_file = stats_file
        self.lock = threading.Lock()
        self.stats = self._load()

    def _load(self) -> dict:
        if self.stats_file.exists():
            try:
                with open(self.stats_file, encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return {}

    def save(self):
        with self.lock:
            with open(self.stats_file, "w", encoding="utf-8") as f:
                json.dump(self.stats, f, indent=2)

    def record_run(self, query: str, strategy_name: str, fetched: int, already_seen: int,
                   new_candidates: int, cheap_rejection: int, gate_rejection: int, saved: int):
        with self.lock:
            key = f"{query}::{strategy_name}"
            entry = self.stats.get(key, {
                "query": query,
                "strategy": strategy_name,
                "total_fetched": 0,
                "already_seen": 0,
                "new_candidates": 0,
                "cheap_rejections": 0,
                "gate_rejections": 0,
                "saved": 0,
                "consecutive_zero_new": 0,
                "status": "ACTIVE",
            })

            entry["total_fetched"] += fetched
            entry["already_seen"] += already_seen
            entry["new_candidates"] += new_candidates
            entry["cheap_rejections"] += cheap_rejection
            entry["gate_rejections"] += gate_rejection
            entry["saved"] += saved

            if new_candidates == 0:
                entry["consecutive_zero_new"] += 1
            else:
                entry["consecutive_zero_new"] = 0

            if entry["consecutive_zero_new"] >= EXHAUSTION_THRESHOLD:
                entry["status"] = "EXHAUSTED"
            elif fetched > 0 and (entry["new_candidates"] / entry["total_fetched"]) < LOW_YIELD_THRESHOLD:
                entry["status"] = "LOW_YIELD"
            else:
                entry["status"] = "ACTIVE"

            entry["last_updated"] = datetime.now(timezone.utc).isoformat()
            self.stats[key] = entry
        self.save()

    def is_exhausted(self, query: str, strategy_name: str) -> bool:
        with self.lock:
            key = f"{query}::{strategy_name}"
            return self.stats.get(key, {}).get("status") == "EXHAUSTED"

    def get_score(self, query: str, strategy_name: str) -> float:
        with self.lock:
            key = f"{query}::{strategy_name}"
            data = self.stats.get(key)
            if not data or data.get("total_fetched", 0) == 0:
                return 1.0  # High priority for unvisited queries
            if data.get("status") == "EXHAUSTED":
                return 0.01
            new_rate = data["new_candidates"] / data["total_fetched"]
            acceptance_rate = (data["saved"] / data["new_candidates"]) if data["new_candidates"] > 0 else 0.0
            return (new_rate * 0.5) + (acceptance_rate * 0.5)


# --- Quality Gate Implementation ---
def cheap_metadata_filter(repo: dict) -> tuple[bool, str]:
    """Requirement 9: Fast pre-fetch check using search metadata ONLY. Zero API cost."""
    stars = repo.get("stargazers_count", 0)
    forks = repo.get("forks_count", 0)

    if repo.get("archived", False):
        return False, "archived"
    if repo.get("disabled", False):
        return False, "disabled"

    has_license = bool((repo.get("license") or {}).get("spdx_id"))
    is_popular = (stars >= 50) or (forks >= 10)
    if not has_license and not is_popular:
        return False, "no real license"

    pushed_at = repo.get("pushed_at") or ""
    if pushed_at:
        try:
            pushed_dt = datetime.fromisoformat(pushed_at.replace("Z", "+00:00"))
            if (datetime.now(timezone.utc) - pushed_dt).days > 730:
                return False, f"inactive {(datetime.now(timezone.utc) - pushed_dt).days}d"
        except (ValueError, TypeError):
            pass

    return True, ""

# Backwards compatibility alias
def gate_meta(repo: dict) -> tuple[bool, str]:
    return cheap_metadata_filter(repo)



def process_single_repo(repo: dict, seed: str, gate: bool, rej_logger: RejectionLogger) -> tuple[dict | None, str]:
    """Worker task for validating candidate repo & fetching README."""
    full_name = repo["full_name"]
    repo_id = repo["id"]

    # Age check
    created = repo.get("created_at", "")
    try:
        created_dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
        if (datetime.now(timezone.utc) - created_dt).days < MIN_CREATED_DAYS:
            rej_logger.log_rejection(repo_id, full_name, seed, "too_fresh", "age_filter", repo)
            return None, "too_fresh"
    except (ValueError, TypeError):
        pass

    # Cheap metadata gate check
    if gate:
        ok, reason = cheap_metadata_filter(repo)
        if not ok:
            rej_logger.log_rejection(repo_id, full_name, seed, reason, "cheap_prefilter", repo)
            return None, reason

    # README text fetch
    readme = get_readme_raw(full_name)
    if gate and len(readme.strip()) < 200:
        rej_logger.log_rejection(repo_id, full_name, seed, "readme_too_short", "quality_gate", repo)
        return None, "README too short"

    return {
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
    }, "ok"


# --- Search Strategy Execution Pass ---
def search_strategy_pass(seed_concept: str, query: str, strategy: tuple[str, str], claim_mgr: GlobalClaimManager,
                          stats_tracker: QueryStatsTracker, rej_logger: RejectionLogger,
                          target_new: int = TARGET_NEW_CANDIDATES, gate: bool = True, dry_run: bool = False) -> dict:
    sort_field, sort_order = strategy
    strategy_name = f"{sort_field}_{sort_order}"

    if stats_tracker.is_exhausted(query, strategy_name) and not dry_run:
        return {"query": query, "strategy": strategy_name, "status": "SKIPPED_EXHAUSTED", "saved": 0}

    new_candidates = []
    already_seen_count = 0
    total_fetched = 0
    cheap_rejections = 0
    gate_rejections = 0
    saved_count = 0

    per_page = 100
    page = 1

    print(f"\n🔎 Search: query=\"{query}\" strategy={strategy_name}", flush=True)

    while len(new_candidates) < target_new and page <= MAX_PAGES_PER_QUERY:
        q_enc = urllib.parse.quote(query)
        url = (f"https://api.github.com/search/repositories?q={q_enc}"
               f"&sort={sort_field}&order={sort_order}&per_page={per_page}&page={page}")

        if dry_run:
            print(f"  [DRY-RUN] Would GET: {url}", flush=True)
            break

        data, _ = api_get(url)
        if not data or not isinstance(data, dict) or "items" not in data or not data["items"]:
            break

        items = data["items"]
        total_fetched += len(items)

        page_new = []
        for r in items:
            if claim_mgr.claim_repo(r["id"], r["full_name"]):
                ok, reason = cheap_metadata_filter(r) if gate else (True, "ok")
                if ok:
                    page_new.append(r)
                else:
                    cheap_rejections += 1
                    rej_logger.log_rejection(r["id"], r["full_name"], seed_concept, reason, "cheap_prefilter", r)
            else:
                already_seen_count += 1
                rej_logger.log_rejection(r["id"], r["full_name"], seed_concept, "duplicate", "deduplication", r)

        new_candidates.extend(page_new)
        print(f"  📦 Page {page}: {len(items)} items | ♻️ {already_seen_count} known | 🆕 {len(new_candidates)}/{target_new} new candidates", flush=True)

        time.sleep(0.1)
        page += 1


    if dry_run:
        return {"query": query, "strategy": strategy_name, "status": "DRY_RUN", "saved": 0}

    # Parallel Candidate README & Gate Worker Pool
    if new_candidates:
        with open(OUT_FILE, "a", encoding="utf-8") as out:
            with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
                future_map = {executor.submit(process_single_repo, r, seed_concept, gate, rej_logger): r for r in new_candidates}
                for future in as_completed(future_map):
                    result, reason = future.result()
                    if result:
                        out.write(json.dumps(result) + "\n")
                        out.flush()
                        saved_count += 1
                        print(f"  💾 {result['full_name']} ({result['stars']}★) — README {len(result['readme'])} chars", flush=True)
                    else:
                        gate_rejections += 1

    stats_tracker.record_run(
        query=query,
        strategy_name=strategy_name,
        fetched=total_fetched,
        already_seen=already_seen_count,
        new_candidates=len(new_candidates),
        cheap_rejection=cheap_rejections,
        gate_rejection=gate_rejections,
        saved=saved_count
    )

    new_rate = (len(new_candidates) / total_fetched * 100) if total_fetched > 0 else 0.0
    acc_rate = (saved_count / len(new_candidates) * 100) if len(new_candidates) > 0 else 0.0
    print(f"📊 Strategy Summary: {saved_count} saved | 🆕 Rate: {new_rate:.1f}% | ✅ Accept Rate: {acc_rate:.1f}%", flush=True)

    return {
        "query": query,
        "strategy": strategy_name,
        "fetched": total_fetched,
        "already_seen": already_seen_count,
        "new": len(new_candidates),
        "cheap_rejections": cheap_rejections,
        "gate_rejections": gate_rejections,
        "saved": saved_count
    }


def crawl_seed(seed: str, claim_mgr: GlobalClaimManager, stats_tracker: QueryStatsTracker,
               rej_logger: RejectionLogger, gate: bool = True, dry_run: bool = False) -> int:
    print(f"\n🌱 Seed Concept: {seed}", flush=True)
    variants = QueryExpander.expand(seed)

    print("🧠 Query Variants:", flush=True)
    for idx, v in enumerate(variants, 1):
        print(f"   {idx}. {v}", flush=True)

    total_saved_for_seed = 0

    for query in variants:
        ranked_strategies = sorted(
            SEARCH_STRATEGIES,
            key=lambda strat: stats_tracker.get_score(query, f"{strat[0]}_{strat[1]}"),
            reverse=True
        )

        for strat in ranked_strategies:
            res = search_strategy_pass(
                seed_concept=seed,
                query=query,
                strategy=strat,
                claim_mgr=claim_mgr,
                stats_tracker=stats_tracker,
                rej_logger=rej_logger,
                target_new=TARGET_NEW_CANDIDATES,
                gate=gate,
                dry_run=dry_run
            )
            total_saved_for_seed += res.get("saved", 0)

    return total_saved_for_seed


def main():
    parser = argparse.ArgumentParser(description="RepoRadar Enterprise Discovery Engine")
    parser.add_argument("--seed", help='Single seed query e.g. "fastapi 0.115 async postgresql"')
    parser.add_argument("--seeds-file", help="Path to text file with one seed query per line")
    parser.add_argument("--gate", action="store_true", help="Enable quality-gate checks")
    parser.add_argument("--loop", action="store_true", help="Run endless loop passes")
    parser.add_argument("--dry-run", action="store_true", help="Dry-run simulation mode")
    args = parser.parse_args()

    if not TOKENS and not args.dry_run:
        print("⚠️  No GITHUB_TOKEN in env — crawling unauthenticated (60 req/hr).")

    seeds = []
    if args.seeds_file:
        with open(args.seeds_file, encoding="utf-8") as f:
            seeds = [line.strip() for line in f if line.strip() and not line.startswith("#")]
    elif args.seed:
        seeds = [args.seed]
    else:
        parser.error("provide --seed or --seeds-file")

    claim_mgr = GlobalClaimManager(OUT_FILE, REJECT_FILE)
    stats_tracker = QueryStatsTracker(STATS_FILE)
    rej_logger = RejectionLogger(REJECT_FILE)

    pass_count = 1
    t_start_global = time.time()
    total_repos_saved_session = 0

    while True:
        print(f"\n🚀 Starting Crawl Pass #{pass_count} ({len(seeds)} seed concepts)...", flush=True)
        pass_saved = 0
        t0 = time.time()

        for seed in seeds:
            pass_saved += crawl_seed(seed, claim_mgr, stats_tracker, rej_logger, gate=args.gate, dry_run=args.dry_run)

        elapsed = time.time() - t0
        total_repos_saved_session += pass_saved
        hrs_elapsed = (time.time() - t_start_global) / 3600.0
        rate_per_hr = total_repos_saved_session / max(hrs_elapsed, 0.001)

        print(f"\n🏁 Pass #{pass_count} Completed in {elapsed:.1f}s: {pass_saved} new repos saved | SESSION RATE: {rate_per_hr:.1f} high-quality repos/hr → {OUT_FILE}", flush=True)

        if not args.loop or args.dry_run:
            break

        pass_count += 1
        print("🔄 Resting 5s before next pass...", flush=True)
        time.sleep(5)


if __name__ == "__main__":
    main()
