# Intelligence rubric (the 50% a script can't judge)

The script measures what is *present*. This rubric measures whether the content is *worth citing*.
You score it by **reading the pages** in `pagesForReview`, because citation-worthiness is a judgment
no regex can make.

**Frame:** you are an AI answer engine (ChatGPT / Perplexity / Gemini / Claude). A user asked a
question, web search returned this site, and you opened it. **Would you quote it in your answer?**

Score each of the 6 dimensions **0-5**. Write the rationale **before** the number, citing concrete
things you saw (a heading, a passage, a table). Score only what you observed, never assume about
pages you didn't read.

`intelligenceScore = (sum of the 6 scores / 30) × 100`

The multipliers below are from measured 2026 GEO studies (see `../../../references/statistics-2026.md`);
treat them as direction, not promises.

---

## 1. Answer Readiness (the #1 factor)
Could you find a *direct* answer to a likely user question, fast? Answer-first content earns ~4.8× more citations.
- 0, No answers; purely promotional/navigational.
- 1, Talks around topics, never directly answers.
- 2, Answers exist but buried deep, not in opening paragraphs.
- 3, Several questions answerable; some definition-first / FAQ content.
- 4, Most common questions answerable; answers lead the sections.
- 5, Exceptional: dedicated FAQ blocks, definition-first paragraphs, Q&A throughout.

## 2. Quotability
Can you extract a clean, self-contained 40-60 word passage to quote without surrounding context?
Comparison tables ≈ 2.8× citations; FAQ blocks +156%. (Perplexity does passage-level retrieval, self-contained sections get pulled even when the page doesn't.)
- 0, Nothing extractable (interactive-only, one dense block).
- 1, Everything needs full-page context.
- 2, A few passages stand alone; most don't.
- 3, Several self-contained paragraphs; some lists/structured blocks.
- 4, Tables, lists, FAQ sections, clear answer blocks.
- 5, Comparison tables + step-by-step + definition paragraphs throughout.

## 3. Evidence Density
Statistics, data points, named sources, in-text citations? In-text citations ≈ +115% visibility; statistics ≈ +40% citation rate.
- 0, No evidence; marketing copy only.
- 1, Vague claims ("best in class", "industry leading").
- 2, Mostly generalities; rare data points.
- 3, Some statistics and named sources.
- 4, High density: numbers, dates, named sources, links to references.
- 5, Stats every ~150-200 words, in-text citations throughout, verifiable metrics.

## 4. Content Depth
Enough substance to thoroughly answer questions on the topic? Long-form (2000+ words) ≈ 3× more citations, but depth, not padding.
- 0, Empty/placeholder.
- 1, A few sentences, no real substance.
- 2, Thin; covers the surface only.
- 3, Solid coverage of the main points.
- 4, Thorough; handles edge cases and follow-ups.
- 5, Definitive resource; the page you'd cite over any competitor.

## 5. Structure & Schema
Is the content machine-parseable, semantic headings, tables, lists, and JSON-LD that matches the visible content?
- 0, Wall of text, no structure, no/invalid schema.
- 1, Minimal structure; schema absent or broken.
- 2, Some headings; schema thin or generic.
- 3, Clear heading hierarchy; basic schema present.
- 4, Strong hierarchy + tables/lists + relevant schema (Article/FAQ/Product/HowTo) matching content.
- 5, Exemplary: clean semantic structure, rich schema with stable `@id`, content and markup agree exactly.

## 6. Brand Authority signals (the off-site proxy)
What you can infer about authority from on-page signals: named credentialed authors, an Organization
entity with populated `sameAs` (links to its real profiles), citations *to* the brand, consistent
naming. (The real ceiling is off-site mentions, this dimension only proxies it. See `PLAYBOOK.md` §1.)
- 0, Anonymous; no entity, no external profiles, inconsistent naming.
- 1, A generic "Team" author; empty `sameAs`.
- 2, Some identity signals but weak/inconsistent.
- 3, Named author + Organization entity + a few `sameAs` links.
- 4, Credentialed author + reviewer + complete `sameAs` + consistent brand spelling/disambiguation.
- 5, Clear topical authority signaled on-page (named experts, citations, complete entity graph).

---

## Worked example (anthropic.com, illustrative)
> Answer Readiness 2, product/jobs pages are navigational; few direct Q&A passages in the crawled set.
> Quotability 3, clean prose paragraphs, but few tables/FAQ blocks. Evidence Density 2, sparse stats
> on the crawled pages. Content Depth 3. Structure & Schema 2, JSON-LD missing on most crawled pages
> (script confirms 17%). Brand Authority 4, strong real-world entity, but on-page `sameAs`/author thin.
> Sum = 16/30 → intelligence 53. With foundational 76 → final = round(0.5·76 + 0.5·53) = **65 → grade D/C**.

Always re-derive from the pages **you** actually read; the example is a template, not an answer.
