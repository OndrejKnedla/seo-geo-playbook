# SEO + GEO Playbook: what we actually learned

These are SEO and GEO lessons from real work: things measured, shipped, and verified, plus the
gotchas hit along the way. Generalized so they apply to any site.

---

## 0. Mental model: GEO is not a new discipline

> "Optimizing for generative AI search is still SEO." (Google)

GEO = SEO fundamentals applied to AI-search surfaces. `llms.txt`, "chunking" and "AI-rephrasing"
are **unverified** levers. The real levers:

1. **Structured data** (schema.org / JSON-LD)
2. **Citable passages** (TL;DR boxes, self-contained paragraphs)
3. **FAQ + tables** (machine-readable Q&A)
4. **Primary sources with dates** (authority + freshness)
5. **Brand mentions off your own site** ← **the highest lever, and the one almost nobody pulls**

Levers 1-4 are on-site and can be maxed out fast. Lever 5 is off-site and sets the ceiling for
the entire effort.

---

## 1. The biggest lesson: the ceiling is OFF-SITE, not the website

Two independent audit passes (one SEO-weighted, one GEO-weighted) reached the
**same conclusion** independently:

- **On-site GEO = top decile for a young SaaS** (Citability 82, Technical 90, Schema 85).
- **The composite is dragged down by two off-site dimensions**: Brand Authority **18/100**,
  Platform Optimization **15/100**. That's 30% of the weight sitting near zero.

**The data that explains it (Ahrefs, Dec 2025):**
- Brand mentions correlate with AI visibility **~3× more strongly than backlinks**.
- Channel strength: **YouTube (strongest, ~0.737) > Reddit ≈ Wikipedia > LinkedIn > PR/links.**
- Domain Rating (the classic backlink signal) ~0.266 = **weak** for AI citations.

