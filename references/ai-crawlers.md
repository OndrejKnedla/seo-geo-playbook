# AI crawlers: the user-agents that decide your AI visibility

If you block these in `robots.txt`, you become invisible in the corresponding AI answers. Most sites
block them **by accident** (a wildcard rule, a "block all bots" plugin, a WAF). This is the highest-
weight check in `seo-geo-audit` for a reason.

> Two different jobs per vendor: a **training** crawler (builds the model) and a **live retrieval /
> search** crawler (fetches pages to answer a query *now*). Blocking the training bot is a defensible
> content choice. Blocking the **retrieval** bot removes you from live AI answers, usually a mistake
> if you want AI visibility.

## The user-agents (2026)

| Vendor | User-agent | Purpose | Block = you lose |
|--------|-----------|---------|------------------|
| OpenAI | `GPTBot` | Training crawl | future model knowledge of your site |
| OpenAI | `OAI-SearchBot` | **Search indexing** for ChatGPT Search | **live ChatGPT Search citations** |
| OpenAI | `ChatGPT-User` | Live fetch when a user/agent clicks | on-demand fetches in ChatGPT |
| Perplexity | `PerplexityBot` | **Search indexing** | **Perplexity citations** |
| Perplexity | `Perplexity-User` | Live user-triggered fetch | on-demand fetches |
| Anthropic | `ClaudeBot` | Training crawl | future Claude knowledge |
| Anthropic | `Claude-User` / `Claude-SearchBot` | **Live retrieval for Claude** | **Claude citations** |
| Anthropic | `anthropic-ai` | Legacy crawler string |, |
| Google | `Googlebot` | Classic + AI Overviews/AI Mode (AIO uses the normal index) | **all of Google, incl. AI Overviews** |
| Google | `Google-Extended` | Gemini/Vertex **training** opt-out token (not a crawler UA) | future Gemini training use |
| Microsoft | `bingbot` | Bing index (feeds Copilot) | Bing + Copilot |
| Apple | `Applebot` | Siri/Spotlight index | Apple surfaces |
| Apple | `Applebot-Extended` | Apple AI **training** opt-out token | future Apple AI training use |
| Amazon | `Amazonbot` | Alexa/Amazon AI | Amazon AI surfaces |
| ByteDance | `Bytespider` | TikTok/Doubao AI | those surfaces |
| Common Crawl | `CCBot` | Open dataset many models train on | broad downstream training |
| Meta | `meta-externalagent` | Meta AI training/retrieval | Meta AI surfaces |

**Key nuance:** Google AI Overviews and AI Mode are served from the **normal Googlebot index**, 
there is no separate "allow AIO" toggle. If Googlebot can crawl and you're indexable, you're eligible.
`Google-Extended` and `Applebot-Extended` are *training opt-out tokens*, not retrieval crawlers, 
allowing them affects training use, not whether you appear in live answers.

## Want maximum AI visibility? robots.txt
```
# Allow live AI retrieval/search crawlers (these put you in AI answers)
User-agent: OAI-SearchBot
Allow: /
User-agent: ChatGPT-User
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: Claude-User
Allow: /
User-agent: Googlebot
Allow: /

# (Optional) opt OUT of model training while staying in live answers:
User-agent: GPTBot
Disallow: /
User-agent: ClaudeBot
Disallow: /
User-agent: CCBot
Disallow: /
User-agent: Google-Extended
Disallow: /

Sitemap: https://example.com/sitemap.xml
```
> Decide per business: keep training bots if you want long-term model familiarity; block them if your
> content is your moat. **But keep the live retrieval bots (`OAI-SearchBot`, `PerplexityBot`,
> `ChatGPT-User`, `Claude-User`, `Googlebot`) allowed if you want to be cited.**

## Verify
```bash
curl -s https://example.com/robots.txt
# Then confirm a specific bot isn't disallowed:
curl -s https://example.com/robots.txt | grep -iA3 -E 'GPTBot|OAI-SearchBot|PerplexityBot|ClaudeBot|Claude-User|Google-Extended'
```
Cross-check real bot hits in your server/access logs, robots.txt states intent; logs show reality.

> robots.txt is **advisory**, well-behaved bots honour it, and a `Disallow` does not deindex an
> already-known page. To remove a page from results use `noindex` (and keep it crawlable so the
> directive is seen). See `PLAYBOOK.md` §2.4.
