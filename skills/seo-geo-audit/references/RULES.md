# Audit rules catalog

The deterministic half of the grade. Each rule returns **PASS (100) / WARN (50) / FAIL (0)** and
carries a weight; the foundational score is the weight-averaged total. This catalog is intentionally
**trimmed to high-signal, falsifiable checks**, not a 250-rule kitchen sink. Every rule maps to a
verifiable `curl` command so a human can reproduce it.

> Philosophy: a check earns its place only if (a) it correlates with ranking or AI citation and
> (b) you can prove it true/false from the server HTML alone. See `../../../references/PLAYBOOK.md`.

## Weights by category

| Category | What it covers |
|----------|----------------|
| Technical | HTTPS, status, host consistency, sitemap, robots.txt, html lang |
| AI/GEO | AI-crawler access, llms.txt, answer-first, question headings, evidence, freshness |
| Core SEO | title, description, canonical (self-ref + homepage-bug), H1 |
| Structured Data | JSON-LD present in server HTML, valid, Organization/WebSite entity |
| Crawlability | noindex sanity |
| Social | Open Graph title + image |
| Images | alt coverage |
| E-E-A-T | named human author |
| Mobile | viewport |

## The checks

### Technical
- `https` (w3), origin served over HTTPS. `curl -sI URL | grep -i location`
- `http-status` (w3), start URL returns 200 (not 3xx/4xx/5xx).
- `host-consistency` (w2), final URL stays on the requested host (no apex↔www drift). Pick ONE host, **308** the other.
- `sitemap` (w2), `/sitemap.xml` exists. `curl -sI URL/sitemap.xml`
- `robots-txt` (w2), `/robots.txt` exists.
- `html-lang` (w1), `<html lang>` declared.

### AI/GEO
- `ai-bots-allowed` (w5), robots.txt does **not** `Disallow: /` for AI crawlers (GPTBot, OAI-SearchBot, ChatGPT-User, PerplexityBot, ClaudeBot, Claude-User, Google-Extended, Applebot-Extended, Amazonbot, Bytespider, CCBot, meta-externalagent). Blocking them = invisible to AI answers. See `../../../references/ai-crawlers.md`.
- `llms-txt` (w1), `/llms.txt` present. Cheap insurance, not a driver.
- `geo-answer-first` (w3), page opens with a TL;DR / direct-answer block. **Answer-first content gets ~4.8× more AI citations.**
- `geo-question-headings` (w2), uses question-style H2s / FAQ structure (machine-readable Q&A).
- `geo-evidence` (w2), carries specific numbers/dates. **Statistics ≈ +40% citation rate.**
- `geo-freshness` (w1), exposes a published/modified date.

### Core SEO
- `title` (w4), usable `<title>` (≥10 chars) on every page.
- `title-length` (w2), 30-65 chars (truncation sweet spot). Drop volatile values (price) from the title.
- `meta-description` (w3), present, ≥50 chars.
- `canonical-present` (w3), `<link rel="canonical">` declared. `curl -s URL | grep -oP 'canonical href="[^"]*"'`
- `canonical-self` (w4), canonical points to the page itself; **FAILS if any deep page canonicalizes to the homepage** (the classic global `alternates.canonical:'/'` root-layout bug that silently deindexes subpages).
- `h1-single` (w2), exactly one `<h1>` per page (watch templates that render the title twice).

### Content
- `content-in-server-html` (w4), pages carry substantive text (≥100 words) **in the server HTML**. The render-gap check: if the body is near-empty, the content is client-rendered or thin and **AI crawlers see nothing to cite**, no matter how good it looks in a browser. The GEO-specific cousin of `jsonld-present`. `curl -s URL | sed 's/<[^>]*>//g' | wc -w`
- `title-unique` (w2), no two crawled pages share a `<title>` (keyword cannibalization / templating bug).

### Structured Data
- `jsonld-present` (w4), JSON-LD present **in the server HTML**. Injected via `next/script`/`afterInteractive` it renders client-side and AI crawlers never see it. **Verify with `curl | grep ld+json`, not the browser.** The single most common AI-visibility bug.
- `jsonld-valid` (w2), every JSON-LD block parses as valid JSON.
- `org-schema` (w1), one `Organization`/`WebSite` entity (ideally with a stable `@id` and populated `sameAs`).

### Crawlability
- `noindex` (w2), no unexpected `noindex` on crawled pages. Note: `Disallow` + `noindex` together = indexing limbo; to deindex, **Allow in robots AND noindex on the page**.

### Social
- `open-graph` (w2), `og:title` + `og:image` present.

### Images
- `img-alt` (w2), `<img>` alt coverage ≥90%.

### E-E-A-T
- `geo-author` (w2), a named human author (meta or JSON-LD `Person`). The highest-leverage E-E-A-T fix for YMYL (finance/health/legal).

### Mobile
- `viewport` (w1), viewport meta present.

## Verification cheatsheet (reproduce any finding by hand)
```bash
curl -s URL | grep -oP '<title>[^<]*'                       # title
curl -s URL | grep -oP 'canonical href="[^"]*"'             # canonical (must be self)
curl -s URL | grep -c 'application/ld+json'                 # JSON-LD in SERVER html
curl -s URL/robots.txt | grep -iA2 -E 'GPTBot|PerplexityBot|ClaudeBot|Google-Extended'
curl -sI URL | grep -iE 'HTTP/|location'                    # status + redirects (want 200 / 308)
```

## Adding a rule
Add it to `scripts/audit.mjs` `runChecks()`. Keep the bar high: correlates with ranking/citation
AND provable from server HTML. If you can't write a one-line `curl` that proves it, it doesn't belong.
