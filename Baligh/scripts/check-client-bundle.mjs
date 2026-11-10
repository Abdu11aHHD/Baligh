#!/usr/bin/env node
/**
 * After `next build`, scans browser-delivered JS for server secrets.
 * Fails if any server-only env var NAME or VALUE appears in .next/static.
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = ".next/static";
if (!existsSync(root)) {
  console.error("✗ .next/static not found — run `npm run build` first");
  process.exit(1);
}
const SERVER_VARS = ["OPENROUTER_API_KEY", "SUPABASE_SERVICE_ROLE_KEY", "REPORT_SIGNING_SECRET", "OPENROUTER_MODEL"];
const needles = [...SERVER_VARS];
for (const v of SERVER_VARS) {
  const val = process.env[v];
  if (val && val.length >= 12 && !val.startsWith("your_") && !val.startsWith("replace_")) needles.push(val);
}
// Markers that only exist in server modules
needles.push("openrouter.ai/api/v1/chat/completions", "service_role");

const files = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(js|mjs|json|map)$/.test(f)) files.push(p);
  }
})(root);

let leaks = 0;
for (const f of files) {
  const text = readFileSync(f, "utf8");
  for (const n of needles) {
    if (text.includes(n)) {
      leaks++;
      console.error(`✗ ${f} contains ${SERVER_VARS.includes(n) || n.length < 40 ? JSON.stringify(n) : "a secret value"}`);
    }
  }
}
if (leaks) process.exit(1);
console.log(`✓ No server secrets or server-only markers in ${files.length} client files`);
