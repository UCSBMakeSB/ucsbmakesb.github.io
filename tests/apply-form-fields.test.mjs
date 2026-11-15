// The application form's field list, the rate-limit settings, and the proxy.
// These guard the "short form" and "a busy campus is not blocked" decisions.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { loadBindings, transform } from "next/dist/build/swc/index.js";
import { NextRequest } from "next/server";

await loadBindings();

async function loadFieldRenderer() {
  const source = readFileSync(new URL("../components/field-renderer.jsx", import.meta.url), "utf8");
  const { code } = await transform(source, {
    filename: "field-renderer.jsx",
    jsc: { parser: { syntax: "ecmascript", jsx: true }, transform: { react: { runtime: "automatic" } } },
    module: { type: "commonjs" },
  });
  const jsx = (type, props) => ({ type, props });
  const modules = {
    "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "fragment" },
    "./dropdown": { Dropdown: "Dropdown" },
    "./file-upload-field": { FileUploadField: "FileUploadField" },
    // Present once the school picker (PR #14) is merged.
    "./school-combobox": { SchoolCombobox: "SchoolCombobox" },
  };
  const exports = {};
  new Function("require", "exports", code)((name) => modules[name], exports);
  return exports;
}

const { formFields, postAdmissionFields } = await loadFieldRenderer();
const names = (fields) => fields.map((field) => field.name);

const POST_ADMISSION = [
  "mobileNumber",
  "emergencyContactName",
  "emergencyContactMobileNumber",
  "age",
  "food-allergies",
  "waiver",
];

test("the application form asks only what is needed to decide admission", () => {
  assert.deepEqual(names(formFields), [
    "preferredFirstName",
    "lastName",
    "email",
    "major",
    "year",
    "country",
    "school",
    "experience",
    "applicationQuestion1",
    "applicationQuestion2",
    "resume",
  ]);
});

test("post-admission questions are off the application form but kept for the portal, all optional", () => {
  for (const name of POST_ADMISSION) {
    assert.ok(!names(formFields).includes(name), `${name} must not be on the application form`);
  }
  assert.deepEqual(names(postAdmissionFields), POST_ADMISSION);
  for (const field of postAdmissionFields) assert.equal(field.requirement, "optional", field.name);
});

test("resume, last name and the second short answer are optional; exactly one free-text answer is required", () => {
  const requirement = Object.fromEntries(formFields.map((field) => [field.name, field.requirement]));
  assert.equal(requirement.resume, "optional");
  assert.equal(requirement.lastName, "optional");
  assert.equal(requirement.applicationQuestion2, "optional");
  const requiredEssays = formFields.filter((field) => field.type === "essay" && field.requirement === "required");
  assert.deepEqual(names(requiredEssays), ["applicationQuestion1"]);
});

test("every field has a section the /apply page renders (none is silently dropped)", () => {
  for (const field of formFields) {
    assert.ok(["primary", "secondary"].includes(field.section), `${field.name}: ${field.section}`);
  }
});

test("the form has no UCSB-only or US-only fields (PERM number, state, ZIP, phone)", () => {
  const text = formFields
    .map((field) => `${field.name} ${field.id ?? ""} ${field.label ?? field.legend ?? ""} ${field.inputType ?? ""}`)
    .join(" | ")
    .toLowerCase();
  for (const word of ["perm", "zip", "postal", "state", "ssn", "tel"]) {
    assert.ok(!new RegExp(`\\b${word}\\b`).test(text), word);
  }
  const school = formFields.find((field) => field.name === "school");
  if (school.options) {
    assert.ok(school.options.some((option) => option.value === "other"), "non-listed schools have a choice");
  }
});

// ------------------------------------------------------------- rate limits

const require = createRequire(import.meta.url);
const limits = require("../ratelimits.json");

function perHour({ limit, window }) {
  const [amount, unit] = window.split(" ");
  const hours = { s: 1 / 3600, m: 1 / 60, h: 1, d: 24 }[unit] * Number(amount);
  return limit / hours;
}

test("per-IP limits leave room for a whole campus behind one address", () => {
  assert.ok(perHour(limits.draftCreationIp) >= 300, "applications per hour from one IP");
  assert.ok(perHour(limits.signupPreparationIp) >= 300, "account creations per hour from one IP");
  assert.ok(perHour(limits.passwordResetIp) >= 60, "password resets per hour from one IP");
});

test("per-email limits still stop one address being hammered, but allow honest retries", () => {
  for (const name of ["draftCreationEmail", "signupPreparationEmail"]) {
    assert.ok(limits[name].limit >= 5, `${name} allows retries`);
    assert.ok(perHour(limits[name]) <= 60, `${name} still limits abuse`);
  }
  assert.ok(limits.passwordResetEmail.limit <= 5);
  assert.ok(limits.passwordVerificationUser.limit <= 10);
});

test("a limiter that throws lets the request through instead of failing it", async () => {
  // `?real` keeps the test loader from swapping in the fake limiter.
  const { failOpen } = await import("../lib/rate-limit.js?real");
  const logged = [];
  const broken = failOpen(
    { limit: async () => { throw new Error("ERR max daily request limit exceeded"); } },
    "draftCreationIp",
    (...args) => logged.push(args),
  );
  const result = await broken.limit("ip:1.2.3.4");
  assert.equal(result.success, true);
  assert.equal(logged.length, 1, "the failure is logged for the team");

  const denying = failOpen({ limit: async () => ({ success: false, reset: 123 }) }, "x");
  assert.deepEqual(await denying.limit("ip:1.2.3.4"), { success: false, reset: 123 }, "a real denial still denies");
});

test("with no Redis configured the limiters allow requests instead of throwing", async () => {
  const saved = [process.env.LIMITER_KV_REST_API_URL, process.env.LIMITER_KV_REST_API_TOKEN];
  delete process.env.LIMITER_KV_REST_API_URL;
  delete process.env.LIMITER_KV_REST_API_TOKEN;
  const originalError = console.error;
  const logged = [];
  console.error = (...args) => logged.push(args.join(" "));
  try {
    const { getRateLimiters } = await import("../lib/rate-limit.js?real&unconfigured");
    const limiters = getRateLimiters();
    for (const name of Object.keys(limits)) {
      assert.equal((await limiters[name].limit("ip:1.2.3.4")).success, true, name);
    }
    assert.ok(logged.some((line) => /DISABLED/.test(line)), "and say so loudly in the logs");
  } finally {
    console.error = originalError;
    if (saved[0] !== undefined) process.env.LIMITER_KV_REST_API_URL = saved[0];
    if (saved[1] !== undefined) process.env.LIMITER_KV_REST_API_TOKEN = saved[1];
  }
});

// ------------------------------------------------------------------- proxy

test("a confirmation code that lands on the homepage is handed to the callback", async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://supabase.test";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= "publishable-test-key";
  const { proxy, config } = await import("../proxy.js");
  assert.ok(config.matcher.includes("/"));

  const location = (response) => {
    const header = response.headers.get("location");
    if (!header) return null;
    const url = new URL(header);
    return `${url.pathname}${url.search}`;
  };

  const withCode = await proxy(new NextRequest("https://makesb.org/?code=abc123"));
  assert.equal(location(withCode), "/auth/callback?code=abc123");

  const dead = await proxy(new NextRequest("https://makesb.org/?error=access_denied&error_code=otp_expired"));
  assert.equal(location(dead), "/auth/callback?error=access_denied&error_code=otp_expired");

  const plain = await proxy(new NextRequest("https://makesb.org/"));
  assert.equal(location(plain), null, "the homepage itself is untouched");
});
