"""Shared dataclasses for cross-module values."""
from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel


class AuditIssue(BaseModel):
    severity: str           # "critical" | "warning" | "info"
    code: str               # e.g. "no_title", "duplicate_description"
    url: str
    detail: str = ""


class AuditResult(BaseModel):
    domain: str
    pages_total: int
    pages_indexable: int
    issues: List[AuditIssue]

    def issues_by_severity(self) -> dict[str, list[AuditIssue]]:
        out: dict[str, list[AuditIssue]] = {"critical": [], "warning": [], "info": []}
        for i in self.issues:
            out.setdefault(i.severity, []).append(i)
        return out


class KeywordRow(BaseModel):
    keyword: str
    volume: Optional[int] = None
    cpc: Optional[float] = None
    competition: Optional[float] = None
    intent: Optional[str] = None     # informational | commercial | …
    source_seed: Optional[str] = None


class SerpResult(BaseModel):
    keyword: str
    our_domain: str
    our_position: Optional[int] = None
    our_url: Optional[str] = None
    competitors: List[str]           # domains in TOP 10 (excluding ours)
    features: List[str]              # featured_snippet, people_also_ask, etc.


class RankedKeyword(BaseModel):
    keyword: str
    position: int
    url: str
    volume: Optional[int] = None


class CompetitorOverlap(BaseModel):
    domain: str
    overlap_keywords: int
    avg_position: Optional[float] = None


class ContentGap(BaseModel):
    keyword: str
    volume: Optional[int]
    competitor_url: str
    competitor_position: int
