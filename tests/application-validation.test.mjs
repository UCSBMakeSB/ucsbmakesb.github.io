import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_RESUME_BYTES,
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
    mobileNumber: "805-555-0100",
    emergencyContactName: "Parent Student",
    emergencyContactMobileNumber: "805-555-0101",
    major: "computer-engineering",
    year: "junior",
    age: "20",
    country: "united-states",
    school: "ucsb",
    "food-allergies": "None",
    waiver: "on",
    experience: "yes",
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
  assert.equal(result.row.waiver_accepted, true);
  assert.equal(result.row.prior_hackathon_experience, true);
  assert.equal(result.row.food_allergies, "None");
});

test("maps 'no' experience to false", () => {
  const result = validateApplication(validForm({ experience: "no" }));
  assert.equal(result.ok, true);
  assert.equal(result.row.prior_hackathon_experience, false);
});

test("accepts empty optional fields", () => {
  const result = validateApplication(
    validForm({ "food-allergies": "", resume: undefined }),
  );
  assert.equal(result.ok, true);
  assert.equal(result.row.food_allergies, null);
  assert.equal(result.resume, null);
});

test("rejects missing and blank required fields", () => {
  const result = validateApplication(
    validForm({ lastName: "   ", major: undefined }),
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.lastName);
  assert.ok(result.errors.major);
});

test("rejects an invalid email", () => {
  const result = validateApplication(validForm({ email: "not-an-email" }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.email);
});

test("requires the waiver", () => {
  const result = validateApplication(validForm({ waiver: undefined }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.waiver);
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
