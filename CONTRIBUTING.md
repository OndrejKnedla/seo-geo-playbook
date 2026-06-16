# Contributing

Thanks for wanting to make this better. The bar is **evidence over opinion**, this repo exists
because most SEO/GEO advice is unmeasured. Keep it that way.

## Principles
- **Every audit rule must be falsifiable from the server HTML** with a one-line `curl`. If you can't
  prove it true/false that way, it doesn't belong in `scripts/audit.mjs`.
- **Stats need a named source and denominator.** Add them to `references/statistics-2026.md` with a
  link and a date. Single-vendor marketing numbers get flagged or excluded.
- **No dependencies in the scripts.** They run on Node 18+ with zero `npm install`. Keep it that way.
- **Tone:** factual, no emojis in client-facing output, no em-dashes, minimal "AI" hype in
  finance/health/legal contexts.

## Adding an audit check
1. Add it to `runChecks()` in `skills/seo-geo-audit/scripts/audit.mjs` (id, category, weight, status, detail).
2. Document it in `skills/seo-geo-audit/references/RULES.md` with its `curl` verification.
3. Test against 2-3 real sites and paste the before/after in your PR.

## Adding a skill
Each skill is a folder under `skills/` with a `SKILL.md` (YAML frontmatter: `name`, `description`).
Keep `description` trigger-rich. Bundle scripts/references the skill needs; reference shared material
in top-level `references/`.

## Updating statistics
GEO moves fast. PRs that re-verify a stat, update a date, or remove a debunked claim are very welcome.
Always date your change.
