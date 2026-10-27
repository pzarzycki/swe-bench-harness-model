// Fails the build when the source asks for a number, table, series or excerpt that src/data/site.json doesn't have.
// n(), table(), series() and excerpt() throw at runtime, and nothing else evaluates them before a reader opens the page.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const site = JSON.parse(readFileSync(new URL("../src/data/site.json", import.meta.url)));
const files = [];
const walk = (d) => readdirSync(d).forEach((f) => { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(f) && files.push(p); });
walk(fileURLToPath(new URL("../src", import.meta.url)));
const missing = [];
for (const f of files) {
  const src = readFileSync(f, "utf8");
  for (const [, k] of src.matchAll(/\bn\("([A-Za-z]+)"\)/g)) if (!(k in site.numbers)) missing.push(`${f}: number ${k}`);
  for (const [, k] of src.matchAll(/\btable\("([A-Za-z]+)"/g)) if (!(k in site.tables)) missing.push(`${f}: table ${k}`);
  for (const [, k] of src.matchAll(/\b(?:series|records)\("([A-Za-z]+)"/g)) if (!(k in site.series)) missing.push(`${f}: series ${k}`);
  for (const [, k] of src.matchAll(/\bexcerpt\("([\w-]+)"\)/g)) if (!site.excerpts.some((e) => e.id === k)) missing.push(`${f}: excerpt ${k}`);
}
if (missing.length) { console.error("site data is missing keys used in the source:\n  " + missing.join("\n  ")); process.exit(1); }
console.log(`check-keys: ${files.length} files, all numbers, tables, series and excerpts present in site.json`);
