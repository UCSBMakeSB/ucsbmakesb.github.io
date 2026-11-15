import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { validateApplication } from "../lib/application-validation.js";
import {
  LEGACY_SCHOOL_NAMES,
  OTHER_LABEL,
  OTHER_PROMPT,
  SCHOOL_MAX_LENGTH,
  UCSB_NAME,
  UCSB_VALUE,
  buildSchoolIndex,
  canonicalSchoolKey,
  compareSchoolHits,
  exactSchool,
  isLegacyBucket,
  fold,
  schoolDisplayName,
  scoreSchool,
  searchSchools,
  storedSchoolValue,
} from "../lib/schools.js";

const rows = JSON.parse(
  readFileSync(new URL("../public/schools.json", import.meta.url), "utf8"),
);
const index = buildSchoolIndex(rows);
const names = (query, limit) =>
  searchSchools(index, query, limit).map((entry) => entry.name);

function applicationWith(school) {
  const form = new FormData();
  const fields = {
    preferredFirstName: "Gaucho",
    lastName: "Student",
    email: "gaucho@ucsb.edu",
    major: "computer-engineering",
    year: "junior",
    country: "japan",
    school,
    experience: "yes",
    applicationQuestion1: "I want to build a robot.",
  };
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return validateApplication(form);
}

test("dataset is a compact list of [name, country, aliases?] rows", () => {
  assert.ok(
    rows.length > 9000,
    `expected a worldwide list, got ${rows.length}`,
  );
  const seen = new Set();
  for (const [name, country, aliases] of rows) {
    assert.equal(typeof name, "string");
    assert.equal(typeof country, "string");
    assert.ok(aliases === undefined || typeof aliases === "string");
    assert.ok(name.length > 0 && name.length <= SCHOOL_MAX_LENGTH, name);
    const key = `${fold(name)}|${country}`;
    assert.ok(!seen.has(key), `duplicate school ${key}`);
    seen.add(key);
  }
  assert.ok(new Set(rows.map((row) => row[1])).size > 150, "many countries");
});

test("no control characters, stray markers or non-campus rows in the dataset", () => {
  for (const [name, country] of rows) {
    // Upstream had curly quotes decoded as U+0093/U+0094 (invisible, and they
    // would be stored with the application).
    assert.ok(!/[\u0000-\u001f\u007f-\u009f]/.test(name), JSON.stringify(name));
    assert.ok(!/[\u0000-\u001f\u007f-\u009f]/.test(country), JSON.stringify(country));
    assert.ok(!name.includes("|"), name);
    assert.equal(name, name.trim().replace(/\s+/g, " "), JSON.stringify(name));
  }
  const have = new Set(rows.map((row) => row[0]));
  for (const gone of [
    "University of Malawi | Old",
    "California State University System",
    "University of California, Office of the President",
  ]) {
    assert.ok(!have.has(gone), `${gone} should not be selectable`);
  }
  assert.ok(have.has("University of Malawi"), "the real University of Malawi stays");
  assert.ok(have.has('Medical Academy "Ludwik Rydygier" in Bydgoszcz'));
  assert.ok(!names("uc", 25).some((name) => /Office of the President/.test(name)));
  assert.ok(!names("cal state", 25).some((name) => /System/.test(name)));

  // The generator is what enforces this, so a regenerated list stays clean.
  const generator = readFileSync(new URL("../scripts/build-schools.mjs", import.meta.url), "utf8");
  assert.match(generator, /const DROP = new Set/);
  assert.match(generator, /function cleanText/);
});

test("UCSB, SBCC and the old fixed list are all in the dataset", () => {
  const have = new Set(rows.map((row) => row[0]));
  assert.ok(have.has(UCSB_NAME));
  for (const [code, name] of Object.entries(LEGACY_SCHOOL_NAMES)) {
    if (/^(other|out-of-state)/.test(code)) continue;
    assert.ok(have.has(name), `${code} -> ${name} missing from schools.json`);
  }
});

test("searching finds schools by name, acronym and nickname", () => {
  assert.equal(names("Santa Barbara")[0], UCSB_NAME);
  assert.ok(names("Santa Barbara").includes("Santa Barbara City College"));
  assert.equal(names("ucsb")[0], UCSB_NAME);
  assert.equal(names("UC Santa Barbara")[0], UCSB_NAME);
  assert.equal(names("sbcc")[0], "Santa Barbara City College");
  assert.equal(names("ETH")[0], "ETH Zurich");
  assert.equal(names("mit")[0], "Massachusetts Institute of Technology");
  assert.equal(names("cal poly slo")[0], LEGACY_SCHOOL_NAMES.calpoly);
  assert.equal(names("cal state long beach")[0], LEGACY_SCHOOL_NAMES.csulb);
  assert.ok(names("Tokyo").every((name) => /tokyo/i.test(name)));
  assert.ok(names("Tokyo").includes("University of Tokyo"));
  assert.ok(
    names("iit bombay").includes("Indian Institute of Technology, Bombay"),
  );
});

