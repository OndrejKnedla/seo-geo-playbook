"""Competitor discovery and content-gap analysis."""
from __future__ import annotations

from typing import Iterable, List, Optional

from .client import DataForSEOClient
from .models import CompetitorOverlap, ContentGap

COMPETITORS = "/v3/dataforseo_labs/google/competitors_domain/live"
DOMAIN_INTERSECTION = "/v3/dataforseo_labs/google/domain_intersection/live"


def _is_relevant(
    keyword: str,
    whitelist: Optional[Iterable[str]],
    blacklist: Optional[Iterable[str]],
) -> bool:
    """Case-insensitive substring match. None whitelist = everything passes (subject to blacklist)."""
    kw = keyword.lower()
    if blacklist:
        if any(b.lower() in kw for b in blacklist):
            return False
    if whitelist:
        return any(w.lower() in kw for w in whitelist)
    return True


def discover_competitors(
    client: DataForSEOClient,
    *,
    our_domain: str,
    location_code: int,
    language_code: str,
    limit: int = 20,
) -> List[CompetitorOverlap]:
    payload = [{
        "target": our_domain,
        "location_code": location_code,
        "language_code": language_code,
        "limit": limit,
    }]
    resp = client.post(COMPETITORS, payload)
    items = resp["tasks"][0]["result"][0].get("items", []) or []
    return [
        CompetitorOverlap(
            domain=it["domain"],
            overlap_keywords=it.get("intersections", 0),
            avg_position=it.get("avg_position"),
        )
        for it in items
    ]


def find_content_gaps(
    client: DataForSEOClient,
    *,
    our_domain: str,
    competitor_domains: List[str],
    location_code: int,
    language_code: str,
    limit: int = 200,
    relevance_whitelist: Optional[Iterable[str]] = None,
    relevance_blacklist: Optional[Iterable[str]] = None,
) -> List[ContentGap]:
    if not competitor_domains:
        return []
    gaps: List[ContentGap] = []
    for competitor in competitor_domains:
        payload = [{
            "target1": competitor,
            "target2": our_domain,
            "location_code": location_code,
            "language_code": language_code,
            "intersections": False,   # we want what target1 has that target2 doesn't
            "limit": limit,
        }]
        resp = client.post(DOMAIN_INTERSECTION, payload)
        items = resp["tasks"][0]["result"][0].get("items", []) or []
        for it in items:
            kd = it["keyword_data"]
            cs = it.get("first_domain_serp_element", {})
            gaps.append(ContentGap(
                keyword=kd["keyword"],
                volume=kd.get("keyword_info", {}).get("search_volume"),
                competitor_url=cs.get("url", ""),
                competitor_position=cs.get("rank_absolute", 0),
            ))
    gaps = [g for g in gaps if _is_relevant(g.keyword, relevance_whitelist, relevance_blacklist)]
    return gaps
