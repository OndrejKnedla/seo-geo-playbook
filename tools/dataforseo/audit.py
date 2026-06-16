"""OnPage audit via DataForSEO OnPage API.

Flow:
1. POST /v3/on_page/task_post  -> get task_id (persisted to state file)
2. Poll /v3/on_page/tasks_ready until task_id appears (or timeout)
3. POST /v3/on_page/summary    -> structured stats

The task_id is persisted immediately after step 1, so if the process dies or
the poll times out we can recover with `audit fetch <task_id>` later.
"""
from __future__ import annotations

import json
import logging
import time
from pathlib import Path
from typing import List, Optional

from .client import DataForSEOClient
from .models import AuditIssue, AuditResult

log = logging.getLogger(__name__)

# severity mapping for the OnPage "checks" map
_SEVERITY = {
    "broken_links": "critical",
    "no_title": "critical",
    "duplicate_title": "warning",
    "no_description": "warning",
    "duplicate_description": "warning",
    "no_h1_tag": "warning",
    "high_loading_time": "warning",
    "no_image_alt": "info",
}

DEFAULT_TIMEOUT_S = 5400   # 90 min, Vite SPA + JS rendering is slow
DEFAULT_POLL_S = 30


def _post_task(
    client: DataForSEOClient,
    domain: str,
    max_pages: int,
    enable_javascript: bool = True,
) -> str:
    payload = [{
        "target": domain,
        "max_crawl_pages": max_pages,
        "load_resources": True,
        "enable_javascript": enable_javascript,
        "enable_browser_rendering": enable_javascript,
    }]
    resp = client.post("/v3/on_page/task_post", payload, use_cache=False)
    return resp["tasks"][0]["id"]


def _wait_until_ready(client: DataForSEOClient, task_id: str,
                      poll_interval: int = DEFAULT_POLL_S,
                      timeout_s: int = DEFAULT_TIMEOUT_S) -> None:
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        resp = client.get("/v3/on_page/tasks_ready")
        ready_ids = {t["id"] for t in resp.get("tasks", [{}])[0].get("result", []) or []}
        if task_id in ready_ids:
            return
        time.sleep(poll_interval)
    raise TimeoutError(f"OnPage task {task_id} not ready after {timeout_s}s")


def _fetch_summary(client: DataForSEOClient, task_id: str, domain: str) -> dict:
    payload = [{"id": task_id}]
    return client.post("/v3/on_page/summary", payload)


def _summary_to_issues(summary: dict) -> List[AuditIssue]:
    result = summary["tasks"][0]["result"][0]
    checks = result.get("page_metrics", {}).get("checks", {})
    issues: List[AuditIssue] = []
    for code, count in checks.items():
        if not count:
            continue
        severity = _SEVERITY.get(code, "info")
        for _ in range(count):
            issues.append(AuditIssue(severity=severity, code=code, url="", detail=""))
    return issues


def _summary_to_result(summary: dict) -> AuditResult:
    result = summary["tasks"][0]["result"][0]
    info = result["domain_info"]
    pm = result.get("page_metrics", {})
    total = info.get("total_pages") or 0
    # DataForSEO returns non_indexable in page_metrics; indexable = total - non_indexable
    non_indexable = pm.get("non_indexable") or 0
    pages_indexable = info.get("indexable_pages")
    if pages_indexable is None:
        pages_indexable = max(total - non_indexable, 0)
    return AuditResult(
        domain=info["name"],
        pages_total=total,
        pages_indexable=pages_indexable,
        issues=_summary_to_issues(summary),
    )


def _write_state(state_path: Path, task_id: str, domain: str) -> None:
    state_path.parent.mkdir(parents=True, exist_ok=True)
    state_path.write_text(json.dumps({
        "task_id": task_id,
        "domain": domain,
        "posted_at": time.time(),
    }))


def _read_state(state_path: Path) -> Optional[dict]:
    if not state_path.exists():
        return None
    try:
        return json.loads(state_path.read_text())
    except (json.JSONDecodeError, OSError):
        return None


def _clear_state(state_path: Path) -> None:
    if state_path.exists():
        state_path.unlink()


def start_audit(
    client: DataForSEOClient,
    *,
    domain: str,
    max_pages: int,
    state_path: Optional[Path] = None,
    enable_javascript: bool = True,
) -> str:
    """POST task and persist task_id. Returns task_id."""
    log.info("audit: posting task for %s (max_pages=%d, js=%s)",
             domain, max_pages, enable_javascript)
    task_id = _post_task(client, domain, max_pages, enable_javascript=enable_javascript)
    log.info("audit: task %s posted", task_id)
    if state_path is not None:
        _write_state(state_path, task_id, domain)
    return task_id


def fetch_audit(
    client: DataForSEOClient,
    *,
    task_id: str,
    domain: str,
    timeout_s: int = DEFAULT_TIMEOUT_S,
    state_path: Optional[Path] = None,
) -> AuditResult:
    """Poll until ready, then fetch summary. Clears state on success."""
    log.info("audit: polling task %s (timeout=%ds)", task_id, timeout_s)
    _wait_until_ready(client, task_id, timeout_s=timeout_s)
    summary = _fetch_summary(client, task_id, domain)
    result = _summary_to_result(summary)
    if state_path is not None:
        _clear_state(state_path)
    return result


def run_audit(
    client: DataForSEOClient,
    *,
    domain: str,
    max_pages: int,
    state_path: Optional[Path] = None,
    resume: bool = True,
    enable_javascript: bool = True,
    timeout_s: int = DEFAULT_TIMEOUT_S,
) -> AuditResult:
    """Start a task (or resume pending one) and wait for completion.

    If `resume=True` and a state file exists with a pending task_id for the
    same domain, re-use it instead of posting a new task.
    """
    task_id: Optional[str] = None
    if resume and state_path is not None:
        existing = _read_state(state_path)
        if existing and existing.get("domain") == domain:
            task_id = existing["task_id"]
            age = time.time() - existing.get("posted_at", 0)
            log.info("audit: resuming pending task %s (age=%.0fs)", task_id, age)

    if task_id is None:
        task_id = start_audit(
            client, domain=domain, max_pages=max_pages,
            state_path=state_path, enable_javascript=enable_javascript,
        )

    return fetch_audit(
        client, task_id=task_id, domain=domain,
        timeout_s=timeout_s, state_path=state_path,
    )
