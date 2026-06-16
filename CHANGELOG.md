# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/), and the project aims to follow
[Semantic Versioning](https://semver.org/).

## [1.0.0]

First public release.

### Skills
- **seo-geo-audit**: zero-dependency crawler that reads the server HTML, runs ~28 deterministic checks plus a 6-dimension citability rubric, and returns an A to F grade with a prioritized fix list. Includes a render-gap check (content that appears only after JavaScript is invisible to AI crawlers).
- **generate-llms-txt**: drafts a curated `/llms.txt` from a sitemap.
- **track-ai-citations**: a rigorous method and templates for measuring AI-citation rate over time.
- **seo-geo-fix**: applies one focused fix as a small, reviewable PR.
- **geo-charts**: renders the numbers as a single-file HTML chart.

### Tools and extras
- `chunk-sim.mjs`: a chunk-level retrieval simulator that scores how citable a page is, the way a RAG pipeline sees it.
- `serp-enrich.mjs`: an optional one-call DataForSEO SERP helper.
- `tools/dataforseo/`: a full optional DataForSEO toolkit (audit, keywords, SERP, competitors, reports).
- Four agents (on-page SEO, GEO monitor, strict reviewer, trend watch), a GitHub Action audit gate, and an offline CI smoke test.

### References
- `PLAYBOOK.md`, `GEO-ADOPTION.md`, `statistics-2026.md`, `ai-crawlers.md`, `platform-profiles/`, `geo-frontier-strategies.md`, `tactics-spectrum.md`, `data-providers.md`.

### Docs
- English and Simplified Chinese READMEs.
