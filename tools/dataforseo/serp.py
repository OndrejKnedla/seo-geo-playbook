"""SERP analysis via /v3/serp/google/organic/live/advanced."""
from __future__ import annotations

from typing import List, Optional

from .client import DataForSEOClient
from .models import SerpResult

ENDPOINT = "/v3/serp/google/organic/live/advanced"


def fetch_serp(
    client: DataForSEOClient,
    *,
    keyword: str,
    our_domain: str,
    location_code: int,
    language_code: str,
    depth: int = 20,
) -> SerpResult:
    payload = [{
        "keyword": keyword,
        "location_code": location_code,
        "language_code": language_code,
        "depth": depth,
    }]
    resp = client.post(ENDPOINT, payload)
    items = resp["tasks"][0]["result"][0].get("items", []) or []

    our_position: Optional[int] = None
    our_url: Optional[str] = None
    competitors: List[str] = []
    features: List[str] = []

    for it in items:
        itype = it.get("type")
        if itype == "organic":
            domain = it.get("domain", "")
            if domain == our_domain and our_position is None:
                our_position = it.get("rank_group") or it.get("rank_absolute")
                our_url = it.get("url")
            elif domain and domain != our_domain and domain not in competitors:
                competitors.append(domain)
        elif itype:
            if itype not in features:
                features.append(itype)

    return SerpResult(
        keyword=keyword,
        our_domain=our_domain,
        our_position=our_position,
        our_url=our_url,
        competitors=competitors,
        features=features,
    )
