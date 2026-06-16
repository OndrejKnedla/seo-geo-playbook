---
name: seo-geo-audit
description: Audit a live website for SEO AND GEO (Generative Engine Optimization, getting cited by ChatGPT, Perplexity, Gemini, Google AI Overviews, Claude). Crawls the SERVER-rendered HTML, runs ~26 deterministic checks via a zero-dependency script, then scores 6 content-quality dimensions by reading the pages, producing an A-F grade with a prioritized fix list. Triggers on: SEO audit, GEO audit, AI search visibility, get cited by ChatGPT/Perplexity, AEO, AI Overviews, structured data audit, llms.txt, generative engine optimization.
---

# SEO + GEO Audit

You audit a **live website** the way an AI answer engine sees it: from the **server-rendered HTML**
(what `curl` returns), not the JavaScript-rendered DOM a browser shows. The two differ, and the
gap is where most AI visibility silently dies.

The grade has two halves of equal weight:

- **Foundational (50%)**, deterministic pass/warn/fail checks run by a bundled script. Reproducible, no judgment.
- **Intelligence (50%)**, 6 content-quality dimensions **you** score by reading the pages, using `references/INTELLIGENCE-RUBRIC.md`.

`Final grade = 0.5 × foundational + 0.5 × intelligence`, mapped to A-F.

This skill produces a **diagnosis**. To then apply fixes to a codebase, hand off to the
**`seo-geo-fix`** skill. For the full battle-tested method behind the checks, read
`../../references/PLAYBOOK.md`.

## Workflow (follow in order)

### 1. Get inputs
- **URL** (required).
- **Crawl depth** (optional, default 10, max 30).
- **Output dir** (optional, default current directory).

If the user already gave a URL, don't re-ask, confirm depth and go.

### 2. Run the deterministic audit
Requires only Node 18+ (uses global `fetch`). No `npm install`.

```bash
node <skill-path>/scripts/audit.mjs <url> --max-pages=10 --out=<out-dir>/seo-geo-audit.json
```

The script crawls (sitemap + robots.txt + internal links), parses each page's **raw HTML**, runs the
checks, scores them weighted, and writes JSON + a printed summary. If it crawls 0 pages it exits
non-zero, **do not fabricate a score**, report the error.

### 3. Read the JSON report
Key fields:
- `scoring.foundationalScore` (0-100) and `scoring.foundationalGrade`, **final, do not change**.
- `scoring.categories`, score per category, worst first. The bottleneck at a glance.
- `checks`, every check with status + detail.
- `prioritizedFixes`, fails then warns, heaviest weight first.
- `pagesForReview`, up to 5 richest pages with `title`, `headings`, `schemaTypes`, `author`,
  dates, `wordCount`, and `geoSignals`. **Use these for step 4.**

### 4. Score the 6 intelligence dimensions
Read `references/INTELLIGENCE-RUBRIC.md` and score each dimension **0-5** using only what you
observed in `pagesForReview`. Write the rationale **before** the number. You are an AI agent that
just landed on this site from a web search, **would you cite it?**

Dimensions: Answer Readiness · Quotability · Evidence Density · Content Depth · Structure & Schema · Brand Authority signals.

`intelligenceScore = (sum of 6 scores / 30) × 100`.

### 5. Compute the final grade and report
```
final = round(0.5 × foundationalScore + 0.5 × intelligenceScore)
```
Grade: A ≥90, B ≥80, C ≥70, D ≥60, E ≥50, else F.

Produce a report with:
1. **The grade** (final + the foundational/intelligence split).
2. **The bottleneck** in one sentence (on-site fundamentals vs off-site authority, it is almost
   always off-site once fundamentals are clean; see `PLAYBOOK.md` §1).
3. **Prioritized fixes** (Critical / High / Medium / Low). Each: what / where (file or URL) / why /
   how to verify (a falsifiable `curl` or GSC check).
4. **The off-site note**: the on-page score caps fast; the ceiling is brand mentions
   (YouTube > Reddit ≈ Wikipedia > LinkedIn > PR). Say so explicitly.

Optionally render `assets/report-template.html` filled with the JSON for a shareable report.

### Optional: chunk-level retrieval simulation
AI engines retrieve at the passage level, not the page level. `scripts/chunk-sim.mjs <url>` splits the
page the way a RAG pipeline would and scores each chunk's standalone citability, flagging blocks that
would be useless if retrieved alone (open with a pronoun/connective, no named subject, no concrete
signal). Use it to action strategy 1 in `../../references/geo-frontier-strategies.md`.

### Optional: enrich with live SERP data
The audit is zero-dependency and measures citability/crawlability, not ranking. To add real ranking
data, `scripts/serp-enrich.mjs` calls DataForSEO if `DATAFORSEO_LOGIN`/`DATAFORSEO_PASSWORD` are set
(it exits cleanly with setup notes if not). Free alternative: Google Search Console. See
`../../references/data-providers.md`. Keep enrichment separate so the A-F foundational score stays
reproducible without any key.

## The checks (what the script verifies)
See `references/RULES.md` for the full catalog with weights. Highlights that catch the silent killers:
- **JSON-LD in the server HTML** (not injected client-side, the single most common AI-visibility bug).
- **Self-referencing canonical** + detection of the "everything canonicalizes to homepage" root-layout bug.
- **AI crawlers not blocked** in robots.txt (GPTBot, OAI-SearchBot, PerplexityBot, ClaudeBot, Google-Extended…).
- One `<h1>`, host consistency, sitemap, `llms.txt`, answer-first/TL;DR, question headings, evidence density, freshness, named author.

## Reference files (read on demand)
Pull these in when relevant; do not load them all up front.
- `references/RULES.md`: the full deterministic check catalog with weights and `curl` verifications.
- `references/INTELLIGENCE-RUBRIC.md`: the 6-dimension scoring rubric for the intelligence half.
- `../../references/PLAYBOOK.md`: the full field method and every gotcha behind the checks.
- `../../references/statistics-2026.md`: sourced, dated GEO data and citation-lift multipliers (and what was debunked). Use it to justify recommendations.
- `../../references/ai-crawlers.md`: the exact AI crawler user-agents and robots.txt handling, for the `ai-bots-allowed` finding.
- `../../references/platform-profiles/`: how each engine (ChatGPT, Perplexity, Gemini, Claude, AI Overviews) retrieves and cites, so fixes target the right mechanism.
- `../../references/geo-frontier-strategies.md`: seven retrieval-mechanic GEO strategies, including the chunk-level approach behind `scripts/chunk-sim.mjs`.
- `../../references/tactics-spectrum.md`: the white/gray/black-hat map; stay white-hat and recognize the rest.
- `../../references/data-providers.md` and `../../tools/dataforseo/`: optional real SERP/keyword/rank data.

## Guardrails when writing the report or content
No em-dashes (commas, colons, parentheses instead). No emojis in client-facing copy. In
finance/health/legal, minimize "AI" hype (it reads as a negative signal there). Never expose the
client's internal tech/vendors. Measure live with `curl`, never quote scores from memory.
