#!/usr/bin/env node
// chunk-sim, Retrieval-Unit simulator. Zero deps, Node 18+.
//
// AI answer engines (esp. Perplexity) retrieve at the PASSAGE level: they split your page into
// chunks, embed them, rerank with a cross-encoder, and quote the winning chunk, often ripped out
// of all page context. So the real unit of GEO is the CHUNK, not the page.
//
// This tool splits a page the way a RAG pipeline would (~220 words, heading-anchored), then scores
// each chunk for STANDALONE citability: would this block make sense, and get cited, on its own?
//
//   node chunk-sim.mjs <url> [--max=200] [--json]
//
// It is a heuristic PRIOR (like the audit's foundational score), pair it with judgment.

const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith("--"));
const opt = (k, d) => (args.find((a) => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const flag = (k) => args.includes(`--${k}`);
if (!url) { console.error('Usage: node chunk-sim.mjs <url> [--max=200] [--json]'); process.exit(1); }
const CHUNK_WORDS = parseInt(opt("max", "220"), 10);

const clean = (s) => s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (compatible; seo-geo-playbook-ok chunk-sim)" } });
if (!res.ok) { console.error(`HTTP ${res.status} for ${url}`); process.exit(2); }
let html = await res.text();
html = html.replace(/<(script|style|nav|footer|header|form|aside)[\s\S]*?<\/\1>/gi, " ");

// Extract block-level units in document order, tracking the nearest preceding heading.
const blocks = [];
let heading = null;
const re = /<(h[1-6]|p|li)[^>]*>([\s\S]*?)<\/\1>/gi;
let m;
while ((m = re.exec(html))) {
  const tag = m[1].toLowerCase();
  const t = clean(m[2]);
  if (!t || t.split(/\s+/).length < 3) continue;
  if (/^h[1-6]$/.test(tag)) { heading = t; continue; }
  blocks.push({ heading, text: t });
}

// Group consecutive blocks (sharing a heading) into ~CHUNK_WORDS chunks.
const chunks = [];
let cur = null;
for (const b of blocks) {
  if (!cur || cur.heading !== b.heading || cur.words >= CHUNK_WORDS) {
    cur = { heading: b.heading, text: b.text, words: b.text.split(/\s+/).length };
    chunks.push(cur);
  } else {
    cur.text += " " + b.text;
    cur.words += b.text.split(/\s+/).length;
  }
}
if (!chunks.length) { console.error("No extractable text blocks (page may be client-rendered, AI crawlers would see the same nothing)."); process.exit(3); }

// Score one chunk 0-100 for standalone citability.
const DANGLERS = /^(however|therefore|thus|this means|as a result|moreover|in addition|also|but|so|because|which|that is why|for this reason|consequently|then|finally|first|second|third)\b/i;
const PRONOUN_START = /^(it|this|that|these|those|they|he|she|we|you|i)\b/i;
const NAV_NOISE = /(click here|read more|learn more|sign up|subscribe|cookie|privacy policy|all rights reserved|©)/i;

function scoreChunk(c) {
  let s = 100; const flags = [];
  const w = c.words;
  const hasNumber = /\b\d/.test(c.text);
  const hasProperNoun = /\b[A-Z][a-z]{2,}/.test(c.text.replace(/^[A-Z]/, "x")); // a capital mid-sentence
  const endsClean = /[.!?]”?$/.test(c.text);
  const subjectNamed = c.heading || hasProperNoun;

  if (w < 25) { s -= 35; flags.push("too short to stand alone (<25w)"); }
  if (w > 320) { s -= 10; flags.push("very long, may be split mid-thought"); }
  if (DANGLERS.test(c.text)) { s -= 25; flags.push("opens with a connective, depends on the previous chunk"); }
  if (PRONOUN_START.test(c.text)) { s -= 25; flags.push("opens with a pronoun, unclear subject when retrieved alone"); }
  if (!subjectNamed) { s -= 20; flags.push("no named subject (no heading, no proper noun), ambiguous out of context"); }
  if (!hasNumber && !hasProperNoun) { s -= 15; flags.push("no concrete signal (number/date/name), low evidence density"); }
  if (!endsClean) { s -= 10; flags.push("does not end on a complete sentence"); }
  if (NAV_NOISE.test(c.text)) { s -= 20; flags.push("contains nav/boilerplate noise"); }
  if (!c.heading) { s -= 10; flags.push("not anchored to a heading, loses topical context"); }
  return { score: Math.max(0, s), flags, words: w };
}

const scored = chunks.map((c) => ({ heading: c.heading || "(no heading)", preview: c.text.slice(0, 110), ...scoreChunk(c), text: c.text }));
const overall = Math.round(scored.reduce((a, c) => a + c.score, 0) / scored.length);
const worst = scored.slice().sort((a, b) => a.score - b.score).slice(0, 8);

const out = { url, chunks: scored.length, chunkWordTarget: CHUNK_WORDS, retrievabilityScore: overall,
  worstChunks: worst.map((c) => ({ heading: c.heading, score: c.score, words: c.words, flags: c.flags, preview: c.preview })) };

if (flag("json")) { console.log(JSON.stringify(out, null, 2)); }
else {
  const bar = (n) => "█".repeat(Math.round(n / 5)).padEnd(20, "░");
  console.log(`\n  Retrieval-Unit simulation, ${url}`);
  console.log(`  Split into ${scored.length} chunks (~${CHUNK_WORDS}w, the way a RAG pipeline would)\n`);
  console.log(`  RETRIEVABILITY: ${overall}/100  (avg standalone-citability of your chunks)\n`);
  console.log("  Weakest chunks (fix these first, they'd be useless if retrieved alone):");
  for (const c of worst) {
    console.log(`\n    ${bar(c.score)} ${String(c.score).padStart(3)}  under "${c.heading}"`);
    console.log(`    "${c.preview}..."`);
    for (const f of c.flags) console.log(`      - ${f}`);
  }
  console.log("\n  Rule of thumb: every chunk should name its subject, make one self-contained claim,");
  console.log("  carry a concrete signal (number/date/name), and end on a complete sentence.\n");
}
