"""SQLite-backed response cache with TTL.

Key = sha256(endpoint + canonical-json(payload)). Value = JSON blob.
"""
from __future__ import annotations

import hashlib
import json
import sqlite3
import time
from pathlib import Path
from typing import Any, Optional

DEFAULT_TTL_SECONDS = 24 * 3600  # 24 h


class ResponseCache:
    def __init__(self, db_path: Path, ttl_seconds: int = DEFAULT_TTL_SECONDS):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.ttl = ttl_seconds
        self._conn = sqlite3.connect(str(self.db_path))
        self._conn.execute(
            "CREATE TABLE IF NOT EXISTS responses ("
            " key TEXT PRIMARY KEY,"
            " endpoint TEXT NOT NULL,"
            " payload TEXT NOT NULL,"
            " response TEXT NOT NULL,"
            " stored_at REAL NOT NULL"
            ")"
        )
        self._conn.commit()

    @staticmethod
    def _key(endpoint: str, payload: Any) -> str:
        canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(f"{endpoint}|{canonical}".encode()).hexdigest()

    def get(self, endpoint: str, payload: Any) -> Optional[dict]:
        key = self._key(endpoint, payload)
        row = self._conn.execute(
            "SELECT response, stored_at FROM responses WHERE key=?", (key,)
        ).fetchone()
        if row is None:
            return None
        response_json, stored_at = row
        if time.time() - stored_at > self.ttl:
            return None
        return json.loads(response_json)

    def set(self, endpoint: str, payload: Any, response: dict) -> None:
        key = self._key(endpoint, payload)
        self._conn.execute(
            "INSERT OR REPLACE INTO responses(key, endpoint, payload, response, stored_at)"
            " VALUES (?, ?, ?, ?, ?)",
            (
                key,
                endpoint,
                json.dumps(payload, sort_keys=True),
                json.dumps(response),
                time.time(),
            ),
        )
        self._conn.commit()

    def clear(self) -> None:
        self._conn.execute("DELETE FROM responses")
        self._conn.commit()
