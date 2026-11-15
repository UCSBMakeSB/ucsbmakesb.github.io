import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { validateApplication } from "../lib/application-validation.js";
import {
  LEGACY_SCHOOL_NAMES,
  SCHOOL_MAX_LENGTH,
  UCSB_NAME,
  UCSB_VALUE,
  buildSchoolIndex,
  canonicalSchoolKey,
  exactSchool,
  fold,
  schoolDisplayName,
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
    mobileNumber: "805-555-0100",
    emergencyContactName: "Parent",
    emergencyContactMobileNumber: "805-555-0101",
    major: "computer-engineering",
    year: "junior",
    age: "20",
    country: "japan",
    school,
    waiver: "on",
    experience: "yes",
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
    "other-cc",
  ]) {
    const result = applicationWith(school);
    assert.equal(
      result.ok,
      true,
      `${school}: ${JSON.stringify(result.errors)}`,
    );
    assert.equal(result.row.school, school.trim());
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
