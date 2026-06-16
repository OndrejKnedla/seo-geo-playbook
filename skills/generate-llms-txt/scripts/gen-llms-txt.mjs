#!/usr/bin/env node
// gen-llms-txt, build a draft /llms.txt from a site's sitemap. Zero deps, Node 18+.
// Output is a STARTING POINT: an agent should edit the summary, group sections, and prune.
//
// Usage: node gen-llms-txt.mjs <site-url> [--title="Brand"] [--max=80] [--out=llms.txt]

const args = process.argv.slice(2);
const site = args.find((a) => !a.startsWith("--"));
const opt = (k, d) => (args.find((a) => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
if (!site) { console.error("Usage: node gen-llms-txt.mjs <site-url> [--title=] [--max=80] [--out=]"); process.exit(1); }

const MAX = parseInt(opt("max", "80"), 10);
const OUT = opt("out", "");
const origin = new URL(site).origin;
const UA = "Mozilla/5.0 (compatible; seo-geo-playbook-ok llms-txt generator)";

async function get(u) {
  try { const r = await fetch(u, { headers: { "user-agent": UA } }); return r.ok ? await r.text() : ""; }
  catch { return ""; }
}

// gather sitemap urls (handles sitemap index → child sitemaps)
async function sitemapUrls(url, depth = 0) {
  const xml = await get(url);
  if (!xml) return [];
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((m) => m[1].trim());
  if (/<sitemapindex/i.test(xml) && depth < 2) {
    const all = [];
    for (const child of locs.slice(0, 20)) all.push(...(await sitemapUrls(child, depth + 1)));
    return all;
  }
  return locs;
}

let urls = await sitemapUrls(origin + "/sitemap.xml");
if (!urls.length) urls = [site];
urls = [...new Set(urls.filter((u) => { try { return new URL(u).host === new URL(site).host; } catch { return false; } }))];

// fetch a title for each (capped, polite, concurrent in small batches)
async function titleOf(u) {
  const html = await get(u);
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const d = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
  return { url: u, title: m ? m[1].replace(/\s+/g, " ").trim() : new URL(u).pathname, desc: d ? d[1].trim() : "" };
}
const picked = urls.slice(0, MAX);
const items = [];
for (let i = 0; i < picked.length; i += 8) {
  items.push(...(await Promise.all(picked.slice(i, i + 8).map(titleOf))));
}

// group by first path segment
const groups = {};
for (const it of items) {
  let seg = "Pages";
  try { seg = (new URL(it.url).pathname.split("/").filter(Boolean)[0] || "Home"); } catch {}
  seg = seg.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  (groups[seg] ||= []).push(it);
}

const brand = opt("title", new URL(site).host.replace(/^www\./, ""));
let out = `# ${brand}\n\n`;
out += `> TODO: one-paragraph summary of what ${brand} is and who it is for. Keep it factual and consistent with the rest of the site (same prices, one canonical host, exact brand spelling).\n\n`;
for (const [g, list] of Object.entries(groups)) {
  out += `## ${g}\n\n`;
  for (const it of list) {
    const label = it.title || it.url;
    out += `- [${label}](${it.url})${it.desc ? `: ${it.desc.slice(0, 140)}` : ""}\n`;
  }
  out += "\n";
}
out += `## Optional\n\n- [Sitemap](${origin}/sitemap.xml)\n`;

if (OUT) { const fs = await import("node:fs"); fs.writeFileSync(OUT, out); console.error(`Wrote ${OUT} (${items.length} urls). Edit the summary + prune before shipping.`); }
else { process.stdout.write(out); }
