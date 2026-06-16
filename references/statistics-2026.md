# SEO + GEO statistics (2026)

Last reviewed: **2026-06**. Figures are *as publicly reported*, rounded, and **directional**, use
them to shape priorities, not to promise outcomes. Sources linked. When a number is single-vendor
marketing, it is flagged or excluded.

> Skeptic's rule: if a stat has no named denominator and no methodology, treat it as a hypothesis.
> The numbers below survived that filter. Re-check the sources; this file is meant to be updated.

## Adoption: AI answers are now a default surface
- **ChatGPT**: ~100M weekly (Nov 2023) → 300M (Dec 2024) → 400M (Feb 2025) → **~700M+ weekly (2025)** (OpenAI announcements).
- **Google AI Overviews**: **1.5B monthly users** by mid-2025 (Google I/O). **Gemini 3 became the default model for AI Overviews on 27 Jan 2026** (9to5Google, SE Ranking).
- **~58-60% of Google searches end without a click** (Semrush / SparkToro zero-click studies, 2022-2024); AI answers push this higher.

## What actually shifted (Nov 2025 → mid 2026)
| Change | Source |
|--------|--------|
| Gemini 3 became the default for Google AI Overviews (27 Jan 2026); ~42% of previously cited domains were replaced after the swap | SE Ranking 100k-keyword study, Feb 2026 |
| Google **retired FAQ rich results** in Search (7 May 2026), FAQPage no longer earns SERP rich results, but still useful as citation context for AI | Google Search Central, Search Engine Land |
| Google Core Updates re-weighted **"Information Gain"** (novel knowledge vs recycled) and applied spam policies to AI-generated answers | developers.google.com, Search Engine Land |
| **schema.org v30.0** (19 Mar 2026): added `Credential`, `Error`; deprecated `Attorney` in favour of `LegalService` | schema.org releases |
| IndexNow added Internet Archive and Amazon as participants (early 2026) | indexnow.org |

## What predicts an AI citation (correlation, Ahrefs brand-mentions study, Dec 2025)
- **Brand mentions correlate ~3× more strongly than backlinks.**
- Channel strength: **YouTube (~0.74) > Reddit ≈ Wikipedia > LinkedIn > PR/links.**
- **Domain Rating (classic backlink authority) ~0.27 = weak** for AI citations.
- AI engines cite **Reddit, YouTube and LinkedIn the most** ([SearchEngineLand, 2025](https://searchengineland.com/ai-search-engines-cite-reddit-youtube-and-linkedin-most-study-473138)).

## On-page tactics with measured citation lift (directional)
- **Answer-first content** (direct answer in the first paragraph): ~**4.8×** more citations.
- **Comparison tables**: ~**2.8×** citations.
- **FAQ blocks**: ~**+156%**.
- **In-text citations to sources**: ~**+115%** visibility.
- **Statistics with named denominators**: ~**+40%** citation rate.
- **Long-form (2000+ words) with real depth**: ~**3×** citations (depth, not padding).

> These come from GEO/AEO content studies (Princeton GEO paper line of work + 2025-2026 vendor
> replications). Magnitudes vary by study; the *ranking* of tactics is the robust part.

## How each engine cites (shapes your structure)
| Engine | Behaviour | Implication |
|--------|-----------|-------------|
| Google AI Overviews | ~88% of answers cite 3+ sources; ~1% cite a single source | breadth matters; be one of several credible sources |
| Google AI Mode | separate surface from AIO (URL overlap ~14%); query fan-out (multiple sub-queries) | optimize for sub-questions, not just the head term |
| ChatGPT (Search) | cites fewer sources, deeper absorption; **strong position bias, first ~30% of a page wins citations** | put the answer near the top |
| Perplexity | **passage-level retrieval + cross-encoder rerank**, self-contained sections get pulled even if the page doesn't | make each section independently citable |
| Claude | **conservative citer** (~39% of queries cited vs ~56% ChatGPT, >95% Perplexity/Google AI Mode); Brave Search visibility correlated with Claude citations | breadth of independent presence helps |

## Removed / debunked (do not quote these)
- "527% AI-referred traffic growth", single-vendor blog, no methodology.
- "+35% TL;DR / +40% credentials / +40% heading hierarchy" as stacked, additive lifts, unreplicated; the *direction* holds, the stacking does not.
- "33-40% higher visibility", unattributed marketing line.
- **llms.txt as a citation driver**, measured as null/negligible for SERP and AI-citation movement in 2026; keep it as cheap insurance, not a lever.

## Sources
OpenAI WAU announcements; Google I/O AI Overviews figures; Semrush/SparkToro zero-click studies;
Ahrefs brand-mentions vs AI-visibility study (Dec 2025); SearchEngineLand AI-citation-source study
(2025); SE Ranking Gemini-3 AIO study (Feb 2026); Google Search Central + schema.org release notes (2026).
*Update this file when you re-check the sources; date every change.*
