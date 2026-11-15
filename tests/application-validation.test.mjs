import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_RESUME_BYTES,
  SHORT_ANSWER_MAX_LENGTH,
  getResumeExtension,
  validateApplication,
} from "../lib/application-validation.js";

function pdf(name = "resume.pdf", size = 1024, type = "application/pdf") {
  return new File([new Uint8Array(size)], name, { type });
}

function validForm(overrides = {}) {
  const fields = {
    preferredFirstName: "Gaucho",
    lastName: "Student",
    email: "Gaucho@UCSB.edu",
    major: "computer-engineering",
    year: "junior",
    country: "united-states",
    school: "ucsb",
    experience: "yes",
    applicationQuestion1: "I want to build a robot.",
    resume: pdf(),
    ...overrides,
  };
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) formData.set(key, value);
  }
  return formData;
}

test("accepts a complete application and normalizes the email", () => {
  const result = validateApplication(validForm());
  assert.equal(result.ok, true);
  assert.equal(result.row.email, "gaucho@ucsb.edu");
  assert.equal(result.row.preferred_first_name, "Gaucho");
  assert.equal(result.row.prior_hackathon_experience, true);
  assert.equal(result.row.application_question_1, "I want to build a robot.");
});

test("does not ask for post-admission details (phone, emergency contact, age, food, waiver)", () => {
  const result = validateApplication(validForm());
  assert.equal(result.ok, true);
  for (const column of [
    "mobile_number",
    "emergency_contact_name",
    "emergency_contact_mobile_number",
    "age",
    "food_allergies",
    "waiver_accepted",
  ]) {
    assert.ok(!(column in result.row), `${column} must not be written by the application form`);
  }
});

test("ignores post-admission fields posted by an old copy of the form, but records a ticked waiver", () => {
  const result = validateApplication(
    validForm({ mobileNumber: "805-555-0100", age: "20", waiver: "on" }),
  );
  assert.equal(result.ok, true);
  assert.ok(!("mobile_number" in result.row));
  assert.ok(!("age" in result.row));
  assert.equal(result.row.waiver_accepted, true);
});

test("the only required free text is one short answer; the second is optional", () => {
  const missing = validateApplication(validForm({ applicationQuestion1: "  " }));
  assert.equal(missing.ok, false);
  assert.ok(missing.errors.applicationQuestion1);

  const oneWord = validateApplication(validForm({ applicationQuestion1: "Robots" }));
  assert.equal(oneWord.ok, true, "there is no minimum length");
  assert.equal(oneWord.row.application_question_2, null);

  const both = validateApplication(validForm({ applicationQuestion2: "github.com/gaucho/rover" }));
  assert.equal(both.row.application_question_2, "github.com/gaucho/rover");

  const tooLong = validateApplication(
    validForm({ applicationQuestion1: "x".repeat(SHORT_ANSWER_MAX_LENGTH + 1) }),
  );
  assert.equal(tooLong.ok, false);
  assert.ok(tooLong.errors.applicationQuestion1);
});

test("accepts a single name (no last name)", () => {
  for (const lastName of [undefined, "", "   "]) {
    const result = validateApplication(validForm({ preferredFirstName: "Sukarno", lastName }));
    assert.equal(result.ok, true);
    assert.equal(result.row.last_name, null);
  }
});

test("accepts names, schools and emails from outside the US and outside UCSB", () => {
  const cases = [
    { preferredFirstName: "José", lastName: "Núñez-O'Brien" },
    { preferredFirstName: "明", lastName: "李" },
    { preferredFirstName: "Αλέξανδρος", lastName: "Παπαδόπουλος" },
    { preferredFirstName: "Zoë", lastName: "van der Berg" },
    { email: "student@iitb.ac.in", country: "india", school: "Indian Institute of Technology Bombay" },
    { email: "first.last+makesb@student.tu-berlin.de", country: "germany", school: "Technische Universität Berlin" },
    // Typed through "Other" > "What school?".
    { email: "someone@gmail.com", country: "other", school: "Maker Academy of Anywhere" },
  ];
  for (const overrides of cases) {
    const result = validateApplication(validForm(overrides));
    assert.equal(result.ok, true, JSON.stringify(overrides));
  }
});

