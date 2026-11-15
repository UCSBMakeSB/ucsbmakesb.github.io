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

const ASCII_ONLY = /^[\x00-\x7f]*$/;

/** Lowercase, strip accents, turn punctuation into spaces, collapse spaces. */
export function fold(text) {
  const value = String(text ?? "");
  // Nearly every name in the list is plain ASCII, where there are no accents
  // to strip and "letter or digit" is just a-z0-9. Skipping Unicode
  // normalization for those makes building the 10,000-row index several times
  // faster on a phone. The result is identical to the general path below.
  if (ASCII_ONLY.test(value)) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }
  return value
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
    const value = storedSchoolValue(name, country);
    entries.push({
      name,
      country,
      value,
      nameFold,
      nameWords: nameFold.split(" "),
      aliasWords: aliases ? aliases.split(" ").filter(Boolean) : [],
      hasAlias: Boolean(aliases),
      isHost: value === UCSB_VALUE,
    });
  }
  return entries;
}

// Lower is better. Returns null when the entry does not match.
//   0  the query is exactly the name or one of the aliases ("ucsb", "mit")
//   1  the name starts with the query, or a curated match (below)
//   3  every token starts some word of the name or an alias
//   4  every token appears somewhere in the name ("tech" in "biotechnology")
//
// Curated match: schools with aliases are the well-known ones (and UCSB is
// the host), so they rank with the name-prefix matches: "tokyo" lists the
// University of Tokyo near the top rather than behind every "Tokyo ..."
// college, and "santa barbara" lists UCSB first. That bonus is only given
// when each token is the START OF AN ALIAS ("uc", "cal st") or a WHOLE WORD of
// the name ("tokyo", "barbara"). It used to be given for any match at all, so
// "stan" (a piece of "Stanislaus") put CSU Stanislaus above Stanford, and "u"
// (a letter inside "Zurich") listed ETH Zurich.
export function scoreSchool(entry, query, tokens) {
  const { nameFold, nameWords, aliasWords } = entry;

  if (aliasWords.length && aliasWords.includes(query)) return 0;
  if (nameFold === query) return 0;
  if (nameFold.startsWith(query)) return 1;

  let allWordPrefixes = true;
  let curated = aliasWords.length > 0;
  for (let t = 0; t < tokens.length; t += 1) {
    const token = tokens[t];
    let startsAlias = false;
    for (let a = 0; a < aliasWords.length; a += 1) {
      if (aliasWords[a].startsWith(token)) {
        startsAlias = true;
        break;
      }
    }
    let startsName = false;
    let wholeName = false;
    for (let w = 0; w < nameWords.length; w += 1) {
      const word = nameWords[w];
      if (word.startsWith(token)) {
        startsName = true;
        if (word.length === token.length) {
          wholeName = true;
          break;
        }
      }
    }
    if (!startsAlias && !startsName) {
      allWordPrefixes = false;
      break;
    }
    if (!startsAlias && !wholeName) curated = false;
  }
  if (allWordPrefixes) return curated ? 1 : 3;

  for (let t = 0; t < tokens.length; t += 1) {
    if (!nameFold.includes(tokens[t])) return null;
  }
  return 4;
}

// Order of two matches: score, then UCSB, then curated schools, then shorter
// names, then alphabetical. Negative when `a` ranks first.
export function compareSchoolHits(a, b) {
  return (
    a.score - b.score ||
    Number(b.entry.isHost) - Number(a.entry.isHost) ||
    Number(b.entry.hasAlias) - Number(a.entry.hasAlias) ||
    a.entry.name.length - b.entry.name.length ||
    a.entry.name.localeCompare(b.entry.name)
  );
}

/**
 * Typeahead search. Ranked: exact alias/name, name prefix and curated
 * matches, all tokens are word prefixes, then substrings (see scoreSchool).
 * Ties favor UCSB, then curated schools, then shorter names.
 *
 * This runs while the applicant types, on a phone, over about 10,000 rows. A
 * one-letter query matches most of them, and sorting every match (with
 * localeCompare) took 30 to 120 ms on a laptop. Only `limit` rows are ever
 * shown, so only the best `limit` are kept: each match is compared with the
 * worst kept row and usually dropped at once. The result is exactly the first
 * `limit` rows of the full sort (tests/schools.test.mjs checks that).
 */
export function searchSchools(index, rawQuery, limit = 8) {
  const query = fold(rawQuery);
  if (!query || limit < 1) return [];
  const tokens = query.split(" ");
  const top = []; // best first, never longer than `limit`

  for (let i = 0; i < index.length; i += 1) {
    const entry = index[i];
    const score = scoreSchool(entry, query, tokens);
    if (score === null) continue;
    const hit = { entry, score };
    // Full and not better than the worst kept row: an equal row loses to the
    // earlier one, as it would in a stable sort.
    if (top.length === limit && compareSchoolHits(hit, top[limit - 1]) >= 0) {
      continue;
    }
    let position = top.length;
    while (position > 0 && compareSchoolHits(hit, top[position - 1]) < 0) {
      position -= 1;
    }
    top.splice(position, 0, hit);
    if (top.length > limit) top.pop();
  }

  return top.map((hit) => hit.entry);
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
