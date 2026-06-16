"""Configuration: DataForSEO credentials (.env) and per-site config (YAML).

Credentials come from the environment (or a .env file): DATAFORSEO_LOGIN and
DATAFORSEO_PASSWORD. Per-site settings come from site.yaml (copy site.example.yaml).
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import List, Optional

from pydantic import BaseModel, Field

try:
    from dotenv import load_dotenv
except ImportError:  # python-dotenv is optional; env vars still work
    load_dotenv = None


class Credentials(BaseModel):
    """DataForSEO Basic-auth credentials."""
    login: str
    password: str


class SiteConfig(BaseModel):
    """Per-site settings read from site.yaml."""
    domain: str
    location_code: int = 2840          # 2840 = United States
    language_code: str = "en"
    max_crawl_pages: int = 100
    keyword_seeds: List[str] = Field(default_factory=list)
    competitors: List[str] = Field(default_factory=list)
    content_gaps_whitelist: List[str] = Field(default_factory=list)
    content_gaps_blacklist: List[str] = Field(default_factory=list)


def load_credentials(dotenv_path: Optional[Path] = None) -> Credentials:
    """Load DataForSEO credentials from the environment or a .env file."""
    if load_dotenv:
        if dotenv_path and Path(dotenv_path).exists():
            load_dotenv(dotenv_path)
        else:
            load_dotenv()
    login = os.environ.get("DATAFORSEO_LOGIN")
    password = os.environ.get("DATAFORSEO_PASSWORD")
    if not login or not password:
        raise SystemExit(
            "Missing DataForSEO credentials. Set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD "
            "in the environment or a .env file (see .env.example)."
        )
    return Credentials(login=login, password=password)


def load_site_config(path) -> SiteConfig:
    """Load per-site settings from a YAML file."""
    import yaml

    p = Path(path)
    if not p.exists():
        raise SystemExit(
            f"Site config not found: {p}. Copy site.example.yaml to site.yaml and edit it."
        )
    data = yaml.safe_load(p.read_text(encoding="utf-8")) or {}
    return SiteConfig(**data)
