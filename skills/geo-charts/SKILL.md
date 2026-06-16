---
name: geo-charts
description: Render clean, shareable HTML charts from SEO/GEO data, AI-citation-rate trend over time, score-by-category bars, signal-weight comparisons. Self-contained single-file HTML (no build, no CDN) that screenshots well for reports, decks, and social. Triggers on: GEO chart, visualize citation rate, SEO report chart, AI visibility graph, make a chart of my SEO data.
---

# GEO charts

Turn audit and citation-tracking data into a **single self-contained HTML file** that renders a clean
chart with no build step and no external dependencies (inline SVG + CSS). It screenshots well for a
report, a deck, or a LinkedIn post, which is where GEO results actually get distributed.

## When to use
- After `track-ai-citations`: plot the citation-rate line at baseline / +30 / +90 days, per engine.
- After `seo-geo-audit`: a score-by-category bar chart (the bottleneck at a glance).
- For stakeholder buy-in: the signal-weight comparison (brand mentions ≈ 3× backlinks; see GEO-ADOPTION.md).

## Workflow
1. Get the data (from a skill's CSV/JSON output, or ask the user).
2. Copy `examples/citation-trend.html` as a base and edit the inline `DATA` array. Keep it one file.
3. Pick the chart type:
   - **Line**, citation rate over time (the headline GEO chart).
   - **Bar**, score by category, or citation rate by engine.
   - **Comparison**, signal weights / before-after.
4. Keep the styling restrained: dark background, one accent per series, readable labels, a clear title
   and source line. No chartjunk.
5. Save to the output dir and tell the user to open it / screenshot it.

## Style
No emojis in client-facing charts. Always include a title and a small source/footnote line. Label axes.
Round numbers honestly and note when figures are approximate or directional.
