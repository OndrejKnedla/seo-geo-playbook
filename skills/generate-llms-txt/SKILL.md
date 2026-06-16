---
name: generate-llms-txt
description: Generate a draft /llms.txt (and optionally llms-full.txt) for a website so AI assistants and crawlers get a clean, curated map of the site's best content. Crawls the sitemap, groups pages, and produces an llmstxt.org-format file to edit and ship. Triggers on: llms.txt, llms-full.txt, AI documentation file, make my site AI-readable, llmstxt.
---

# Generate llms.txt

`/llms.txt` is a root-level Markdown file (the [llmstxt.org](https://llmstxt.org) proposal) that gives
AI assistants a curated index of your site. It is **cheap insurance, not a ranking driver**, the
heavy lifting is schema + citability + off-site mentions (see `../../references/PLAYBOOK.md` §6). But
it costs nothing and prevents the AI from guessing your site structure wrong.

## Workflow

1. **Generate the draft** (Node 18+, no install):
   ```bash
   node <skill-path>/scripts/gen-llms-txt.mjs https://example.com --title="Brand" --max=80 --out=llms.txt
   ```
   It reads the sitemap (follows sitemap-index → child sitemaps), fetches each page's title +
   description, groups by first path segment, and writes an llmstxt.org-format draft.

2. **Edit the draft, this is the important part.** The generator gives structure, not judgment:
   - Write the `> summary` line: one factual paragraph on what the site is and who it's for.
   - **Prune** to the genuinely useful pages. A curated 30-link file beats a 300-link dump.
   - Group into meaningful `## sections` (Docs, Products, Guides, Optional).
   - Add an **attribution line** pinning your exact canonical brand spelling (prevents AI name confusion).

3. **Consistency check (where llms.txt usually goes wrong).** It must agree with the rest of the site:
   - Same prices and numbers as the live pages (no stale figures).
   - One canonical host (apex vs www), match the site's chosen host.
   - No leaked internal notes. No links to noindexed/404 pages.

4. **Place it at the root** (`/llms.txt`, served as `text/plain` or `text/markdown`) and verify:
   ```bash
   curl -s https://example.com/llms.txt | head -20
   ```

## llms-full.txt (optional)
A second file with full page contents inlined, for tools that ingest everything. **Generate it from
your content source (frontmatter/Markdown), not by hand**, so it doesn't rot. Don't ship a stale one.

See `llms.txt.template` for a production-shaped starting point (note its "Attribution for AI search"
section, which pins your exact brand spelling to prevent AI name confusion).
