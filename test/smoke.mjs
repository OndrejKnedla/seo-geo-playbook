#!/usr/bin/env node
// Offline smoke test, no network. Validates structure so CI stays green and fast.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let fails = 0;
const ok = (m) => console.log(`  ok  ${m}`);
const bad = (m) => { console.error(`  FAIL ${m}`); fails++; };

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (e === ".git" || e === "node_modules") continue;
    const p = join(dir, e);
    statSync(p).isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
}
const files = walk(root);

// 1. scripts parse
for (const f of files.filter((f) => f.endsWith(".mjs"))) {
  try { execSync(`node --check "${f}"`); ok(`parses: ${f.replace(root + "/", "")}`); }
  catch { bad(`syntax error: ${f}`); }
}

// 2. JSON files are valid
for (const f of files.filter((f) => f.endsWith(".json"))) {
  try { JSON.parse(readFileSync(f, "utf8")); ok(`valid JSON: ${f.replace(root + "/", "")}`); }
  catch (e) { bad(`invalid JSON: ${f} (${e.message})`); }
}

// 3. every SKILL.md has name + description frontmatter
for (const f of files.filter((f) => f.endsWith("SKILL.md"))) {
  const t = readFileSync(f, "utf8");
  const fm = t.startsWith("---") && t.slice(3).split("---")[0];
  if (fm && /\nname:\s*\S/.test("\n" + fm) && /\ndescription:\s*\S/.test("\n" + fm)) ok(`frontmatter: ${f.replace(root + "/", "")}`);
  else bad(`SKILL.md missing name/description: ${f}`);
}

// 4. report template has exactly one placeholder
const tpl = readFileSync(join(root, "skills/seo-geo-audit/assets/report-template.html"), "utf8");
const count = (tpl.match(/__REPORT_JSON__/g) || []).length;
count === 1 ? ok("report-template has exactly one placeholder") : bad(`report-template has ${count} placeholders (expected 1)`);

// 5. plugin manifest references existing skill dirs
const plugin = JSON.parse(readFileSync(join(root, ".claude-plugin/plugin.json"), "utf8"));
for (const s of plugin.skills) {
  try { statSync(join(root, s, "SKILL.md")); ok(`plugin skill exists: ${s}`); }
  catch { bad(`plugin.json points to missing skill: ${s}`); }
}

console.log(fails ? `\n${fails} check(s) failed.` : `\nAll smoke checks passed.`);
process.exit(fails ? 1 : 0);