**Consequence:** a young brand **wins branded + niche queries immediately** (its category-defining
phrase, "&lt;brand&gt; vs &lt;competitor&gt;" = #1). It **loses generic high-value queries**
(the broad, high-volume category terms), *even though it has finished, GEO-ready pages for them.* **That's an authority problem, not a content problem.** More content
won't fix it, more independent mentions will.

**Off-site priority (by leverage):** YouTube demo → Reddit/FB groups (authentically) → LinkedIn
company profile → PR/reviews on local sites → Wikipedia (once enough independent sources exist).

---

## 2. The technical gotchas that cost us the most (PAY ATTENTION HERE)

### 2.1 JSON-LD via `next/script` is NOT in the SSR HTML → AI crawlers can't see it ⚠️
**The single most important finding of the whole project.** JSON-LD injected through
`<Script strategy="afterInteractive">` only renders client-side. AI crawlers (and part of Google)
read just the initial HTML → **structured data on 32 pages was invisible to AI.**
**Fix:** a plain `<script type="application/ld+json" dangerouslySetInnerHTML=...>` directly in the
RSC, so it lands in the SSR output. **Verify with `curl`, not the browser** (the browser shows you
the client-rendered DOM too).

### 2.2 `alternates.canonical: '/'` in the root layout = a canonical bug on every subpage
A global canonical in `layout.tsx` is inherited by **every page without its own `metadata`** →
product pages (including the pricing page!) canonicalize themselves into the homepage → Google
merges/deindexes them.
**Fix:** every indexable page gets `export const metadata` with `alternates.canonical: '/<route>'`.
**Verify:** `curl -s URL | grep -oP 'canonical href="[^"]*"'` → must point to itself.

### 2.3 apex vs www host conflict fractures signals
The site served on `www`, but canonical/sitemap/robots/llms.txt/`metadataBase` all pointed to apex
→ every sitemap URL 307-redirected. **Fix:** pick ONE canonical host in Vercel, send the other via
**308 (permanent)**, not 307. Align every signal to it.

### 2.4 robots `Disallow` + page-level `noindex` = indexing limbo
We had 545 translated blog URLs carrying **both** a robots `Disallow` **and** a `noindex`. The
robots block **prevents Google from ever reading the `noindex`** → they get stuck as
"Discovered, not indexed". **Fix:** to drop a page from the index, **`Allow` in robots +
`noindex` on the page** (not both blocked). robots manages crawl budget; `noindex` manages the
index, don't conflate them.

### 2.5 Is the file you think is rendering actually rendering?
`/blog` rendered via `app/blog/page.tsx`, not `app/blog/[...slug]/page.tsx` (that one only serves
`/blog/[lang]`). I edited the wrong file and only caught it in local preview.
**Rule:** before editing, confirm locally (`next start`) which file actually renders the page.

---

## 3. Content / E-E-A-T lessons

- **One `<h1>` per page.** The article template accidentally rendered the title twice → two H1s.
- **A named human author is the highest-leverage E-E-A-T fix for YMYL** (finance/health/legal).
  A generic "Team" `Organization` author is the ceiling. Add a named founder + a credentialed
  expert reviewer + `author` as `Person` schema + a visible "Written/Reviewed by: [name]".
- **A visible "Published / Updated [date]"** = freshness signal (the data is usually already in the
  JSON-LD, just surface it).
- **Primary sources with links** (official/government/standards-body URLs, a statute or spec number) > vague claims.
- **Specific numbers and dates** > vague phrases. "Feature X ships Jan 1, 2027" gets cited by AI more
  readily than "Feature X is coming."
- **Watch the de-hype:** in regulated verticals (finance/health/legal), "AI" hype is a *negative*
  signal. We had an article using "AI" 26× in the body, against our own brand rule → reframed to
  outcomes ("automatic document recognition", "save 5 hours").

---

## 4. Data consistency = trust (and AI cites you wrong when your site contradicts itself)

- **Pricing chaos was a P0:** 4 contradicting price representations ran at once (title, homepage
  JSON-LD, a global `AggregateOffer`, `llms.txt`), differing prices, tier names, tier counts, and
  billing models. On a single homepage Google read both `lowPrice 299` and `price 199` for the same
  product. → AI cites the wrong/contradictory price, rich results show the wrong price, trust drops.
  **Fix:** one truth (the real prices on the pricing page), aligned across ALL locations.
  **Drop the price from the `<title>`**, it's a dynamic maintenance debt.
- **One canonical value per fact.** A key product metric (e.g. accuracy) appeared as 94% / 97% / 99%
  across pages → a trust weakness. Pick one, use it everywhere.
- **One `Organization` with a stable `@id`.** We had two conflicting ones (foundingDate 2024 vs 2025,
  two logos, empty `sameAs`) with no `@id` → Google saw two competing entities. Consolidate, add an
  `@id`, bind `BlogPosting.publisher.@id` to it.

### The fact-freshness routine (why it exists)
Within two weeks we found **3 stale regulated numbers** on the site (thresholds and rates that had
changed). Such numbers change with amendments, sometimes retroactively. **Solution:** a monthly cron
agent (1st of the month) that re-checks every volatile/regulated figure and product price for
consistency → opens a GitHub Issue "Fact freshness watch". Reports only, edits nothing. **One source
of truth** (a single `lib/facts-2026.ts` style module) instead of numbers scattered across articles.

---

## 5. Schema / structured data: what works

- **The backbone for AI citations.** Clean, machine-readable answer blocks = the biggest GEO asset.
- Types used: `Organization`, `SoftwareApplication`, `FAQPage`, `Article`/`BlogPosting`,
  `BreadcrumbList`, `Blog`/`ItemList`, `WebSite`+`SearchAction`, `Offer`/`Product`, `HowTo`.
- **`FAQPage` rich results have been limited to gov/health since Aug 2023** → no rich-result benefit
  on SaaS, **but still useful as citation context for AI.** (Don't inject a global pricing FAQ on
  every page, though, that's irrelevant noise.)
- **No deprecated schema** (HowTo without rich, SpecialAnnouncement, ClaimReview).
- All URLs absolute, `@context` everywhere, no placeholders, one host.

---

## 6. `llms.txt`: cheap insurance, not a driver

- **Present and well-built = ahead of most peers.** An Anthropic-style pointer file at the root.
- **But:** an unverified lever. The heavy lifting is done by schema + citability + brand mentions.
- **Gotchas we hit:** a leaked internal dev note, a price inconsistent with the homepage, an
  apex/www mix, missing links. → `llms.txt` must be **consistent with the rest of the site**.
- **Attribution for AI search:** an explicit section pinning your exact canonical brand spelling
  (not near-miss variants or an old product name) → prevents confabulation and name confusion.
- `llms-full.txt` (full raw content) = optional; generate it with a script from frontmatter so it
  doesn't rot.

Template: [`05-llms-txt/llms.txt`](05-llms-txt/llms.txt).

---

## 7. Brand entity & disambiguation

- AI engines bucketed us with unrelated products and **mixed up entities** (our brand vs lookalike
  competitors with near-identical names). ChatGPT took our own comparisons "with a grain of salt,
  it's from the makers" = missing **independent sources**.
- **Countermeasures:** `disambiguatingDescription` in schema, an FAQ on the about page (who we are /
  who we aren't), consistent name spelling everywhere, llms.txt attribution, + an outreach plan for
  independent mentions.
- **Track competitors with similar-sounding names** (lookalike domains), risk of confusion in brand search.

---

## 8. GEO 2.0 experiments (what we tried beyond the basics)

Ideas for becoming a **machine-readable source of truth**, not just another page:

- **A public MCP server** (`/api/mcp`, no auth, attribution in every response) over your single
  source of truth for the key facts/figures in your niche → registerable to MCP registries (mcp.so,
  Smithery, Glama). AI assistants can pull current numbers straight from you.
- **An open-data facts API** (`GET /api/facts/2026`) + **embed widgets** (`/embed/*`,
  `frame-ancestors *`) → other sites embed your calculator/widget = natural mentions + links.
- **Data-driven PR:** an audit of N domains in your niche showed **most sites carry stale numbers
  after a regulatory change** → that became a study article + a press kit for media (your own data = a citable hook).

These are shipped, but their **payoff depends on off-site distribution** (registration, sending to
media), see principle #1.

---

## 9. Operational / workflow lessons (CI/CD)

- **Branch from the right base.** I accidentally branched an SEO PR off a stale `master` that was
  114 commits behind the live production branch → conflicts. Rule: branch web changes off whatever
  is **actually live**.
- **Local `next start` review BEFORE deploy.** `curl --retry` against localhost caught canonical /
  JSON-LD problems that would otherwise have shipped.
- **Verify with `curl`, not the browser** (because of SSR vs client render, see #2.1).
- **AI subagents work in small batches:** one targeted improvement = one small PR, with an
  independent reviewer agent (strict, REJECT at the slightest doubt) as a pre-production safety net.
  Definitions in [`04-ai-agents/`](04-ai-agents/).

---

## 10. Measurement (how I know it's working)

- **Citation baseline:** 30 fixed queries tested in ChatGPT/Perplexity (incognito + Firecrawl proxy).
  Track the "does it cite us?" column + third-party brand mentions. Re-test at +30 / +90 days.
  Baseline: [`03-geo-citations/`](03-geo-citations/).
- **GSC Coverage:** after fixing canonical/host, watch "Duplicate, Google chose different canonical"
  fall toward zero + indexed pages rise.
- **Scores:** SEO Health Score (claude-seo, 7 categories) + GEO Score (geo-seo-claude, 6 dimensions).
  On-site went from 64 → maxed; GEO composite ~61, ceiling held by off-site.
- **Target:** Perplexity citation rate 30%+ within 90 days (after the off-site footprint ships).

---

## TL;DR checklist (the 10 things to remember)

1. JSON-LD must be in the **SSR HTML** (plain `<script>`, not `next/script`). Verify with `curl`.
2. Every indexable page has its **own canonical** pointing to itself.
3. **One canonical host**, 308 the other. Align every signal.
4. `Disallow` + `noindex` together = limbo. Pick one.
5. **One truth per fact** (price, OCR %, tax numbers). Consistency = trust.
6. **One `Organization`** with a stable `@id` and populated `sameAs`.
7. **A named human author** + `Person` schema for YMYL.
8. Citability = TL;DR boxes + question-style H2s + tables + primary sources + dates.
9. `llms.txt` = insurance, not a driver; keep it consistent with the rest of the site.
10. **Off-site brand mentions are the ceiling.** YouTube > Reddit ≈ Wikipedia > LinkedIn > PR.
    Without them, more content won't help.
