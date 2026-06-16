---
name: seo-geo-fix
description: Apply ONE targeted SEO/GEO fix to a codebase as a small, reviewable PR. Takes a finding from seo-geo-audit and implements the change (metadata, canonical, SSR JSON-LD, schema, headings, llms.txt) without touching business logic or design. One fix per run, quality over quantity. Triggers on: fix SEO, implement SEO fix, add schema markup, fix canonical, add JSON-LD, fix llms.txt, SEO PR.
---

# Apply an SEO/GEO fix

You implement **one** targeted fix from an audit, as a **small PR**. One fix per run. Never push to
the default branch, never deploy, never touch business logic, pricing, legal text, the API, or the
visual design, only SEO/GEO metadata and content. When in doubt, return the proposal as text instead
of opening a PR.

## Workflow

1. **Pick one finding** from the `seo-geo-audit` report (start with the heaviest-weight FAIL). Examples:
   - JSON-LD rendered client-side → move to a plain `<script type="application/ld+json">` in the server component.
   - A deep page canonicalizing to `/` → add a self-referencing canonical to its `metadata`.
   - Missing/weak title or description → write a specific one (30-65 char title, 120-160 char description).
   - No question-style headings / answer-first block → restructure the top of the page.
   - Missing `Organization`/`FAQPage`/`Article` schema → add it (matching the visible content). Copy-paste starting points: `references/schema-library.md`.
   - `llms.txt` inconsistent with the site → reconcile.

2. **Find the file that actually renders the page** before editing. Confirm locally
   (`next start` / dev server) which file serves the route, editing the wrong template is the most
   common wasted change. (See `PLAYBOOK.md` §2.5.)

3. **Make the minimal change.** Match the surrounding code's style. Keep tone factual: no emojis, no
   em-dashes, minimal "AI" hype in finance/health/legal, never expose internal tech/vendors.

4. **Verify with `curl`, not the browser** (SSR vs client render):
   ```bash
   # after building/serving locally:
   curl -s localhost:3000/route | grep -oP 'canonical href="[^"]*"'
   curl -s localhost:3000/route | grep -c 'application/ld+json'
   ```
   Confirm the change is in the **server HTML**.

5. **Open a small PR** (never to the default branch, never `--no-verify`):
   ```bash
   git checkout -b seo/<short-description>
   git add -A && git commit -m "seo: <what and why>"
   git push -u origin seo/<short-description>
   gh pr create --title "SEO: <what>" --body "Change: <...>. Page/file: <...>. Why: <...>. Verify: <curl command + expected output>."
   ```
   Return the PR number and a two-sentence summary.

## Stop conditions
If the fix would reach beyond SEO/GEO metadata and content, or you're unsure of its impact, **do not
make it**, return the recommendation as text. A skipped risky change beats a shipped wrong one. For a
strict pre-merge gate, use the reviewer agent in `../../agents/reviewer-agent.md`.

## Reference files (read on demand)
- `references/schema-library.md`: copy-paste JSON-LD for the common types.
- `../../references/PLAYBOOK.md`: the gotchas behind most fixes (SSR JSON-LD, canonical, host, noindex).
- `../../references/ai-crawlers.md`: correct robots.txt handling when the fix touches crawler access.
- `../../references/tactics-spectrum.md`: the white-hat boundary; never implement gray/black-hat changes.