test("the curated-school bonus needs an alias match or a whole word, not a fragment", () => {
  // "stan" is a piece of "Stanislaus": CSU Stanislaus used to outrank Stanford.
  const stan = names("stan");
  assert.equal(stan[0], "Stanford University");
  assert.ok(stan.includes("California State University, Stanislaus"), "still findable");
  assert.ok(
    stan.indexOf("Stanford University") < stan.indexOf("California State University, Stanislaus"),
  );

  // Exact aliases and names still win outright.
  assert.equal(names("ucsb")[0], UCSB_NAME);
  assert.equal(names("UCSB")[0], UCSB_NAME);
  assert.equal(names("mit")[0], "Massachusetts Institute of Technology");
  assert.equal(names("eth")[0], "ETH Zurich");
  assert.equal(names("ETH Zurich")[0], "ETH Zurich");
  assert.equal(names("sbcc")[0], "Santa Barbara City College");

  // A lone letter that merely appears inside a curated name gives no bonus:
  // "u" used to list ETH Zurich ("Zurich") and Humboldt State.
  for (const letter of ["u", "a", "o"]) {
    const top = names(letter);
    assert.ok(!top.includes("ETH Zurich"), `"${letter}" lists ETH Zurich`);
    assert.ok(!top.includes("Humboldt State University"), `"${letter}" lists Humboldt State`);
  }
  assert.equal(names("u")[0], UCSB_NAME, "the host still leads its own alias prefix");

  // Fragments of a name word never get the bonus...
  const score = (name, query) => {
    const entry = index.find((candidate) => candidate.name === name);
    return scoreSchool(entry, fold(query), fold(query).split(" "));
  };
  assert.equal(score("California State University, Stanislaus", "stan"), 3);
  assert.equal(score("ETH Zurich", "u"), 4);
  assert.equal(score("University of Tokyo", "toky"), 3);
  // ...whole words and alias prefixes do.
  assert.equal(score("University of Tokyo", "tokyo"), 1);
  assert.equal(score(UCSB_NAME, "santa barbara"), 1);
  assert.equal(score(UCSB_NAME, "uc santa b"), 3);
  assert.equal(score(UCSB_NAME, "uc"), 0);
  assert.equal(score(UCSB_NAME, "gau"), 1);
  assert.equal(score(LEGACY_SCHOOL_NAMES.csulb, "cal state long beach"), 1);
  assert.equal(score("Stanford University", "stan"), 1);
  assert.equal(score("Stanford University", "zzz"), null);
});

test("keeping only the best rows gives exactly the first rows of a full sort", () => {
  const reference = (query, limit) => {
    const folded = fold(query);
    if (!folded) return [];
    const tokens = folded.split(" ");
    const hits = [];
    for (const entry of index) {
      const score = scoreSchool(entry, folded, tokens);
      if (score !== null) hits.push({ entry, score });
    }
    return hits.sort(compareSchoolHits).slice(0, limit).map((hit) => hit.entry.name);
  };
  const queries = [
    ..."abcdefghijklmnopqrstuvwxyz",
    "un", "uni", "university", "university of", "uc", "ca", "cal", "st", "sa", "san",
    "stan", "santa", "santa b", "santa barbara", "tokyo", "toky", "ucsb", "mit", "eth",
    "college", "institute of technology", "de", "la", "of", "new york", "é", "universidad",
  ];
  for (const query of queries) {
    for (const limit of [1, 8, 25]) {
      assert.deepEqual(names(query, limit), reference(query, limit), `"${query}" limit ${limit}`);
    }
  }
  assert.deepEqual(searchSchools(index, "u", 0), []);
});

test("a one-letter search stays fast enough to run while typing", () => {
  // The old search sorted every match: 30 to 120 ms per keystroke on a laptop.
  // This is a loose ceiling (CI machines vary), not a benchmark.
  for (const query of ["a", "u", "s", "un"]) names(query);
  const started = performance.now();
  for (let run = 0; run < 5; run += 1) {
    for (const query of ["a", "u", "s", "un"]) names(query);
  }
  const perSearch = (performance.now() - started) / 20;
  assert.ok(perSearch < 25, `one search took ${perSearch.toFixed(1)} ms`);
});

