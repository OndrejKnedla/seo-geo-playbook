#!/usr/bin/env node
// seo-geo-audit, zero-dependency SEO + GEO auditor.
// Crawls the SERVER-rendered HTML (like curl, not a browser), runs deterministic
// checks, and writes a scored JSON report. Node 18+ only (uses global fetch).
//
// Usage:
//   node audit.mjs <url> [--max-pages=10] [--out=report.json] [--json] [--ua=...]
//
// The foundational score it produces is HALF of the final grade. The other half is
// the 6-dimension intelligence rubric an agent scores by reading the pages
// (see ../references/INTELLIGENCE-RUBRIC.md). Final = 0.5*foundational + 0.5*intelligence.

const args = process.argv.slice(2);
const startUrl = args.find((a) => !a.startsWith("--"));
const opt = (k, d) => {
  const m = args.find((a) => a.startsWith(`--${k}=`));
  return m ? m.split("=").slice(1).join("=") : d;
};
const flag = (k) => args.includes(`--${k}`);

if (!startUrl) {
  console.error("Usage: node audit.mjs <url> [--max-pages=10] [--out=report.json] [--json]");
  process.exit(1);
}

const MAX_PAGES = Math.min(parseInt(opt("max-pages", "10"), 10) || 10, 30);
const OUT = opt("out", "");
const UA = opt(
  "ua",
  // Identify as a generic AI/SEO crawler so we see what a bot sees.
  "Mozilla/5.0 (compatible; seo-geo-playbook-ok/1.0; +https://github.com/OndrejKnedla/seo-geo-playbook-ok)"
);
const JSON_ONLY = flag("json");

// The exact AI crawler user-agents that matter in 2026. Keep in sync with
// references/ai-crawlers.md.
const AI_BOTS = [
  "GPTBot", "OAI-SearchBot", "ChatGPT-User",   // OpenAI
  "PerplexityBot", "Perplexity-User",           // Perplexity
  "ClaudeBot", "Claude-User", "Claude-SearchBot", "anthropic-ai", // Anthropic
  "Google-Extended",                            // Google AI (Gemini/Vertex training)
  "Applebot-Extended",                          // Apple AI
  "Amazonbot", "Bytespider", "CCBot", "meta-externalagent", // others
];

// ---------- tiny HTML helpers (regex; we want the raw server HTML) ----------
const text = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const attr = (tag, name) => {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i"));
  return m ? m[1].trim() : null;
};

const firstTag = (html, re) => {
  const m = html.match(re);
  return m ? m[0] : null;
};

