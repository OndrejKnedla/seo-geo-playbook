"""Keyword research wrappers.

Endpoints:
- /v3/dataforseo_labs/google/keyword_suggestions/live  (variations of a seed)
- /v3/dataforseo_labs/google/ranked_keywords/live      (KW that a domain ranks for)
"""
from __future__ import annotations

from typing import List

from .client import DataForSEOClient
from .models import KeywordRow, RankedKeyword

KW_SUGGESTIONS = "/v3/dataforseo_labs/google/keyword_suggestions/live"
RANKED_KEYWORDS = "/v3/dataforseo_labs/google/ranked_keywords/live"


def research_keywords(
    client: DataForSEOClient,
    *,
    seeds: List[str],
    location_code: int,
    language_code: str,
    limit: int = 100,
) -> List[KeywordRow]:
    rows: List[KeywordRow] = []
    for seed in seeds:
        payload = [{
            "keyword": seed,
            "location_code": location_code,
            "language_code": language_code,
            "limit": limit,
            "include_serp_info": False,
        }]
        resp = client.post(KW_SUGGESTIONS, payload)
        items = resp["tasks"][0]["result"][0].get("items", []) or []
        for it in items:
            ki = it.get("keyword_info") or {}
            sii = it.get("search_intent_info") or {}
            rows.append(KeywordRow(
                keyword=it["keyword"],
                volume=ki.get("search_volume"),
                cpc=ki.get("cpc"),
                competition=ki.get("competition"),
                intent=sii.get("main_intent"),
                source_seed=seed,
            ))
    return rows


def ranked_keywords_for_domain(
    client: DataForSEOClient,
    *,
    domain: str,
    location_code: int,
    language_code: str,
    limit: int = 1000,
) -> List[RankedKeyword]:
    payload = [{
        "target": domain,
        "location_code": location_code,
        "language_code": language_code,
        "limit": limit,
        "load_rank_absolute": True,
    }]
    resp = client.post(RANKED_KEYWORDS, payload)
    items = resp["tasks"][0]["result"][0].get("items", []) or []
    out: List[RankedKeyword] = []
    for it in items:
        kd = it["keyword_data"]
        rs = it["ranked_serp_element"]["serp_item"]
        out.append(RankedKeyword(
            keyword=kd["keyword"],
            position=rs["rank_absolute"],
            url=rs["url"],
            volume=kd.get("keyword_info", {}).get("search_volume"),
        ))
    return out
