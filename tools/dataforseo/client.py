"""Thin authenticated HTTP wrapper around DataForSEO REST API.

- Basic auth from Credentials
- Optional response cache (skipped when use_cache=False)
- Maps non-20000 status_code into DataForSEOError
- Retries transport errors 3x with exponential backoff
"""
from __future__ import annotations

import base64
import logging
import time
from typing import Optional

import requests

from .cache import ResponseCache
from .config import Credentials

BASE_URL = "https://api.dataforseo.com"
log = logging.getLogger(__name__)


class DataForSEOError(RuntimeError):
    """Raised when API responds with status_code != 20000."""


class DataForSEOClient:
    def __init__(self, credentials: Credentials, cache: Optional[ResponseCache] = None):
        token = base64.b64encode(
            f"{credentials.login}:{credentials.password}".encode()
        ).decode()
        self._headers = {
            "Authorization": f"Basic {token}",
            "Content-Type": "application/json",
        }
        self._cache = cache

    def post(
        self,
        endpoint: str,
        payload: list[dict],
        *,
        use_cache: bool = True,
    ) -> dict:
        if use_cache and self._cache is not None:
            cached = self._cache.get(endpoint, payload)
            if cached is not None:
                log.debug("cache hit: %s", endpoint)
                return cached

        data = self._request("POST", endpoint, json=payload)
        self._raise_if_error(endpoint, data)
        if self._cache is not None:
            self._cache.set(endpoint, payload, data)
        return data

    def get(self, endpoint: str) -> dict:
        data = self._request("GET", endpoint)
        self._raise_if_error(endpoint, data)
        return data

    def _request(self, method: str, endpoint: str, **kwargs) -> dict:
        url = f"{BASE_URL}{endpoint}"
        last_exc: Optional[Exception] = None
        for attempt in range(3):
            try:
                resp = requests.request(
                    method, url, headers=self._headers, timeout=60, **kwargs
                )
                resp.raise_for_status()
                return resp.json()
            except requests.HTTPError as e:
                status = e.response.status_code if e.response is not None else 0
                if 400 <= status < 500:
                    raise DataForSEOError(
                        f"{endpoint} HTTP {status}: {e.response.text[:200] if e.response is not None else ''}"
                    ) from e
                last_exc = e
            except requests.RequestException as e:
                last_exc = e
            wait = 2 ** attempt
            log.warning("request failed (attempt %d): %s; sleeping %ds", attempt + 1, last_exc, wait)
            time.sleep(wait)
        raise DataForSEOError(f"transport failed for {endpoint}: {last_exc}")

    @staticmethod
    def _raise_if_error(endpoint: str, data: dict) -> None:
        status = data.get("status_code")
        if status != 20000:
            raise DataForSEOError(
                f"{endpoint} returned status_code={status} message={data.get('status_message')!r}"
            )
