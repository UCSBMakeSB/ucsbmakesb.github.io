// Builds public/schools.json for the apply form's school picker.
//
//   node scripts/build-schools.mjs [path-or-url-to-world_universities_and_domains.json]
//
// Source: https://github.com/Hipo/university-domains-list (MIT, see
// public/schools.NOTICE.txt). Output rows are [name, country, aliases?], where
// aliases is a space-separated, folded search string. Domains, web pages and
// states are dropped to keep the file small; the picker only needs names.
import { readFile, writeFile } from "node:fs/promises";
import { fold } from "../lib/schools.js";

const SOURCE =
  "https://raw.githubusercontent.com/Hipo/university-domains-list/master/world_universities_and_domains.json";
const OUT = new URL("../public/schools.json", import.meta.url);

// Well-known schools missing from the dataset. Keep this short and obvious.
const EXTRAS = [["El Camino College", "United States", "el camino"]];

// Hand-written search aliases, keyed by "name|country". The build fails if a
// key does not match a row, so a dataset rename cannot silently drop one.
const US = "United States";
const ALIASES = {
  [`University of California, Santa Barbara|${US}`]:
    "ucsb uc santa barbara gauchos",
  [`Santa Barbara City College|${US}`]: "sbcc",
  [`University of California, Los Angeles|${US}`]: "ucla",
  [`University of California, Berkeley|${US}`]: "ucb cal berkeley",
  [`University of California, San Diego|${US}`]: "ucsd",
  [`University of California, Irvine|${US}`]: "uci",
  [`University of California, Davis|${US}`]: "ucd",
  [`University of California, Riverside|${US}`]: "ucr",
  [`University of California, Santa Cruz|${US}`]: "ucsc",
  [`University of California, Merced|${US}`]: "ucm",
  [`University of California, San Francisco|${US}`]: "ucsf",
  [`California Polytechnic State University, San Luis Obispo|${US}`]:
    "cal poly slo calpoly",
  [`California Polytechnic State University, Pomona|${US}`]:
    "cal poly pomona cpp",
  [`California State University, Long Beach|${US}`]: "csulb",
  [`California State University, Fullerton|${US}`]: "csuf",
  [`California State University, Northridge|${US}`]: "csun",
  [`California State University, Los Angeles|${US}`]: "csula",
  [`California State University, Sacramento|${US}`]: "csus sac state",
  [`California State University, Hayward|${US}`]: "csueb cal state east bay",
  [`Humboldt State University|${US}`]: "cal poly humboldt",
  [`San Diego State University|${US}`]: "sdsu",
  [`San Jose State University|${US}`]: "sjsu",
  [`San Francisco State University|${US}`]: "sfsu sf state",
  [`California Institute of Technology|${US}`]: "caltech",
  [`Massachusetts Institute of Technology|${US}`]: "mit",
  [`Georgia Institute of Technology|${US}`]: "georgia tech gatech",
  [`University of Tokyo|Japan`]: "todai",
  [`Tokyo Institute of Technology|Japan`]: "tokyo tech",
  [`ETHZ - ETH Zurich|Switzerland`]: "swiss federal institute technology",
};

// Rewrites for a few awkward dataset names. Keyed like ALIASES.
const RENAMES = {
  "ETHZ - ETH Zurich|Switzerland": "ETH Zurich",
};

// Aliases derived from naming patterns, so campuses do not need listing by hand.
function patternAliases(name, country) {
  const found = [];
  let m;
  if (country === US && (m = name.match(/^University of California, (.+)$/))) {
    found.push(`uc ${m[1]}`);
  }
  if (
    country === US &&
    (m = name.match(/^California State University,? (.+)$/))
  ) {
    found.push(`cal state ${m[1]}`, `csu ${m[1]}`);
  }
  if ((m = name.match(/^Indian Institute of Technology,? (.+)$/))) {
    found.push(`iit ${m[1]}`);
  }
  return found;
}

async function load(source) {
  if (/^https?:/.test(source)) {
    const response = await fetch(source);
    if (!response.ok) throw new Error(`${source}: HTTP ${response.status}`);
    return response.json();
  }
  return JSON.parse(await readFile(source, "utf8"));
}

const source = process.argv[2] ?? SOURCE;
const raw = await load(source);

const seen = new Map();
const used = new Set();
for (const item of [
  ...raw.map((row) => [row.name, row.country]),
  ...EXTRAS.map(([name, country]) => [name, country, "extra"]),
]) {
  const original = String(item[0] ?? "")
    .replace(/\s+/g, " ")
    .trim();
  const country = String(item[1] ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (!original) continue;
  const key = `${original}|${country}`;
  const name = RENAMES[key] ?? original;
  const dedupe = `${fold(name)}|${country}`;
  if (seen.has(dedupe)) continue;

  const aliases = new Set((ALIASES[key] ?? "").split(" ").filter(Boolean));
  if (key in ALIASES) used.add(key);
  for (const phrase of patternAliases(original, country)) {
    for (const word of fold(phrase).split(" ")) aliases.add(word);
  }
  // Drop alias words the name already contains.
  const nameWords = new Set(fold(name).split(" "));
  const extra = [...aliases].filter((word) => !nameWords.has(word));

  const row = [name, country];
  if (extra.length) row.push(extra.join(" "));
  seen.set(dedupe, row);
}

const missing = Object.keys(ALIASES).filter((key) => !used.has(key));
if (missing.length) {
  throw new Error(`Alias keys not found in the dataset: ${missing.join("; ")}`);
}

// The old fixed list's schools must all be searchable. UCSB and SBCC first.
for (const name of [
  "University of California, Santa Barbara",
  "Santa Barbara City College",
]) {
  if (![...seen.values()].some((row) => row[0] === name)) {
    throw new Error(`Required school missing: ${name}`);
  }
}

const rows = [...seen.values()].sort(
  (a, b) =>
    Number(b[1] === US) - Number(a[1] === US) ||
    a[1].localeCompare(b[1]) ||
    a[0].localeCompare(b[0]),
);
await writeFile(
  OUT,
  `[\n${rows.map((row) => JSON.stringify(row)).join(",\n")}\n]\n`,
);
console.log(`wrote ${rows.length} schools to public/schools.json`);