test("fold's ASCII shortcut gives the same answer as the general path", () => {
  const general = (text) =>
    String(text ?? "")
      .normalize("NFD")
      .replace(/\p{M}+/gu, "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  for (const [name] of rows) assert.equal(fold(name), general(name), name);
  for (const text of ["", "  ", "A&M -- St. John's (Main)", "Zürich", "École 42", "東京大学", "a\tb\nc", "__x__", undefined, null, 42]) {
    assert.equal(fold(text), general(text), String(text));
  }
});

test("searching ignores case, accents and punctuation, and caps results", () => {
  const withAccent = rows.find((row) => /[À-ſ]/.test(row[0]));
  assert.ok(withAccent, "dataset should include accented names");
  const plain = fold(withAccent[0]);
  assert.ok(names(plain.toUpperCase(), 20).includes(withAccent[0]));
  assert.deepEqual(names("university", 5).length, 5);
  assert.deepEqual(searchSchools(index, "   "), []);
  assert.deepEqual(searchSchools(index, "zzzzqqqq"), []);
});

test("UCSB stores the historical code, every other school stores its name", () => {
  assert.equal(storedSchoolValue(UCSB_NAME, "United States"), UCSB_VALUE);
  const [ucsb] = searchSchools(index, "ucsb", 1);
  assert.equal(ucsb.value, "ucsb");
  const [sbcc] = searchSchools(index, "sbcc", 1);
  assert.equal(sbcc.value, "Santa Barbara City College");
  const [tokyo] = searchSchools(index, "University of Tokyo", 1);
  assert.equal(tokyo.value, "University of Tokyo");
  // A school elsewhere that shares UCSB's name must not become "ucsb".
  assert.equal(storedSchoolValue(UCSB_NAME, "Canada"), UCSB_NAME);
});

test("the picker's last row is 'Other' and asks 'What school?'", () => {
  assert.equal(OTHER_LABEL, "Other");
  assert.equal(OTHER_PROMPT, "What school?");
  const component = readFileSync(
    new URL("../components/school-combobox.jsx", import.meta.url),
    "utf8",
  );
  assert.ok(!/isn't listed|isn.t listed/i.test(component));
  assert.ok(component.includes("OTHER_LABEL") && component.includes("OTHER_PROMPT"));
});

test("old catch-all buckets still show a readable name but are never stored again", () => {
  const expected = {
    other: "Other (school not specified)",
    "other-cc": "Another community college (school not specified)",
    "other-csu": "Another California State University (school not specified)",
    "out-of-state": "Out of state (school not specified)",
  };
  for (const [code, name] of Object.entries(expected)) {
    assert.equal(schoolDisplayName(code), name);
    assert.equal(isLegacyBucket(code), true, code);
    assert.equal(canonicalSchoolKey(code), canonicalSchoolKey(name));
  }
  assert.equal(isLegacyBucket("OTHER"), true);
  assert.equal(isLegacyBucket(" Other "), true);
  for (const value of ["ucsb", "ucla", "Other Hill College", "", undefined, null]) {
    assert.equal(isLegacyBucket(value), false, String(value));
  }
});

test("legacy codes still display and count as the same school", () => {
  assert.equal(schoolDisplayName("ucsb"), UCSB_NAME);
  assert.equal(
    schoolDisplayName("ucla"),
    "University of California, Los Angeles",
  );
  assert.equal(schoolDisplayName("Some Typed School"), "Some Typed School");
  assert.equal(schoolDisplayName(undefined), "");
  assert.equal(canonicalSchoolKey("ucsb"), canonicalSchoolKey(UCSB_NAME));
  assert.equal(
    canonicalSchoolKey("ucla"),
    canonicalSchoolKey("University of California, Los Angeles"),
  );
});

test("server validation accepts every value the picker can store", () => {
  for (const school of [
    "ucsb",
    "Santa Barbara City College",
    "ETH Zurich",
    "  Totally New Academy of Making  ",
    "ucla", // rows saved before the picker
  ]) {
    const result = applicationWith(school);
    assert.equal(
      result.ok,
      true,
      `${school}: ${JSON.stringify(result.errors)}`,
    );
    assert.equal(result.row.school, school.trim());
  }
  // The old catch-all buckets are no longer valid values.
  for (const bucket of ["other", "other-cc", "other-csu", "out-of-state"]) {
    assert.equal(applicationWith(bucket).ok, false, bucket);
  }
  // Empty (nothing chosen) and over-long names are still rejected.
  assert.equal(applicationWith("").ok, false);
  assert.equal(applicationWith("x".repeat(SCHOOL_MAX_LENGTH + 1)).ok, false);
});

test("every school in the list fits the 200 character database column", () => {
  for (const entry of index) {
    assert.ok(entry.value.length <= SCHOOL_MAX_LENGTH, entry.name);
  }
});

test("exactSchool accepts a full name or a unique acronym, never an ambiguous one", () => {
  assert.equal(exactSchool(index, "ucsb").value, "ucsb");
  assert.equal(exactSchool(index, "ETH Zurich").name, "ETH Zurich");
  assert.equal(exactSchool(index, "sbcc").name, "Santa Barbara City College");
  assert.equal(exactSchool(index, "uc"), null); // every UC campus shares it
  assert.equal(exactSchool(index, "Santa"), null);
  assert.equal(exactSchool(index, ""), null);
});
