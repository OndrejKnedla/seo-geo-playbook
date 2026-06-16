---
name: track-ai-citations
description: Establish and re-run an AI-citation baseline, does ChatGPT, Perplexity, Gemini, or Google AI Overviews actually cite this brand? Builds a fixed query set, runs it incognito, tracks a single "did it cite us?" column at day 0 / +30 / +90, and reports the trend. The only honest way to know if GEO work is paying off. Triggers on: AI citation tracking, AI visibility tracking, am I cited by ChatGPT, Perplexity ranking, GEO measurement, AI rank tracking, share of voice in AI.
---

# Track AI citations

You can't manage what you don't measure. Vendor "AI visibility scores" are opaque; this is the
rigorous DIY method that produced the measured 13% → 22% → 30% curve in `../../references/GEO-ADOPTION.md`.

## Method

### 1. Build a fixed query set (~30 prompts)
The set is **fixed** so re-tests are comparable. Mix four buckets:
- **Branded** (5): "What is <brand>?", "<brand> vs <competitor>", "Is <brand> good for X?"
- **Category / high-value** (10): the broad terms you want to win ("best <category> tool for <audience>").
- **Problem / question** (10): how real users phrase the need ("how do I <job-to-be-done>?").
- **Long-tail / niche** (5): specific, lower-volume, where a young brand can win first.

Save them to `assets/queries-template.csv` (copy it, fill the `query` column).

### 2. Run the set, incognito, per engine
For each query, in a **logged-out / incognito** session (personalization skews results), record one thing:
**did the answer cite or recommend the brand? yes/no**, plus which competitors it cited instead.
Engines to cover: ChatGPT (Search), Perplexity, Google AI Overviews, Gemini, Claude. Note: Claude is a
**conservative citer** and Perplexity an aggressive one, track each engine in its own column, don't average blindly.

> Tip: a scraping tool (Firecrawl etc.) or the engines' own APIs can automate this, but a manual pass
> of 30 queries takes ~30 minutes and is more trustworthy. Keep raw screenshots/links for evidence.

### 3. Score and store
`citation rate = (queries citing the brand) / (total queries)`, per engine and overall.
Append a dated row to `assets/citation-log.csv`. **Never overwrite history**, the trend is the point.

### 4. Re-test on a schedule
Re-run the **same** set at **+30** and **+90** days. Expect the shape from GEO-ADOPTION.md:
- On-page fixes (SSR JSON-LD, canonical, schema, citable structure) move the line **fast**, then plateau.
- The climb past the plateau is bought **off-site** (brand mentions: YouTube > Reddit ≈ Wikipedia > LinkedIn > PR), not with more pages.

### 5. Report
- Citation rate per engine, with the delta vs the previous checkpoint.
- Which queries flipped from no→yes (what's working) and yes→no (regressions / volatility).
- Which competitors keep getting cited where you don't (the gap to close).
- The honest verdict: if on-page is clean and the line has plateaued, **the bottleneck is off-site authority**, stop writing pages, start earning mentions.

## Output
Hand the trend to `geo-charts` to render the citation-rate line for a shareable report.

## Reference files (read on demand)
- `../../references/platform-profiles/`: how each engine cites (Perplexity passage-level, ChatGPT position bias, Claude conservative, Google AI Mode fan-out), so you read each engine's column correctly.
- `../../references/statistics-2026.md`: per-platform citation behavior and the off-site signal weights.
- `../../references/GEO-ADOPTION.md`: the baseline curve and re-test protocol this method produced.
