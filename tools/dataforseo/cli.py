"""Command-line entrypoint.

Examples:
    python -m dataforseo run
    python -m dataforseo audit
    python -m dataforseo keywords
"""
from __future__ import annotations

import argparse
import logging
from datetime import date
from pathlib import Path

from .audit import fetch_audit, run_audit, start_audit
from .cache import ResponseCache
from .client import DataForSEOClient
from .competitors import discover_competitors, find_content_gaps
from .config import load_credentials, load_site_config
from .keywords import research_keywords, ranked_keywords_for_domain
from .reporters import render_reports
from .serp import fetch_serp

ROOT = Path(__file__).parent
SITE_YAML = ROOT / "site.yaml"
CACHE_DB = ROOT / "cache" / "raw.sqlite"
AUDIT_STATE = ROOT / "cache" / "audit_state.json"
REPORTS_DIR = ROOT / "reports"
LOGS_DIR = ROOT / "logs"


def _setup_logging() -> None:
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    logfile = LOGS_DIR / f"dataforseo-{date.today().isoformat()}.log"
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
        handlers=[
            logging.FileHandler(logfile),
            logging.StreamHandler(),
        ],
    )


def _build_client() -> DataForSEOClient:
    creds = load_credentials(dotenv_path=ROOT / ".env")
    cache = ResponseCache(CACHE_DB)
    return DataForSEOClient(creds, cache)


def cmd_run(args: argparse.Namespace) -> int:
    _setup_logging()
    log = logging.getLogger("dataforseo.cli")
    site = load_site_config(SITE_YAML)
    client = _build_client()

    log.info("== AUDIT ==")
    audit = run_audit(
        client, domain=site.domain, max_pages=site.max_crawl_pages,
        state_path=AUDIT_STATE,
    )

    log.info("== KEYWORD RESEARCH ==")
    kws = research_keywords(
        client, seeds=site.keyword_seeds,
        location_code=site.location_code, language_code=site.language_code,
    )

    log.info("== RANKED KEYWORDS ==")
    ranked = ranked_keywords_for_domain(
        client, domain=site.domain,
        location_code=site.location_code, language_code=site.language_code,
    )

    log.info("== COMPETITORS ==")
    competitors = discover_competitors(
        client, our_domain=site.domain,
        location_code=site.location_code, language_code=site.language_code,
    )

    log.info("== CONTENT GAPS ==")
    gaps = find_content_gaps(
        client, our_domain=site.domain,
        competitor_domains=site.competitors,
        location_code=site.location_code, language_code=site.language_code,
        relevance_whitelist=site.content_gaps_whitelist,
        relevance_blacklist=site.content_gaps_blacklist,
    )

    out_dir = REPORTS_DIR / date.today().isoformat()
    log.info("== RENDER REPORTS to %s ==", out_dir)
    render_reports(
        out_dir=out_dir,
        run_date=date.today(),
        domain=site.domain,
        audit=audit,
        keywords=kws,
        ranked=ranked,
        competitors=competitors,
        gaps=gaps,
    )
    log.info("DONE, reports in %s", out_dir)
    return 0


def cmd_audit(args: argparse.Namespace) -> int:
    _setup_logging()
    site = load_site_config(SITE_YAML)
    client = _build_client()
    res = run_audit(
        client, domain=site.domain, max_pages=site.max_crawl_pages,
        state_path=AUDIT_STATE,
    )
    print(f"pages_total={res.pages_total} indexable={res.pages_indexable} issues={len(res.issues)}")
    return 0


def cmd_audit_start(args: argparse.Namespace) -> int:
    _setup_logging()
    site = load_site_config(SITE_YAML)
    client = _build_client()
    task_id = start_audit(
        client, domain=site.domain, max_pages=site.max_crawl_pages,
        state_path=AUDIT_STATE,
    )
    print(f"task_id={task_id}")
    return 0


def cmd_audit_fetch(args: argparse.Namespace) -> int:
    _setup_logging()
    site = load_site_config(SITE_YAML)
    client = _build_client()
    res = fetch_audit(
        client, task_id=args.task_id, domain=site.domain,
        state_path=AUDIT_STATE,
    )
    print(f"pages_total={res.pages_total} indexable={res.pages_indexable} issues={len(res.issues)}")
    return 0


