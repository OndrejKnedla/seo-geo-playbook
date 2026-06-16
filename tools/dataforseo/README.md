# DataForSEO toolkit

A read-only SEO data layer. It pulls an OnPage audit, keyword research, SERP rankings, and competitor
data from the DataForSEO API and writes Markdown reports. This is the heavier, optional counterpart to
the zero-dependency Node audit: it brings real ranking and keyword data, at a few cents per API call.

The core repo stays dependency-free. This tool is opt-in and lives on its own (Python + a handful of
packages). Nothing else in the repo imports it.

## Setup

```bash
cd tools/dataforseo
pip install -r requirements.txt
cp .env.example .env            # add your DataForSEO login + API password
cp site.example.yaml site.yaml  # set your domain, market, seed keywords, competitors
```

## Run

```bash
python -m dataforseo run        # full pipeline: audit + keywords + serp + competitors + reports
python -m dataforseo audit      # OnPage crawl only
python -m dataforseo keywords   # keyword research only
python -m dataforseo serp       # SERP rankings only
python -m dataforseo competitors
```

Reports are written to `reports/YYYY-MM-DD/`:

- `00-executive-summary.md`
- `01-audit-summary.md`
- `02-current-rankings.md`
- `03-keyword-opportunities.md`
- `04-competitors.md`
- `05-content-gaps.md`

## How it fits the rest of the repo

- The Node [`seo-geo-audit`](../../skills/seo-geo-audit/SKILL.md) tells you how citable and crawlable a
  page is. This tells you where it actually ranks and which keywords are worth chasing.
- Use the keyword and SERP output to choose the fixed query set for
  [`track-ai-citations`](../../skills/track-ai-citations/SKILL.md): real queries beat guessed ones.
- For a lighter touch (one live SERP lookup, no Python), there is also
  [`serp-enrich.mjs`](../../skills/seo-geo-audit/scripts/serp-enrich.mjs).

See [`../../references/data-providers.md`](../../references/data-providers.md) for free alternatives
(Google Search Console) and how to feed this data back into an audit.

## Cost note

Every command hits the paid DataForSEO API (pay per call, no subscription). Responses are cached in a
local SQLite file so re-runs are cheap, but the first run of a full pipeline costs real money. Start
with `audit` or `keywords` on a small seed list.

## Tests

```bash
pip install -r requirements.txt   # includes pytest + responses
pytest
```