test("the old catch-all school buckets are rejected; the picker stores a name instead", () => {
  for (const school of ["other", "Other", "out-of-state", "other-cc", "other-csu", " OTHER "]) {
    const result = validateApplication(validForm({ school }));
    assert.equal(result.ok, false, school);
    assert.equal(result.errors.school, "Enter the name of your school.");
  }
  // A school whose name merely starts with one of those words is fine.
  assert.equal(validateApplication(validForm({ school: "Other Hill College" })).ok, true);
});

test("length limits count characters, so non-Latin names get the full allowance", () => {
  // 100 emoji are 200 UTF-16 units; they must fit a 100-character field.
  assert.equal(validateApplication(validForm({ lastName: "😀".repeat(100) })).ok, true);
  assert.equal(validateApplication(validForm({ lastName: "😀".repeat(101) })).ok, false);
});

test("a line break counts as one character, as the browser's maxLength counts it", () => {
  // A <textarea> counts "\n" as 1 for maxLength but a multipart form submits
  // it as "\r\n", so a full-length answer with line breaks was rejected.
  const typed = `${"a".repeat(SHORT_ANSWER_MAX_LENGTH - 6)}\n\n\nend`;
  assert.equal([...typed].length, SHORT_ANSWER_MAX_LENGTH);
  const submitted = typed.replaceAll("\n", "\r\n");
  const result = validateApplication(validForm({ applicationQuestion1: submitted }));
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.equal(result.row.application_question_1, typed, "stored with plain line breaks");

  const lone = validateApplication(validForm({ applicationQuestion1: "one\rtwo\r\nthree\nfour" }));
  assert.equal(lone.row.application_question_1, "one\ntwo\nthree\nfour");

  const tooLong = validateApplication(validForm({ applicationQuestion1: `${submitted}!` }));
  assert.equal(tooLong.ok, false);
  assert.ok(tooLong.errors.applicationQuestion1);
});

test("maps 'no' experience to false", () => {
  const result = validateApplication(validForm({ experience: "no" }));
  assert.equal(result.ok, true);
  assert.equal(result.row.prior_hackathon_experience, false);
});

test("accepts empty optional fields", () => {
  const result = validateApplication(
    validForm({ lastName: "", applicationQuestion2: "", resume: undefined }),
  );
  assert.equal(result.ok, true);
  assert.equal(result.row.last_name, null);
  assert.equal(result.row.application_question_2, null);
  assert.equal(result.resume, null);
});

test("rejects missing and blank required fields", () => {
  const result = validateApplication(
    validForm({ preferredFirstName: "   ", major: undefined }),
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.preferredFirstName);
  assert.ok(result.errors.major);
});

test("rejects an invalid email", () => {
  const result = validateApplication(validForm({ email: "not-an-email" }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.email);
});

test("rejects over-long text", () => {
  const result = validateApplication(validForm({ lastName: "x".repeat(101) }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.lastName);
});

test("accepts a missing or empty optional resume", () => {
  for (const resume of [undefined, pdf("resume.pdf", 0)]) {
    const result = validateApplication(validForm({ resume }));
    assert.equal(result.ok, true);
    assert.equal(result.resume, null);
  }
});

test("rejects unsupported resume extensions", () => {
  const result = validateApplication(
    validForm({ resume: pdf("resume.exe", 100, "application/octet-stream") }),
  );
  assert.equal(result.ok, false);
  assert.match(result.errors.resume, /PDF, DOC, or DOCX/);
});

test("rejects a resume over the size limit", () => {
  const result = validateApplication(
    validForm({ resume: pdf("resume.pdf", MAX_RESUME_BYTES + 1) }),
  );
  assert.equal(result.ok, false);
  assert.match(result.errors.resume, /4 MB/);
});

test("rejects a resume whose type doesn't match its extension", () => {
  const result = validateApplication(
    validForm({ resume: pdf("resume.pdf", 100, "image/png") }),
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.resume);
});

test("accepts doc and docx resumes", () => {
  const docx = pdf(
    "resume.DOCX",
    100,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
  assert.equal(validateApplication(validForm({ resume: docx })).ok, true);
  assert.equal(getResumeExtension(docx), "docx");
});

test("getResumeExtension ignores names without a supported extension", () => {
  assert.equal(getResumeExtension({ name: "resume" }), null);
  assert.equal(getResumeExtension({ name: "resume.txt" }), null);
  assert.equal(getResumeExtension({}), null);
});
