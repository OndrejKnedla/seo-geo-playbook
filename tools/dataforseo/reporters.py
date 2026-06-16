"""Render typed data into six markdown reports via Jinja2."""
from __future__ import annotations

from collections import Counter
from datetime import date
from pathlib import Path
from typing import List

from jinja2 import Environment, FileSystemLoader, select_autoescape

from .models import (
    AuditResult, KeywordRow, RankedKeyword,
    CompetitorOverlap, ContentGap,
)

TEMPLATES_DIR = Path(__file__).parent / "templates"


def score_keyword(k: KeywordRow) -> float:
    """volume / (1 + competition); 0 when no volume known."""
    if not k.volume:
        return 0.0
    comp = k.competition if k.competition is not None else 0.0
    return float(k.volume) / (1.0 + comp)


def _env() -> Environment:
    return Environment(
        loader=FileSystemLoader(str(TEMPLATES_DIR)),
        autoescape=select_autoescape([]),
        trim_blocks=False,
        lstrip_blocks=False,
    )


def _render(env: Environment, name: str, ctx: dict) -> str:
    return env.get_template(name).render(**ctx)


def _top_actions(audit: AuditResult, ranked: List[RankedKeyword],
                 keywords_scored: List[KeywordRow], gaps: List[ContentGap]) -> List[str]:
    actions: List[str] = []
    by_sev = audit.issues_by_severity()
    if by_sev["critical"]:
        codes = sorted({i.code for i in by_sev["critical"]})
        actions.append(f"Oprav kritické technické chyby: {', '.join(codes)}.")
    close_to_top10 = [r for r in ranked if 11 <= r.position <= 20]
    if close_to_top10:
        sample = ", ".join(r.keyword for r in close_to_top10[:3])
        actions.append(f"Push KW těsně pod TOP 10 (např. {sample}), interní prolinkování + delší obsah.")
    if keywords_scored:
        top = keywords_scored[0]
        actions.append(f"Vytvoř obsah pro '{top.keyword}' (objem {top.volume}/měs.).")
    if gaps:
        big = [g for g in gaps if (g.volume or 0) >= 500][:3]
        if big:
            actions.append("Pokryj content gaps: " + ", ".join(g.keyword for g in big) + ".")
    while len(actions) < 5:
        actions.append("-")
    return actions[:5]


def render_reports(
    *,
    out_dir: Path,
    run_date: date,
    domain: str,
    audit: AuditResult,
    keywords: List[KeywordRow],
    ranked: List[RankedKeyword],
    competitors: List[CompetitorOverlap],
    gaps: List[ContentGap],
) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    env = _env()

    keywords_scored = sorted(
        [k.model_copy(update={}) for k in keywords],
        key=score_keyword,
        reverse=True,
    )
    keywords_for_template = []
    for k in keywords_scored:
        d = k.model_dump()
        d["score"] = score_keyword(k)
        keywords_for_template.append(d)

    by_sev = audit.issues_by_severity()

    common = {
        "domain": domain,
        "run_date": run_date.isoformat(),
    }

    # 01 audit
    (out_dir / "01-audit-summary.md").write_text(_render(env, "01-audit-summary.md.j2", {
        **common,
        "audit": audit,
        "by_severity": by_sev,
        "critical_counts": dict(Counter(i.code for i in by_sev["critical"])),
        "warning_counts": dict(Counter(i.code for i in by_sev["warning"])),
        "info_counts": dict(Counter(i.code for i in by_sev["info"])),
    }))

    # 02 rankings
    (out_dir / "02-current-rankings.md").write_text(_render(env, "02-current-rankings.md.j2", {
        **common,
        "ranked": ranked,
    }))

    # 03 opportunities
    (out_dir / "03-keyword-opportunities.md").write_text(_render(env, "03-keyword-opportunities.md.j2", {
        **common,
        "keywords": keywords_for_template,
    }))

    # 04 competitors
    (out_dir / "04-competitors.md").write_text(_render(env, "04-competitors.md.j2", {
        **common,
        "competitors": competitors,
    }))

    # 05 gaps
    (out_dir / "05-content-gaps.md").write_text(_render(env, "05-content-gaps.md.j2", {
        **common,
        "gaps": sorted(gaps, key=lambda g: g.volume or 0, reverse=True),
    }))

    # 00 executive summary
    top10 = [r for r in ranked if r.position <= 10]
    (out_dir / "00-executive-summary.md").write_text(_render(env, "00-executive-summary.md.j2", {
        **common,
        "audit": audit,
        "critical_count": len(by_sev["critical"]),
        "ranked_count": len(ranked),
        "top10_count": len(top10),
        "opportunities_count": len(keywords),
        "top_actions": _top_actions(audit, ranked, keywords_scored, gaps),
    }))
