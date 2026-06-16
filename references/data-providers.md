# Data providers: adding real SERP / keyword / rank data (optional)

## What the core does today
The audit is **zero-dependency by design**. It reads only what an AI crawler reads, the server HTML,
robots.txt, and sitemap, over `fetch`. No API keys, no SaaS, fully reproducible anywhere Node runs.

**What that means it does NOT have:** keyword search volume, live SERP positions, rank tracking over
time, backlink/Domain-Rating data, or search-impression data. The audit measures *how citable and
crawlable a page is*, not *where it ranks*. Those need an external data source.

This page is the optional enrichment layer. **The core stays zero-dependency**, enrichment is opt-in
and env-gated, so nothing breaks if no keys are present.

## Provider options (cheapest-first)

### Free
- **Google Search Console API**, the best free source: real impressions, clicks, average position,
  and the exact queries Google already shows you for. If you own the site, start here. (OAuth.)
- **Google PageSpeed Insights API**, real Core Web Vitals / Lighthouse, free, just an API key.
- **Bing Webmaster Tools API**, equivalent for Bing/Copilot.

### Paid SERP + keyword (pay-as-you-go)
- **DataForSEO**, the cheapest serious option, pay-per-call (no subscription). Covers live Google/Bing
  SERPs, keyword volume (DataForSEO Labs), on-page, and backlinks. Best price/coverage for a tool like
  this. Basic-auth, JSON. **Wired up below.**
- **Serper.dev**, very cheap, fast Google SERP JSON; great if you only need SERP positions.
- **SerpApi / ValueSERP**, mature SERP APIs, pricier.

### Backlinks / brand mentions (the GEO ceiling)
- **Ahrefs / Semrush APIs**, authoritative but expensive (enterprise-priced).
- Cheaper proxy: track **brand mentions** (which matter ~3× more than backlinks for AI visibility) via
  Google Alerts, a `site:reddit.com "brand"` sweep, or DataForSEO's SERP API on brand queries.

## DataForSEO: the full toolkit
A complete read-only DataForSEO data layer ships at [`tools/dataforseo/`](../tools/dataforseo) (Python).
It pulls an OnPage audit, keyword research, SERP rankings, and competitor/content-gap analysis, caches
responses in SQLite, and writes Markdown reports (`00-executive-summary` through `05-content-gaps`).
Configure `site.yaml` (domain, market, seed keywords, competitors) and run `python -m dataforseo run`.
See its [README](../tools/dataforseo/README.md). This is the heavier option when you want full reports.

## DataForSEO: the one-file helper (optional)
A thin, env-gated helper ships at
[`skills/seo-geo-audit/scripts/serp-enrich.mjs`](../skills/seo-geo-audit/scripts/serp-enrich.mjs).
It activates only if credentials are present:

```bash
export DATAFORSEO_LOGIN="you@example.com"
export DATAFORSEO_PASSWORD="your-api-password"
node skills/seo-geo-audit/scripts/serp-enrich.mjs "best invoicing app" --domain=example.com --location=2840
```

It calls the **Google Organic live/advanced** endpoint and reports the top results plus whether your
domain ranks (and at what position) for the query. Pay-per-call, so it runs one query at a time on
purpose. Without credentials it prints setup instructions and exits cleanly, the core audit never
depends on it.

- Endpoint: `POST https://api.dataforseo.com/v3/serp/google/organic/live/advanced`
- Auth: HTTP Basic, `base64(login:password)`.
- `location_code` examples: 2840 = United States, 2826 = United Kingdom. (See DataForSEO's locations list.)
- Cost: a few cents per live SERP call at time of writing, check current pricing.

## How to feed it back into the audit
Two honest options:
1. **Manual:** run `serp-enrich.mjs` for your top queries, paste the positions into the report under a
   "Live SERP" section, and let the agent factor them into priorities.
2. **GSC-first:** if you own the site, pull GSC query data and use it to pick the query set for
   [`track-ai-citations`](../skills/track-ai-citations/SKILL.md), real queries beat guessed ones.

Keep enrichment a **separate layer** from the deterministic audit so the A-F foundational score stays
reproducible by anyone, with or without a paid key.