def cmd_keywords(args: argparse.Namespace) -> int:
    _setup_logging()
    site = load_site_config(SITE_YAML)
    client = _build_client()
    rows = research_keywords(
        client, seeds=site.keyword_seeds,
        location_code=site.location_code, language_code=site.language_code,
    )
    for r in rows[:30]:
        print(f"{r.keyword:50s} vol={r.volume}  comp={r.competition}")
    print(f"\n{len(rows)} keywords total.")
    return 0


def cmd_rank_diff(args: argparse.Namespace) -> int:
    """Compare ranked keywords between two report dates."""
    import json
    old_dir = REPORTS_DIR / args.old_date
    new_dir = REPORTS_DIR / args.new_date
    if not old_dir.exists():
        print(f"ERROR: no reports for {args.old_date} in {REPORTS_DIR}")
        return 1
    if not new_dir.exists():
        print(f"ERROR: no reports for {args.new_date} in {REPORTS_DIR}")
        return 1

    def _parse_rankings(report_dir):
        path = report_dir / "02-current-rankings.md"
        if not path.exists():
            return {}
        rankings = {}
        for line in path.read_text().splitlines():
            if line.startswith("| ") and not line.startswith("| #") and not line.startswith("|---"):
                parts = [p.strip() for p in line.split("|")[1:-1]]
                if len(parts) >= 4:
                    try:
                        kw = parts[1]
                        pos = int(parts[2])
                        rankings[kw] = pos
                    except (ValueError, IndexError):
                        continue
        return rankings

    old_ranks = _parse_rankings(old_dir)
    new_ranks = _parse_rankings(new_dir)
    all_kws = sorted(set(old_ranks) | set(new_ranks))

    if not all_kws:
        print("No ranked keywords found in either report.")
        return 0

    print(f"\n{'Keyword':<50s} {'Old':>5s} {'New':>5s} {'Diff':>6s}")
    print("-" * 65)

    improved = 0
    declined = 0
    new_entries = 0
    lost = 0

    for kw in all_kws:
        old_pos = old_ranks.get(kw)
        new_pos = new_ranks.get(kw)

        old_str = str(old_pos) if old_pos else "-"
        new_str = str(new_pos) if new_pos else "-"

        if old_pos and new_pos:
            diff = old_pos - new_pos
            diff_str = f"+{diff}" if diff > 0 else str(diff)
            if diff > 0:
                improved += 1
            elif diff < 0:
                declined += 1
        elif new_pos and not old_pos:
            diff_str = "NEW"
            new_entries += 1
        elif old_pos and not new_pos:
            diff_str = "LOST"
            lost += 1
        else:
            diff_str = ""

        print(f"{kw:<50s} {old_str:>5s} {new_str:>5s} {diff_str:>6s}")

    print(f"\nSummary: {improved} improved, {declined} declined, {new_entries} new, {lost} lost")
    return 0


def _resolve_paths(args: argparse.Namespace):
    """Override module-level paths when --site is provided."""
    global SITE_YAML, CACHE_DB, AUDIT_STATE, REPORTS_DIR, LOGS_DIR
    if hasattr(args, 'site') and args.site:
        site_dir = Path(args.site).resolve().parent
        SITE_YAML = Path(args.site).resolve()
        CACHE_DB = site_dir / "cache" / "raw.sqlite"
        AUDIT_STATE = site_dir / "cache" / "audit_state.json"
        REPORTS_DIR = site_dir / "reports"
        LOGS_DIR = site_dir / "logs"


def main() -> int:
    parser = argparse.ArgumentParser(prog="dataforseo")
    parser.add_argument("--site", help="path to site.yaml (default: module-local site.yaml)")
    sub = parser.add_subparsers(dest="cmd", required=True)
    sub.add_parser("run", help="full pipeline").set_defaults(func=cmd_run)
    sub.add_parser("audit", help="OnPage audit only (blocking)").set_defaults(func=cmd_audit)
    sub.add_parser("audit-start", help="POST audit task and return task_id").set_defaults(func=cmd_audit_start)
    p_fetch = sub.add_parser("audit-fetch", help="poll+fetch an existing audit task_id")
    p_fetch.add_argument("task_id")
    p_fetch.set_defaults(func=cmd_audit_fetch)
    sub.add_parser("keywords", help="keyword research only").set_defaults(func=cmd_keywords)
    p_diff = sub.add_parser("rank-diff", help="compare rankings between two dates")
    p_diff.add_argument("old_date", help="YYYY-MM-DD of baseline report")
    p_diff.add_argument("new_date", help="YYYY-MM-DD of new report")
    p_diff.set_defaults(func=cmd_rank_diff)
    args = parser.parse_args()
    _resolve_paths(args)
    return args.func(args)
