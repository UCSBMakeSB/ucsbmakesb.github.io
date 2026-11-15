// Pure helpers for the school picker. No React or browser APIs here, so they
// can be unit-tested with `node --test` and reused by scripts.
//
// The list itself lives in public/schools.json (built by
// scripts/build-schools.mjs from Hipo/university-domains-list) and is fetched
// lazily by components/school-combobox.jsx. Rows are [name, country, aliases?]
// where aliases is a space-separated, already-folded search string
// (acronyms and nicknames such as "ucsb cal state long beach").

// What gets stored in applications.school.
//  - UCSB keeps its historical code "ucsb" so anything keyed on it is unchanged.
//  - Every other listed school stores its full name from the list.
//  - "Other" reveals a required "What school?" field, and the typed name is
//    what gets stored. Nothing stores the word "other" any more.
export const UCSB_VALUE = "ucsb";
export const UCSB_NAME = "University of California, Santa Barbara";
export const SCHOOL_MAX_LENGTH = 200; // lib/application-validation.js + schema.sql
export const OTHER_LABEL = "Other"; // the last row of the picker
export const OTHER_PROMPT = "What school?"; // required field shown for Other

// Values written by the old fixed <select>. Rows saved before the picker still
// hold these, so the portal profile maps them back to a readable name.
// The four catch-all buckets below are display-only: they are never written
// again (see isLegacyBucket), but old rows keep them.
export const LEGACY_SCHOOL_NAMES = {
  ucsb: UCSB_NAME,
  sbcc: "Santa Barbara City College",
  ucla: "University of California, Los Angeles",
  calpoly: "California Polytechnic State University, San Luis Obispo",
  csulb: "California State University, Long Beach",
  csuf: "California State University, Fullerton",
  uci: "University of California, Irvine",
  ucr: "University of California, Riverside",
  ucsd: "University of California, San Diego",
  ucsc: "University of California, Santa Cruz",
  ucm: "University of California, Merced",
  ucb: "University of California, Berkeley",
  ucd: "University of California, Davis",
  "other-csu": "Another California State University (school not specified)",
  "other-cc": "Another community college (school not specified)",
  "out-of-state": "Out of state (school not specified)",
  other: "Other (school not specified)",
};

// Old catch-all choices that say nothing about which school it is.
const LEGACY_BUCKETS = ["other-csu", "other-cc", "out-of-state", "other"];

/** True for an old catch-all value ("other-cc", "out-of-state", "Other", ...). */
export function isLegacyBucket(value) {
  return (
    typeof value === "string" &&
    LEGACY_BUCKETS.includes(value.trim().toLowerCase())
  );
}

/** Lowercase, strip accents, turn punctuation into spaces, collapse spaces. */
export function fold(text) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** Value to store for a school picked from the list. */
export function storedSchoolValue(name, country) {
  if (name === UCSB_NAME && (!country || country === "United States")) {
    return UCSB_VALUE;
  }
  return name;
}

/** Readable text for a stored value (legacy code, list name or typed name). */
export function schoolDisplayName(value) {
  if (typeof value !== "string") return "";
  return Object.hasOwn(LEGACY_SCHOOL_NAMES, value)
    ? LEGACY_SCHOOL_NAMES[value]
    : value;
}

/**
 * One comparable name per school for counting distinct schools: maps legacy
 * codes (including "ucsb") to the full list name and folds case/punctuation.
 */
export function canonicalSchoolKey(value) {
  return fold(schoolDisplayName(value));
}

/** Turn raw [name, country, aliases?] rows into searchable entries. */
export function buildSchoolIndex(rows) {
  const entries = [];
  for (const row of rows) {
    if (!Array.isArray(row) || typeof row[0] !== "string") continue;
    const [name, country = "", aliases = ""] = row;
    const nameFold = fold(name);
    entries.push({
      name,
      country,
      value: storedSchoolValue(name, country),
      nameFold,
      nameWords: nameFold.split(" "),
      aliasWords: aliases ? aliases.split(" ").filter(Boolean) : [],
      hasAlias: Boolean(aliases),
    });
  }
  return entries;
}

// Lower is better. Returns null when the entry does not match.
function scoreEntry(entry, query, tokens) {
  const { nameFold, nameWords, aliasWords } = entry;

  // An alias that is exactly the query ("ucsb", "eth", "mit").
  if (aliasWords.length && aliasWords.includes(query)) return 0;
  if (nameFold === query) return 0;
  if (nameFold.startsWith(query)) return 1;

  // Every token must start some word of the name or an alias.
  const allWordPrefixes = tokens.every(
    (token) =>
      nameWords.some((word) => word.startsWith(token)) ||
      aliasWords.some((word) => word.startsWith(token)),
  );
  if (allWordPrefixes) {
    return aliasWords.length && aliasWords.join(" ").startsWith(query) ? 2 : 3;
  }

  // Fall back to substring matches ("tech" inside "biotechnology").
  const allSubstrings = tokens.every((token) => nameFold.includes(token));
  return allSubstrings ? 4 : null;
}

/**
 * Typeahead search. Ranked: exact alias/name, name prefix, all tokens are word
 * prefixes, then substrings. Schools with curated aliases rank with the prefix matches. Ties favor UCSB, then
 * curated schools, then shorter names.
 */
export function searchSchools(index, rawQuery, limit = 8) {
  const query = fold(rawQuery);
  if (!query) return [];
  const tokens = query.split(" ");
  const hits = [];

  for (const entry of index) {
    let score = scoreEntry(entry, query, tokens);
    if (score === null) continue;
    // Schools with curated aliases are the well-known ones (and UCSB is the
    // host), so they rank with prefix matches: "tokyo" lists the University of
    // Tokyo near the top rather than behind every "Tokyo ..." college.
    if (entry.hasAlias) score = Math.min(score, 1);
    hits.push({ entry, score });
  }

  hits.sort(
    (a, b) =>
      a.score - b.score ||
      Number(b.entry.value === UCSB_VALUE) -
        Number(a.entry.value === UCSB_VALUE) ||
      Number(b.entry.hasAlias) - Number(a.entry.hasAlias) ||
      a.entry.name.length - b.entry.name.length ||
      a.entry.name.localeCompare(b.entry.name),
  );
  return hits.slice(0, limit).map((hit) => hit.entry);
}

/**
 * The one school whose full name, or whose alias, is exactly the query
 * ("ucsb", "sbcc", "ETH Zurich"). Null when nothing or several match, so a
 * shared alias like "uc" never picks a school for the applicant.
 */
export function exactSchool(index, rawQuery) {
  const query = fold(rawQuery);
  if (!query) return null;
  const matches = index.filter(
    (entry) => entry.nameFold === query || entry.aliasWords.includes(query),
  );
  return matches.length === 1 ? matches[0] : null;
}
