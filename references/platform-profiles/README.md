# Platform profiles: how to optimize per AI engine

Each engine retrieves and cites differently. Optimize for the mechanism, not a generic "AI". Data
behind these is in `../statistics-2026.md`.

## ChatGPT (Search + agentic browsing)
- **Mechanism:** fewer sources cited, deeper absorption per source. **Strong position bias, material in the first ~30% of a page captures a disproportionate share of citations.**
- **Do:** put the direct answer at the very top (answer-first / TL;DR). Lead each section with its conclusion. Keep the most important facts above the fold of the HTML.
- **Crawlers to allow:** `OAI-SearchBot` (index), `ChatGPT-User` (live fetch). See `../ai-crawlers.md`.

## Perplexity
- **Mechanism:** **passage-level retrieval with a cross-encoder rerank**, it pulls self-contained sections even when the page as a whole isn't the best match.
- **Do:** make every section independently citable (a heading + a self-contained 40-60 word answer). Tables and definition blocks get extracted cleanly. Don't rely on whole-page context.
- **Crawlers to allow:** `PerplexityBot`, `Perplexity-User`.

## Google AI Overviews + AI Mode
- **Mechanism:** served from the **normal Googlebot index** (no separate toggle). AIO cites 3+ sources ~88% of the time. AI Mode is a *separate* surface using **query fan-out** (it decomposes your prompt into sub-queries). Gemini 3 is the default model since Jan 2026.
- **Do:** classic technical SEO + be one of several credible sources. Optimize for **sub-questions**, not only the head term (fan-out rewards pages that answer the adjacent questions too). FAQ rich results are gone (May 2026) but FAQ *content* still feeds citations.
- **Crawlers to allow:** `Googlebot` (everything depends on it).

## Gemini (app)
- Shares Google's grounding/index signals; same playbook as AIO. `Google-Extended` governs *training* use, not live answers.

## Claude (web search)
- **Mechanism:** **conservative citer**, cites on far fewer queries than Perplexity/Google. **Brave Search visibility correlated with Claude citations** in cross-platform studies, so presence in Brave's index helps.
- **Do:** strong, unambiguous, well-structured authoritative content; broad independent presence (the off-site footprint) raises the odds with a cautious citer.
- **Crawlers to allow:** `Claude-User` / `Claude-SearchBot` for live retrieval (allow `ClaudeBot` too if you want training inclusion).

## Universal (works on all of them)
1. Answer-first structure (the single highest-leverage on-page move).
2. Self-contained, quotable passages (40-60 words) under question-style headings.
3. Specific numbers, dates, and named sources (evidence density).
4. Valid JSON-LD **in the server HTML** matching the visible content.
5. Don't block the live retrieval crawlers.
6. The ceiling is still off-site brand mentions (`../PLAYBOOK.md` §1), no per-engine trick beats it.
