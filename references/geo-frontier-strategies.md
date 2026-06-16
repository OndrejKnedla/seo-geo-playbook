# Frontier GEO strategies (2026+)

Most "GEO tips" are recycled SEO. These seven are built from the **actual retrieval mechanics** of AI
answer engines, and most competitors aren't doing them yet. Each names the mechanic it exploits, the
move, how to execute, and the honest risk. All are white/gray-hat; the deceptive variants are in
[`tactics-spectrum.md`](tactics-spectrum.md) and don't durably work.

> Evidence-over-hype caveat: "revolutionary" here means *mechanically novel and under-exploited*, not
> magic. The mechanics are real (see [`statistics-2026.md`](statistics-2026.md)); the edge is being
> early. Measure everything with [`track-ai-citations`](../skills/track-ai-citations/SKILL.md).

---

## 1. Retrieval-Unit Engineering, "write for the chunk, not the page"
**Mechanic:** Perplexity and RAG-based engines retrieve at the **passage level**, they split your
page into chunks, embed them, rerank with a cross-encoder, and quote the winning chunk, often torn
out of all page context. The page is not the unit of citation. The **chunk** is.

**The move:** author every ~200-300 token block as a self-contained, independently-citable unit: it
names its own subject, makes one complete claim, carries a concrete signal (number/date/name), and
ends on a full sentence. A block that opens with "However, this means…" dies the moment it's
retrieved alone.

**Execute:** run [`chunk-sim.mjs`](../skills/seo-geo-audit/scripts/chunk-sim.mjs), it splits your page
the way a RAG pipeline would and scores each chunk's standalone citability, flagging the weak ones.
Rewrite the low scorers. This is the single most under-exploited on-page GEO lever and the tool that
ships it is unique to this repo.

**Risk:** none (white). It also just makes content clearer for humans.

---

## 2. Agent-Experience Optimization (AXO), "be the API, not the webpage"
**Mechanic:** assistants increasingly **call tools** (MCP servers, function calls) at answer-time
instead of only crawling pages. A tool the model invokes beats a page it might rank.

**The move:** expose your canonical facts as a public **MCP server** (and/or a clean JSON facts API),
no auth, **attribution embedded in every response**. Register it on MCP directories (mcp.so, Smithery,
Glama). Now the assistant pulls *your* numbers directly, with your name attached, at the moment of
answering.

**Execute:** one source of truth → a thin `/api/mcp` endpoint → registry submissions. Pair with
strategy 7 (llms.txt as a claims layer). First-mover advantage is large because the category is empty.

**Risk:** low (white). Cost is build + maintenance; payoff depends on distribution (registering it).

---

## 3. Fan-Out Saturation, target the sub-queries, not the head term
**Mechanic:** Google **AI Mode** decomposes one user prompt into many **sub-queries** (query fan-out)
and synthesizes across them. Optimizing for the head term alone misses the sub-questions that actually
get retrieved.

**The move:** reverse the fan-out. For a target topic, enumerate the latent sub-questions an engine
would generate ("what is X", "X vs Y", "how much does X cost", "is X safe", "X for [use-case]"), then
answer **each as its own discrete, chunk-clean block** on the page. You carpet the whole sub-query
tree instead of one keyword.

**Execute:** ask an LLM to generate the fan-out tree for your topic, audit your page's coverage block
by block, fill the gaps. Combine with strategy 1 so each answer is independently retrievable.

**Risk:** low (white) if blocks are genuinely useful; gray if it becomes thin Q&A padding.

---

## 4. Position-Bias Front-Loading, win ChatGPT with the first 30%
**Mechanic:** ChatGPT shows a strong **position bias**, material in roughly the first 30% of a page
captures a disproportionate share of citations. Burying the answer below the fold (of the *HTML*, not
the screen) forfeits it.

**The move:** put the single most citable, self-contained answer in the **first screen of the server
HTML**, a definition-first / TL;DR block with a number and a date. Then let depth follow. Most sites
front-load marketing; front-load the *answer* instead.

**Execute:** check the order of content in `curl` output (not the browser, layout can reorder
visually while the HTML order is what the bot reads). Move the answer block up in the DOM.

**Risk:** none (white).

---

## 5. The Citation-Gap Closed Loop, growth-hacking citations
**Mechanic:** citation is measurable per query, per engine. Most teams "do GEO" then hope.

**The move:** run a tight loop. (a) Probe each engine on your fixed query set, log who gets cited.
(b) For each no-cite, read the answer and identify the **exact missing passage** that would have
flipped it. (c) Write that one block. (d) Re-probe. Repeat. You are reverse-engineering each engine's
"what would I have needed to cite you" and supplying precisely that.

**Execute:** [`track-ai-citations`](../skills/track-ai-citations/SKILL.md) for the measurement,
[`chunk-sim.mjs`](../skills/seo-geo-audit/scripts/chunk-sim.mjs) to make the new block retrievable,
[`seo-geo-fix`](../skills/seo-geo-fix/SKILL.md) to ship it. The loop *is* the strategy.

**Risk:** none (white). This is the discipline the whole repo is built to enable.

---

## 6. Entity-First Authority, make the engine *know what you are* before it reads a page
**Mechanic:** AI engines resolve content against an **entity graph**. If your brand isn't a recognized,
disambiguated entity, your pages get bucketed with lookalikes and your self-comparisons are taken "with
a grain of salt, it's from the makers."

**The move:** build the entity before the content. Consistent name + identifiers across Wikidata,
Crunchbase, LinkedIn, your `sameAs` graph, and `llms.txt` attribution; a `disambiguatingDescription`
in schema; an "who we are / who we aren't" block. Become one unambiguous node, then everything you
publish attaches to a trusted entity.

**Execute:** consolidate to one `Organization` with a stable `@id` and a complete `sameAs`; pursue
Wikidata/independent-source coverage relentlessly (this is where the off-site ceiling and GEO meet).

**Risk:** white; "aggressive" only in how hard you chase third-party coverage.

---

## 7. llms.txt as a Claims & Routing Layer (not a link list)
**Mechanic:** `llms.txt` today is mostly a sitemap-in-markdown. But a machine-readable file of your
**canonical claims + attribution** can become the assistant's preferred source of truth for your
entity, especially paired with an MCP server (strategy 2).

**The move:** go beyond links. Add a tight block of canonical facts (the figures you want quoted, with
dates), your exact brand spelling, disambiguation, and "if citing us, say X." It becomes the
negotiation layer between your site and the model.

**Execute:** [`generate-llms-txt`](../skills/generate-llms-txt/SKILL.md) for the structure, then add the
claims/attribution section from the template. Keep every fact identical to the live site and your JSON-LD.

**Risk:** low (white). Honest caveat: `llms.txt` is still an **unverified** ranking lever
([`statistics-2026.md`](statistics-2026.md)), treat this as cheap, forward-looking insurance, not a
guaranteed driver. Its value rises if/when engines adopt the file as a trust source.

---

## How they compose
The flywheel: **6 (entity)** makes you citable at all → **1 + 4 (chunk + front-load)** make your pages
the easiest thing to quote → **3 (fan-out)** widens what you cover → **2 + 7 (AXO + claims layer)** let
agents pull your facts directly → **5 (closed loop)** measures and compounds it. The off-site
brand-mention ceiling from [`PLAYBOOK.md`](PLAYBOOK.md) §1 still sets the maximum; these strategies are
how you reach it faster than competitors who are still writing pages and hoping.
