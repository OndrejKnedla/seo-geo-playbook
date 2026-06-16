#!/usr/bin/env node
// serp-enrich, OPTIONAL live SERP data via DataForSEO. Zero deps, Node 18+.
// Env-gated: does nothing without credentials, so the core audit stays dependency-free.
//
//   export DATAFORSEO_LOGIN="you@example.com"
//   export DATAFORSEO_PASSWORD="your-api-password"
//   node serp-enrich.mjs "<keyword>" [--domain=example.com] [--location=2840] [--json]
//
// location codes: 2840 = US, 2826 = UK, 2276 = Germany (see DataForSEO locations list).

const args = process.argv.slice(2);
const keyword = args.find((a) => !a.startsWith("--"));
const opt = (k, d) => (args.find((a) => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const flag = (k) => args.includes(`--${k}`);

const LOGIN = process.env.DATAFORSEO_LOGIN;
const PASSWORD = process.env.DATAFORSEO_PASSWORD;

if (!LOGIN || !PASSWORD) {
  console.error(
    "serp-enrich is optional and needs DataForSEO credentials.\n" +
    "  export DATAFORSEO_LOGIN=\"you@example.com\"\n" +
    "  export DATAFORSEO_PASSWORD=\"your-api-password\"\n" +
    "Then: node serp-enrich.mjs \"<keyword>\" --domain=example.com --location=2840\n" +
    "See references/data-providers.md for free alternatives (Google Search Console)."
  );
  process.exit(0); // clean exit, never fails a pipeline just because keys are absent
}
if (!keyword) { console.error('Usage: node serp-enrich.mjs "<keyword>" [--domain=] [--location=2840] [--json]'); process.exit(1); }

const domain = opt("domain", "");
const location = parseInt(opt("location", "2840"), 10);
const auth = "Basic " + Buffer.from(`${LOGIN}:${PASSWORD}`).toString("base64");

const res = await fetch("https://api.dataforseo.com/v3/serp/google/organic/live/advanced", {
  method: "POST",
  headers: { "Authorization": auth, "Content-Type": "application/json" },
  body: JSON.stringify([{ keyword, location_code: location, language_code: "en", depth: 20 }]),
});

if (!res.ok) { console.error(`DataForSEO HTTP ${res.status}: ${await res.text()}`); process.exit(2); }
const data = await res.json();
const task = data.tasks?.[0];
if (!task || task.status_code !== 20000) { console.error(`DataForSEO error: ${task?.status_message || JSON.stringify(data)}`); process.exit(2); }

const items = (task.result?.[0]?.items || []).filter((i) => i.type === "organic");
const ranked = items
  .map((i) => ({ position: i.rank_absolute ?? i.rank_group, title: i.title, url: i.url, domain: i.domain }))
  .filter((i) => i.url);

const mine = domain ? ranked.find((r) => (r.domain || "").includes(domain.replace(/^www\./, ""))) : null;
const out = { keyword, location, totalOrganic: ranked.length, yourDomain: domain || null, yourPosition: mine ? mine.position : null, top10: ranked.slice(0, 10) };

if (flag("json")) { console.log(JSON.stringify(out, null, 2)); }
else {
  console.log(`\n  Live Google SERP, "${keyword}" (location ${location})\n`);
  out.top10.forEach((r) => console.log(`    ${String(r.position).padStart(2)}. ${r.domain}, ${(r.title || "").slice(0, 70)}`));
  if (domain) {
    console.log(mine ? `\n  ✅ ${domain} ranks at position ${mine.position}.` : `\n  ❌ ${domain} not found in the top ${ranked.length}.`);
  }
  console.log("");
}
