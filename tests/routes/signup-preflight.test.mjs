import "../support/helpers.mjs";
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { DRAFT_COOKIE, jsonRequest } from "../support/helpers.mjs";
import { addApplication, addDraft, addUser, db, failNext, resetDb } from "../support/fakes/db.mjs";

const { POST } = await import("../../app/api/auth/prepare-signup/route.js");

const preflight = (email, options = {}) =>
  POST(jsonRequest("/api/auth/prepare-signup", { body: { email }, ...options }));

describe("signup preflight states", () => {
  beforeEach(resetDb);

  it("rejects non-JSON bodies and missing emails", async () => {
    assert.equal((await POST(jsonRequest("/api/auth/prepare-signup", { raw: "{" }))).status, 400);
    for (const email of [undefined, null, "", "   ", 42, {}]) {
      const response = await preflight(email);
      assert.equal(response.status, 400, JSON.stringify(email));
    }
  });

  it("no_application: nothing on file for this email", async () => {
    const response = await preflight("new@ucsb.edu");
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { code: "no_application" });
    assert.equal(response.cookies.get(DRAFT_COOKIE), undefined);
  });

  it("application_exists: matches regardless of case and surrounding spaces", async () => {
    addApplication({ user: addUser({ email: "gaucho@ucsb.edu" }) });
    for (const email of ["gaucho@ucsb.edu", "  GAUCHO@UCSB.EDU "]) {
      const response = await preflight(email);
      assert.deepEqual(await response.json(), { code: "application_exists" }, email);
      assert.equal(response.cookies.get(DRAFT_COOKIE), undefined, "no draft cookie for an existing account");
    }
  });

  it("draft_ready: an active draft sets a short-lived, httpOnly draft cookie", async () => {
    const draft = addDraft({ email: "gaucho@ucsb.edu" });
    const response = await preflight("Gaucho@UCSB.edu");
    assert.deepEqual(await response.json(), { code: "draft_ready" });

    const cookie = response.cookies.get(DRAFT_COOKIE);
    assert.equal(cookie.value, draft.id);
    assert.equal(cookie.httpOnly, true);
    assert.equal(cookie.sameSite, "lax");
    assert.equal(cookie.path, "/");
    assert.equal(cookie.maxAge, 30 * 60);
  });

  it("draft_ready picks the newest ACTIVE draft when older ones are expired", async () => {
    addDraft({ email: "gaucho@ucsb.edu", expiresInMs: -60_000 });
    const active = addDraft({ email: "gaucho@ucsb.edu" });
    const response = await preflight("gaucho@ucsb.edu");
    assert.deepEqual(await response.json(), { code: "draft_ready" });
    assert.equal(response.cookies.get(DRAFT_COOKIE).value, active.id);
  });

  it("an expired draft is treated as no application and cleaned up, resume included", async () => {
    addDraft({ email: "gaucho@ucsb.edu", expiresInMs: -60_000, resumePath: "drafts/old.pdf" });
    const response = await preflight("gaucho@ucsb.edu");
    assert.deepEqual(await response.json(), { code: "no_application" });
    assert.equal(db.tables.application_drafts.length, 0);
    assert.ok(!db.storage.has("resumes/drafts/old.pdf"), "orphaned resume must be deleted");
    assert.equal(response.cookies.get(DRAFT_COOKIE), undefined);
  });

  it("an already-claimed draft is never offered again", async () => {
    addDraft({ email: "gaucho@ucsb.edu", claimed: true, resumePath: "drafts/claimed.pdf" });
    const response = await preflight("gaucho@ucsb.edu");
    assert.deepEqual(await response.json(), { code: "no_application" });
    assert.equal(response.cookies.get(DRAFT_COOKIE), undefined);
    assert.equal(db.tables.application_drafts.length, 0);
  });

  it("inconsistent state (application AND drafts) reports application_exists and purges the drafts", async () => {
    addApplication({ user: addUser({ email: "gaucho@ucsb.edu" }) });
    addDraft({ email: "gaucho@ucsb.edu", resumePath: "drafts/a.pdf" });
    addDraft({ email: "gaucho@ucsb.edu", resumePath: "drafts/b.pdf" });
    const response = await preflight("gaucho@ucsb.edu");
    assert.deepEqual(await response.json(), { code: "application_exists" });
    assert.equal(db.tables.application_drafts.length, 0);
    assert.ok(![...db.storage.keys()].some((key) => key.startsWith("resumes/drafts/")));
    assert.equal(response.cookies.get(DRAFT_COOKIE), undefined);
  });

  it("does not delete other people's drafts while cleaning up", async () => {
    addDraft({ email: "other@ucsb.edu", resumePath: "drafts/other.pdf" });
    addDraft({ email: "gaucho@ucsb.edu", expiresInMs: -1000 });
    await preflight("gaucho@ucsb.edu");
    assert.equal(db.tables.application_drafts.length, 1);
    assert.equal(db.tables.application_drafts[0].email, "other@ucsb.edu");
    assert.ok(db.storage.has("resumes/drafts/other.pdf"));
  });

  it("treats % and _ in the email as literal characters, not LIKE wildcards", async () => {
    addApplication({ user: addUser({ email: "gaucho@ucsb.edu" }) });
    addDraft({ email: "visitor@ucsb.edu" });

    for (const email of ["%@ucsb.edu", "gauch_@ucsb.edu", "g%@ucsb.edu", "%", "_@ucsb.edu", "%visitor%"]) {
      const response = await preflight(email);
      assert.deepEqual(await response.json(), { code: "no_application" }, `${email} must not match anyone`);
      assert.equal(response.cookies.get(DRAFT_COOKIE), undefined, `${email} must not receive someone's draft cookie`);
    }
  });

  it("a legitimate address containing an underscore does not match a look-alike address", async () => {
    addApplication({ user: addUser({ email: "johnxdoe@ucsb.edu" }) });
    const response = await preflight("john_doe@ucsb.edu");
    assert.deepEqual(await response.json(), { code: "no_application" });
  });

  it("is rate limited per IP and per email, and answers 429 with Retry-After before looking anything up", async () => {
    addApplication({ user: addUser({ email: "gaucho@ucsb.edu" }) });
    for (const name of ["signupPreparationIp", "signupPreparationEmail"]) {
      db.rateLimited.clear();
      db.rateLimited.add(name);
      const response = await preflight("gaucho@ucsb.edu");
      assert.equal(response.status, 429, name);
      assert.ok(Number(response.headers.get("retry-after")) >= 1);
      const text = JSON.stringify(await response.json());
      assert.ok(!text.includes("application_exists"), "a limited response must not reveal account state");
    }
  });

  it("returns 500 with a generic message when the lookup fails", async () => {
    failNext("applications.select", { message: "relation \"applications\" does not exist" });
    const response = await preflight("gaucho@ucsb.edu");
    assert.equal(response.status, 500);
    const body = await response.json();
    assert.equal(body.error, "Couldn't check your application status.");
    assert.ok(!JSON.stringify(body).includes("relation"));
  });
});
