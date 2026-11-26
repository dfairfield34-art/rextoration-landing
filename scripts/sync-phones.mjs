#!/usr/bin/env node
// Keeps every phone number on the site in sync with site.config.json.
//
//   1. Change a number in site.config.json
//   2. Run:  node scripts/sync-phones.mjs
//   3. Commit the changed files
//
// The script remembers the last numbers it applied in .phones.lock.json, finds
// every spelling of each old number (408.528.4780, 408-528-4780,
// (408) 528-4780, tel:+14085284780, +1-408-528-4780) and swaps in the new one,
// keeping the same spelling.
//
//   node scripts/sync-phones.mjs --check   fails if a page has a number that is
//                                          not in site.config.json (used by CI)
//   node scripts/sync-phones.mjs --root ../other-site   run on another folder
//   node scripts/sync-phones.mjs --init    first-time setup: records the numbers
//                                          the pages use today (site.config.json)

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const args = process.argv.slice(2);
const check = args.includes("--check");
const rootIdx = args.indexOf("--root");
const root = rootIdx >= 0 ? args[rootIdx + 1] : process.cwd();

const configPath = join(root, "site.config.json");
const lockPath = join(root, ".phones.lock.json");
const config = JSON.parse(readFileSync(configPath, "utf8")).phones;
const writeLock = () =>
  writeFileSync(lockPath, JSON.stringify({ _readme: "Written by scripts/sync-phones.mjs. Do not edit by hand.", phones: config }, null, 2) + "\n");
if (args.includes("--init")) {
  writeLock();
  console.log("Recorded current numbers in .phones.lock.json. Now edit site.config.json and run the sync.");
  process.exit(0);
}
if (!existsSync(lockPath)) {
  console.error("No .phones.lock.json yet. Make sure site.config.json lists the numbers the pages use TODAY, run --init, then change the config.");
  process.exit(1);
}
const lock = JSON.parse(readFileSync(lockPath, "utf8")).phones;

const digits = (s) => s.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
for (const [key, value] of Object.entries(config)) {
  if (digits(value).length !== 10) {
    console.error(`site.config.json: "${key}" must be a 10-digit US number, got "${value}"`);
    process.exit(1);
  }
}

// Every spelling the site uses.
const spellings = [
  (d) => `+1-${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`,
  (d) => `+1${d}`,
  (d) => `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`,
  (d) => `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`,
  (d) => `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`,
];

const exts = [".html", ".xml", ".txt", ".webmanifest", ".json"];
const skip = new Set([".git", "node_modules", "scripts", ".github"]);
const skipFiles = new Set(["site.config.json", ".phones.lock.json", "package.json"]);
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (skip.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (exts.some((e) => name.endsWith(e)) && !skipFiles.has(name)) out.push(p);
  }
  return out;
}
const files = walk(root);

if (check) {
  const allowed = new Set(Object.values(config).map(digits));
  const stale = Object.keys(config).filter((k) => digits(config[k]) !== digits(lock[k] ?? ""));
  let bad = 0;
  if (stale.length) {
    console.error(`site.config.json changed (${stale.join(", ")}) but sync was not run. Run: node scripts/sync-phones.mjs`);
    bad++;
  }
  const phoneRe = /(?:\+1-?)?\(?\b\d{3}\)?[ .-]\d{3}[ .-]\d{4}\b|\+1\d{10}\b/g;
  for (const f of files) {
    const text = readFileSync(f, "utf8");
    for (const m of text.matchAll(phoneRe)) {
      if (!allowed.has(digits(m[0]))) {
        console.error(`${relative(root, f)}: unknown phone number "${m[0]}" (not in site.config.json)`);
        bad++;
      }
    }
  }
  if (bad) process.exit(1);
  console.log(`OK: ${files.length} files, every phone number matches site.config.json`);
  process.exit(0);
}

let changedFiles = 0;
for (const f of files) {
  let text = readFileSync(f, "utf8");
  const before = text;
  for (const key of Object.keys(config)) {
    const oldD = digits(lock[key] ?? config[key]);
    const newD = digits(config[key]);
    if (oldD === newD) continue;
    for (const fmt of spellings) text = text.split(fmt(oldD)).join(fmt(newD));
  }
  if (text !== before) {
    writeFileSync(f, text);
    changedFiles++;
    console.log(`updated ${relative(root, f)}`);
  }
}
writeLock();
console.log(changedFiles ? `Done. ${changedFiles} file(s) updated.` : "Nothing to change; every page already matches site.config.json.");