function parsePage(html, url) {
  const titleM = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleM ? text(titleM[1]) : null;

  const descTag = firstTag(html, /<meta[^>]+name=["']description["'][^>]*>/i);
  const description = descTag ? attr(descTag, "content") : null;

  const canonTag = firstTag(html, /<link[^>]+rel=["']canonical["'][^>]*>/i);
  const canonical = canonTag ? attr(canonTag, "href") : null;

  const robotsTag = firstTag(html, /<meta[^>]+name=["']robots["'][^>]*>/i);
  const robotsMeta = robotsTag ? (attr(robotsTag, "content") || "").toLowerCase() : null;

  const viewport = /<meta[^>]+name=["']viewport["']/i.test(html);
  const langM = html.match(/<html[^>]+lang=["']([^"']+)["']/i);
  const lang = langM ? langM[1] : null;

  const h1Count = (html.match(/<h1[\s>]/gi) || []).length;
  const headings = (html.match(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi) || [])
    .map((h) => {
      const lvl = h.match(/<h([1-6])/i)[1];
      return { level: +lvl, text: text(h).slice(0, 140) };
    })
    .slice(0, 60);

  // JSON-LD from the RAW html (the whole point: AI crawlers read server HTML).
  const ldBlocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const schemaTypes = [];
  let jsonLdValid = true;
  for (const b of ldBlocks) {
    try {
      const parsed = JSON.parse(b[1].trim());
      const collect = (o) => {
        if (!o || typeof o !== "object") return;
        if (Array.isArray(o)) return o.forEach(collect);
        if (o["@type"]) [].concat(o["@type"]).forEach((t) => schemaTypes.push(t));
        if (o["@graph"]) collect(o["@graph"]);
      };
      collect(parsed);
    } catch {
      jsonLdValid = false;
    }
  }

  const og = {};
  for (const m of html.matchAll(/<meta[^>]+property=["'](og:[^"']+)["'][^>]*>/gi)) {
    og[m[1]] = attr(m[0], "content");
  }
  const twitter = /<meta[^>]+name=["']twitter:card["']/i.test(html);

  const links = [...html.matchAll(/<a\s[^>]*href=["']([^"'#]+)["']/gi)].map((m) => m[1]);
  const imgs = [...html.matchAll(/<img\s[^>]*>/gi)].map((m) => m[0]);
  const imgsNoAlt = imgs.filter((t) => attr(t, "alt") === null).length;

  const body = text(html);
  const wordCount = body ? body.split(/\s+/).length : 0;

  // GEO heuristic signals (a deterministic PRIOR; the rubric is the real eval).
  const lower = html.toLowerCase();
  const hasFaqSchema = schemaTypes.some((t) => /faq/i.test(t));
  const hasTable = /<table[\s>]/i.test(html);
  const hasTldr = /(tl;dr|tldr|in short|key takeaway|quick answer|na první pohled|ve zkratce)/i.test(body.slice(0, 600));
  const questionHeadings = headings.filter((h) => /\?|^(how|what|why|when|where|who|jak|co|proč|kdy)/i.test(h.text)).length;
  const stats = (body.match(/\b\d+([.,]\d+)?\s?(%|percent)\b/gi) || []).length + (body.match(/\b\d{4}\b/g) || []).length;
  const author = (() => {
    const a = firstTag(html, /<meta[^>]+name=["']author["'][^>]*>/i);
    if (a) return attr(a, "content");
    return /"author"\s*:/.test(html) ? "(in JSON-LD)" : null;
  })();
  const datePublished = (html.match(/"datePublished"\s*:\s*"([^"]+)"/) || [])[1] || null;
  const dateModified = (html.match(/"dateModified"\s*:\s*"([^"]+)"/) || [])[1] || null;

  return {
    url, title, description, canonical, robotsMeta, viewport, lang,
    h1Count, headings, schemaTypes: [...new Set(schemaTypes)], jsonLdValid,
    jsonLdBlocks: ldBlocks.length, og, twitter,
    internalLinkCount: 0, links, imgCount: imgs.length, imgsNoAlt, wordCount,
    geo: { hasFaqSchema, hasTable, hasTldr, questionHeadings, stats, author, datePublished, dateModified },
  };
}

// ---------- fetch with redirect awareness ----------
async function get(url) {
  try {
    const res = await fetch(url, { headers: { "user-agent": UA, accept: "text/html,*/*" }, redirect: "follow" });
    const finalUrl = res.url;
    const body = await res.text();
    return { ok: res.ok, status: res.status, finalUrl, body, headers: res.headers };
  } catch (e) {
    return { ok: false, status: 0, error: String(e), finalUrl: url, body: "" };
  }
}

function sameHost(a, b) {
  try { return new URL(a).host === new URL(b).host; } catch { return false; }
}

// ---------- crawl ----------
async function crawl() {
  const origin = new URL(startUrl).origin;
  const base = new URL(startUrl);

  // robots.txt
  const robotsRes = await get(origin + "/robots.txt");
  const robotsTxt = robotsRes.ok ? robotsRes.body : "";

  // llms.txt (cheap insurance signal)
  const llmsRes = await get(origin + "/llms.txt");
  const hasLlmsTxt = llmsRes.ok && /\w/.test(llmsRes.body);

  // sitemap
  let sitemapUrls = [];
  const smRes = await get(origin + "/sitemap.xml");
  const hasSitemap = smRes.ok;
  if (smRes.ok) {
    sitemapUrls = [...smRes.body.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((m) => m[1].trim());
  }

  // seed = start url + a few sitemap urls
  const queue = [startUrl, ...sitemapUrls.filter((u) => sameHost(u, startUrl))].slice(0, MAX_PAGES * 2);
  const seen = new Set();
  const pages = [];
  let firstStatus = null, firstFinalUrl = null;

  while (queue.length && pages.length < MAX_PAGES) {
    const url = queue.shift();
    const norm = url.split("#")[0].replace(/\/$/, "") || url;
    if (seen.has(norm)) continue;
    seen.add(norm);
    if (!sameHost(url, startUrl)) continue;

    const res = await get(url);
    if (firstStatus === null) { firstStatus = res.status; firstFinalUrl = res.finalUrl; }
    if (!res.ok || !/text\/html/i.test(res.headers?.get?.("content-type") || "text/html")) continue;

    const page = parsePage(res.body, res.finalUrl);
    // count internal links + enqueue new ones
    let internal = 0;
    for (const l of page.links) {
      let abs;
      try { abs = new URL(l, res.finalUrl).toString(); } catch { continue; }
      if (sameHost(abs, startUrl)) {
        internal++;
        const n = abs.split("#")[0].replace(/\/$/, "") || abs;
        if (!seen.has(n) && queue.length + pages.length < MAX_PAGES * 3) queue.push(abs);
      }
    }
    page.internalLinkCount = internal;
    delete page.links;
    pages.push(page);
  }

  return { origin, base, robotsTxt, hasLlmsTxt, hasSitemap, sitemapCount: sitemapUrls.length, pages, firstStatus, firstFinalUrl };
}

// ---------- checks ----------
const STATUS = { PASS: 100, WARN: 50, FAIL: 0 };
function mk(id, category, weight, status, detail) {
  return { id, category, weight, status, score: STATUS[status], detail };
}

function runChecks(site) {
  const c = [];
  const pages = site.pages;
  const p0 = pages[0] || {};
  const home = site.origin;

  // ---- Technical / crawlability ----
  c.push(mk("https", "Technical", 3, /^https:/.test(site.origin) ? "PASS" : "FAIL",
    /^https:/.test(site.origin) ? "Served over HTTPS" : "Site is not HTTPS"));
  c.push(mk("http-status", "Technical", 3, site.firstStatus === 200 ? "PASS" : "FAIL",
    `Start URL returned ${site.firstStatus}`));
  c.push(mk("host-consistency", "Technical", 2,
    site.firstFinalUrl && sameHost(site.firstFinalUrl, startUrl) ? "PASS" : "WARN",
    `Final host: ${site.firstFinalUrl}`));
  c.push(mk("sitemap", "Technical", 2, site.hasSitemap ? "PASS" : "WARN",
    site.hasSitemap ? `sitemap.xml found (${site.sitemapCount} urls)` : "No /sitemap.xml"));
  c.push(mk("robots-txt", "Technical", 2, site.robotsTxt ? "PASS" : "WARN",
    site.robotsTxt ? "robots.txt present" : "No /robots.txt"));

  // ---- AI / GEO readiness ----
  const blocked = AI_BOTS.filter((b) => {
    const re = new RegExp(`user-agent:\\s*${b}[\\s\\S]*?disallow:\\s*/\\s*(\\n|$)`, "i");
    return re.test(site.robotsTxt);
  });
  c.push(mk("ai-bots-allowed", "AI/GEO", 5, blocked.length === 0 ? "PASS" : "FAIL",
    blocked.length ? `robots.txt blocks AI crawlers: ${blocked.join(", ")}` : "No AI crawlers blocked in robots.txt"));
  c.push(mk("llms-txt", "AI/GEO", 1, site.hasLlmsTxt ? "PASS" : "WARN",
    site.hasLlmsTxt ? "/llms.txt present" : "No /llms.txt (cheap insurance, not a driver)"));

  // ---- Per-page: aggregate pass rate ----
  const frac = (fn) => (pages.length ? pages.filter(fn).length / pages.length : 0);
  const pct = (f) => Math.round(f * 100);

  const fTitle = frac((p) => p.title && p.title.length >= 10);
  c.push(mk("title", "Core SEO", 4, fTitle === 1 ? "PASS" : fTitle >= 0.7 ? "WARN" : "FAIL",
    `${pct(fTitle)}% of pages have a usable <title>`));
  const fTitleLen = frac((p) => p.title && p.title.length >= 30 && p.title.length <= 65);
  c.push(mk("title-length", "Core SEO", 2, fTitleLen >= 0.8 ? "PASS" : fTitleLen >= 0.5 ? "WARN" : "FAIL",
    `${pct(fTitleLen)}% of titles in the 30-65 char sweet spot`));
  const fDesc = frac((p) => p.description && p.description.length >= 50);
  c.push(mk("meta-description", "Core SEO", 3, fDesc >= 0.9 ? "PASS" : fDesc >= 0.6 ? "WARN" : "FAIL",
    `${pct(fDesc)}% of pages have a meta description`));

  // canonical: present + self-referencing (the #1 silent killer)
  const fCanon = frac((p) => p.canonical);
  const fSelfCanon = frac((p) => {
    if (!p.canonical) return false;
    try { return new URL(p.canonical, p.url).toString().replace(/\/$/, "") === p.url.replace(/\/$/, ""); }
    catch { return false; }
  });
  const fCanonToHome = pages.filter((p) => {
    if (!p.canonical) return false;
    try {
      const cu = new URL(p.canonical, p.url).toString().replace(/\/$/, "");
      return cu === home.replace(/\/$/, "") && p.url.replace(/\/$/, "") !== home.replace(/\/$/, "");
    } catch { return false; }
  }).length;
  c.push(mk("canonical-present", "Core SEO", 3, fCanon >= 0.9 ? "PASS" : fCanon >= 0.5 ? "WARN" : "FAIL",
    `${pct(fCanon)}% of pages declare a canonical`));
  c.push(mk("canonical-self", "Core SEO", 4, fCanonToHome > 0 ? "FAIL" : fSelfCanon >= 0.8 ? "PASS" : "WARN",
    fCanonToHome > 0
      ? `${fCanonToHome} deep page(s) canonicalize to the homepage (classic root-layout bug)`
      : `${pct(fSelfCanon)}% of pages self-canonicalize`));

  // H1
  const fH1 = frac((p) => p.h1Count === 1);
  c.push(mk("h1-single", "Core SEO", 2, fH1 >= 0.9 ? "PASS" : fH1 >= 0.6 ? "WARN" : "FAIL",
    `${pct(fH1)}% of pages have exactly one <h1>`));

  // robots meta noindex limbo
  const noindex = pages.filter((p) => p.robotsMeta && /noindex/.test(p.robotsMeta)).length;
  c.push(mk("noindex", "Crawlability", 2, noindex === 0 ? "PASS" : "WARN",
    noindex ? `${noindex} crawled page(s) carry noindex` : "No unexpected noindex on crawled pages"));

  // ---- Content (is it actually IN the server HTML AI crawlers read?) ----
  // The render-gap check: AI crawlers read server HTML. If the body text is near-empty,
  // the content is client-rendered (or thin) and invisible to them, regardless of how
  // good it looks in a browser. This is the GEO-specific cousin of the JSON-LD check.
  const fThin = pages.length ? pages.filter((p) => p.wordCount < 100).length / pages.length : 0;
  c.push(mk("content-in-server-html", "Content", 4,
    fThin === 0 ? "PASS" : fThin <= 0.3 ? "WARN" : "FAIL",
    fThin === 0
      ? "Every crawled page has substantive text in the server HTML"
      : `${pct(fThin)}% of pages have <100 words in the SERVER HTML (likely client-rendered or thin, invisible to AI crawlers)`));

  // Duplicate titles across the crawled set (cannibalization / templating bug).
  const titleCounts = {};
  for (const p of pages) if (p.title) titleCounts[p.title] = (titleCounts[p.title] || 0) + 1;
  const dupTitles = Object.values(titleCounts).filter((n) => n > 1).length;
  c.push(mk("title-unique", "Content", 2, dupTitles === 0 ? "PASS" : "WARN",
    dupTitles === 0 ? "All crawled titles are unique" : `${dupTitles} title(s) are shared by multiple pages`));

  // ---- Structured data (must be in server HTML) ----
  const fLd = frac((p) => p.jsonLdBlocks > 0);
  const fLdValid = pages.length ? pages.filter((p) => p.jsonLdValid).length / pages.length : 1;
  c.push(mk("jsonld-present", "Structured Data", 4, fLd >= 0.8 ? "PASS" : fLd >= 0.4 ? "WARN" : "FAIL",
    `${pct(fLd)}% of pages ship JSON-LD in the SERVER HTML (curl-visible)`));
  c.push(mk("jsonld-valid", "Structured Data", 2, fLdValid === 1 ? "PASS" : "WARN",
    `${pct(fLdValid)}% of JSON-LD blocks parse cleanly`));
  const hasOrg = pages.some((p) => p.schemaTypes.some((t) => /Organization|WebSite/i.test(t)));
  c.push(mk("org-schema", "Structured Data", 1, hasOrg ? "PASS" : "WARN",
    hasOrg ? "Organization/WebSite schema found" : "No Organization/WebSite entity"));

  // ---- Social ----
  const fOg = frac((p) => p.og["og:title"] && p.og["og:image"]);
  c.push(mk("open-graph", "Social", 2, fOg >= 0.8 ? "PASS" : fOg >= 0.4 ? "WARN" : "FAIL",
    `${pct(fOg)}% of pages have og:title + og:image`));

  // ---- Images / a11y ----
  const totalImg = pages.reduce((s, p) => s + p.imgCount, 0);
  const noAlt = pages.reduce((s, p) => s + p.imgsNoAlt, 0);
  const altOk = totalImg ? 1 - noAlt / totalImg : 1;
  c.push(mk("img-alt", "Images", 2, altOk >= 0.9 ? "PASS" : altOk >= 0.6 ? "WARN" : "FAIL",
    `${pct(altOk)}% of <img> have an alt attribute (${noAlt}/${totalImg} missing)`));

  // ---- i18n ----
  const fLang = frac((p) => p.lang);
  c.push(mk("html-lang", "Technical", 1, fLang >= 0.9 ? "PASS" : "WARN",
    `${pct(fLang)}% of pages declare <html lang>`));
  c.push(mk("viewport", "Mobile", 1, frac((p) => p.viewport) >= 0.9 ? "PASS" : "WARN",
    `${pct(frac((p) => p.viewport))}% of pages declare a viewport`));

  // ---- GEO citability heuristics (deterministic prior) ----
  const fAnswer = frac((p) => p.geo.hasTldr);
  c.push(mk("geo-answer-first", "AI/GEO", 3, fAnswer >= 0.4 ? "PASS" : fAnswer > 0 ? "WARN" : "FAIL",
    `${pct(fAnswer)}% of pages open with an answer/TL;DR block (answer-first = 4.8x citations)`));
  const fQ = frac((p) => p.geo.questionHeadings >= 1);
  c.push(mk("geo-question-headings", "AI/GEO", 2, fQ >= 0.4 ? "PASS" : fQ > 0 ? "WARN" : "FAIL",
    `${pct(fQ)}% of pages use question-style headings / FAQ structure`));
  const fStats = frac((p) => p.geo.stats >= 3);
  c.push(mk("geo-evidence", "AI/GEO", 2, fStats >= 0.5 ? "PASS" : fStats > 0 ? "WARN" : "FAIL",
    `${pct(fStats)}% of pages carry specific numbers/dates (stats = +40% citation)`));
  const fDates = frac((p) => p.geo.datePublished || p.geo.dateModified);
  c.push(mk("geo-freshness", "AI/GEO", 1, fDates >= 0.5 ? "PASS" : fDates > 0 ? "WARN" : "FAIL",
    `${pct(fDates)}% of pages expose a published/modified date`));
  const fAuthor = frac((p) => p.geo.author);
  c.push(mk("geo-author", "E-E-A-T", 2, fAuthor >= 0.5 ? "PASS" : fAuthor > 0 ? "WARN" : "FAIL",
    `${pct(fAuthor)}% of pages name a human author (highest-leverage E-E-A-T fix for YMYL)`));

  return c;
}

// ---------- scoring ----------
function score(checks) {
  // weighted average of all check scores by their weight
  const totalW = checks.reduce((s, c) => s + c.weight, 0);
  const got = checks.reduce((s, c) => s + c.score * c.weight, 0);
  const foundational = totalW ? Math.round(got / totalW) : 0;
  const grade =
    foundational >= 90 ? "A" : foundational >= 80 ? "B" :
    foundational >= 70 ? "C" : foundational >= 60 ? "D" :
    foundational >= 50 ? "E" : "F";
  // group by category
  const byCat = {};
  for (const c of checks) {
    (byCat[c.category] ||= []).push(c);
  }
  const categories = Object.entries(byCat).map(([name, cs]) => {
    const w = cs.reduce((s, c) => s + c.weight, 0);
    const g = cs.reduce((s, c) => s + c.score * c.weight, 0);
    return { name, score: Math.round(g / w), checks: cs.length };
  }).sort((a, b) => a.score - b.score);
  return { foundationalScore: foundational, foundationalGrade: grade, categories };
}

// ---------- main ----------
const site = await crawl();
if (site.pages.length === 0) {
  console.error(`ERROR: crawled 0 pages from ${startUrl} (status ${site.firstStatus}). Not fabricating a score.`);
  process.exit(2);
}
const checks = runChecks(site);
const scoring = score(checks);
const fails = checks.filter((c) => c.status === "FAIL");
const warns = checks.filter((c) => c.status === "WARN");

const prioritizedFixes = [...fails, ...warns]
  .sort((a, b) => b.weight - a.weight)
  .map((c) => ({ id: c.id, category: c.category, severity: c.status, weight: c.weight, detail: c.detail }));

// pages for the agent's intelligence rubric
const pagesForReview = site.pages
  .slice()
  .sort((a, b) => b.wordCount - a.wordCount)
  .slice(0, 5)
  .map((p) => ({
    url: p.url, title: p.title, metaDescription: p.description, h1Count: p.h1Count,
    headings: p.headings.map((h) => `H${h.level}: ${h.text}`).slice(0, 25),
    schemaTypes: p.schemaTypes, wordCount: p.wordCount, internalLinkCount: p.internalLinkCount,
    author: p.geo.author, datePublished: p.geo.datePublished, dateModified: p.geo.dateModified,
    geoSignals: p.geo,
  }));

const report = {
  meta: { tool: "seo-geo-playbook-ok", version: "1.0", url: startUrl, crawledPages: site.pages.length, generatedNote: "foundational only; combine with INTELLIGENCE-RUBRIC for final grade" },
  scoring, checks, prioritizedFixes, pagesForReview,
  site: { origin: site.origin, hasSitemap: site.hasSitemap, hasLlmsTxt: site.hasLlmsTxt, sitemapCount: site.sitemapCount },
};

if (OUT) {
  const fs = await import("node:fs");
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
}
if (JSON_ONLY) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const bar = (n) => "█".repeat(Math.round(n / 5)).padEnd(20, "░");
  console.log(`\n  SEO + GEO audit, ${startUrl}`);
  console.log(`  Crawled ${site.pages.length} page(s)\n`);
  console.log(`  FOUNDATIONAL SCORE: ${scoring.foundationalScore}/100  →  GRADE ${scoring.foundationalGrade}`);
  console.log(`  (this is HALF the grade; add the 6-dim intelligence rubric for the final)\n`);
  console.log("  By category (worst first):");
  for (const cat of scoring.categories) console.log(`    ${bar(cat.score)} ${String(cat.score).padStart(3)}  ${cat.name}`);
  if (fails.length) {
    console.log("\n  ❌ FAILS:");
    for (const c of fails) console.log(`    [${c.category}] ${c.id}, ${c.detail}`);
  }
  if (warns.length) {
    console.log("\n  ⚠️  WARNINGS:");
    for (const c of warns.slice(0, 12)) console.log(`    [${c.category}] ${c.id}, ${c.detail}`);
  }
  if (OUT) console.log(`\n  Full JSON written to ${OUT}`);
  console.log("");
}
