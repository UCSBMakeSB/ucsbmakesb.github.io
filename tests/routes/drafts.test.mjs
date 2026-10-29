import "../support/helpers.mjs";
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
  DRAFT_COOKIE,
  formRequest,
  getRequest,
  isCookieCleared,
  jsonRequest,
  pdf,
  redirectPath,
  validApplicationForm,
} from "../support/helpers.mjs";
import { addApplication, addDraft, addUser, db, failNext, resetDb, signInAs } from "../support/fakes/db.mjs";

const draftRoute = await import("../../app/api/apply/draft/route.js");
const claimRoute = await import("../../app/api/apply/claim-draft/route.js");

const withCookie = (id) => ({ cookies: { [DRAFT_COOKIE]: id } });

describe("GET /api/apply/draft (draft lookup)", () => {
  beforeEach(resetDb);

  it("missing cookie -> 404", async () => {
    const response = await draftRoute.GET(getRequest("/api/apply/draft"));
    assert.equal(response.status, 404);
  });

  it("unknown draft id -> 410 and the stale cookie is cleared", async () => {
    const response = await draftRoute.GET(getRequest("/api/apply/draft", withCookie("00000000-0000-0000-0000-000000000000")));
    assert.equal(response.status, 410);
    assert.ok(isCookieCleared(response, DRAFT_COOKIE));
  });

  it("expired draft -> 410 with a 'start again' message and the cookie cleared", async () => {
    const draft = addDraft({ expiresInMs: -1000 });
    const response = await draftRoute.GET(getRequest("/api/apply/draft", withCookie(draft.id)));
    assert.equal(response.status, 410);
    assert.match((await response.json()).error, /expired/i);
    assert.ok(isCookieCleared(response, DRAFT_COOKIE));
  });

  it("already-claimed draft -> 410 telling the user to sign in", async () => {
    const draft = addDraft({ claimed: true });
    const response = await draftRoute.GET(getRequest("/api/apply/draft", withCookie(draft.id)));
    assert.equal(response.status, 410);
    assert.match((await response.json()).error, /already been linked/i);
    assert.ok(isCookieCleared(response, DRAFT_COOKIE));
  });

  it("active draft -> 200 with only the email (no payload leaks)", async () => {
    const draft = addDraft({ email: "gaucho@ucsb.edu" });
    const response = await draftRoute.GET(getRequest("/api/apply/draft", withCookie(draft.id)));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { email: "gaucho@ucsb.edu" });
  });
});

describe("POST /api/apply/draft (create a draft)", () => {
  beforeEach(resetDb);

  const submit = (overrides) => draftRoute.POST(formRequest("/api/apply/draft", validApplicationForm(overrides)));

  it("rejects an invalid form with per-field errors and stores nothing", async () => {
    const response = await submit({ email: "not-an-email", waiver: undefined });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.ok(body.fields.email && body.fields.waiver);
    assert.equal(db.tables.application_drafts.length, 0);
  });

  it("does not consume draft rate limits for invalid forms", async () => {
    db.rateLimited.add("draftCreationIp");
    db.rateLimited.add("draftCreationEmail");
    const response = await submit({ email: "not-an-email", waiver: undefined });
    assert.equal(response.status, 400);
    assert.equal(db.tables.application_drafts.length, 0);
  });

  it("creates a draft: lowercased email, httpOnly cookie, resume stored under drafts/", async () => {
    const response = await submit({ email: "Gaucho@UCSB.edu" });
    assert.equal(response.status, 201);
    assert.equal(db.tables.application_drafts.length, 1);

    const [draft] = db.tables.application_drafts;
    assert.equal(draft.email, "gaucho@ucsb.edu");
    assert.equal(draft.payload.email, "gaucho@ucsb.edu");
    assert.equal(draft.payload.waiver_accepted, true);
    assert.equal(draft.resume_path, `drafts/${draft.id}.pdf`);
    assert.equal(db.storage.get(`resumes/${draft.resume_path}`).contentType, "application/pdf");

    const cookie = response.cookies.get(DRAFT_COOKIE);
    assert.equal(cookie.value, draft.id);
    assert.equal(cookie.httpOnly, true);
  });

  it("the resume is optional", async () => {
    const response = await submit({ resume: undefined });
    assert.equal(response.status, 201);
    assert.equal(db.tables.application_drafts[0].resume_path, null);
    assert.equal(db.storage.size, 0);
  });

  it("an existing application for the email -> 409 application_exists and no draft", async () => {
    addApplication({ user: addUser({ email: "gaucho@ucsb.edu" }) });
    const response = await submit({ email: "GAUCHO@ucsb.edu" });
    assert.equal(response.status, 409);
    assert.equal((await response.json()).code, "application_exists");
    assert.equal(db.tables.application_drafts.length, 0);
  });

  it("an already-claimed draft for the email -> 409 application_exists", async () => {
    addDraft({ email: "gaucho@ucsb.edu", claimed: true });
    const response = await submit({});
    assert.equal(response.status, 409);
    assert.equal((await response.json()).code, "application_exists");
  });

  it("re-submitting while a draft is active reuses it instead of creating a second one", async () => {
    const existing = addDraft({ email: "gaucho@ucsb.edu" });
    const response = await submit({});
    assert.equal(response.status, 200);
    assert.equal(db.tables.application_drafts.length, 1);
    assert.equal(response.cookies.get(DRAFT_COOKIE).value, existing.id);
  });

  it("an expired draft is replaced and its old resume file is deleted", async () => {
    const expired = addDraft({ email: "gaucho@ucsb.edu", expiresInMs: -1000, resumePath: "drafts/expired.pdf" });
    const response = await submit({});
    assert.equal(response.status, 201);
    assert.equal(db.tables.application_drafts.length, 1);
    assert.notEqual(db.tables.application_drafts[0].id, expired.id);
    assert.ok(!db.storage.has("resumes/drafts/expired.pdf"), "the expired draft's resume must not be orphaned");
  });

  it("treats % and _ in a NEW applicant's email literally (no false 'already applied')", async () => {
    addApplication({ user: addUser({ email: "gaucho@ucsb.edu" }) });
    for (const email of ["g%@ucsb.edu", "gauch_@ucsb.edu", "%@ucsb.edu"]) {
      const response = await submit({ email });
      assert.equal(response.status, 201, `${email} is a different address from gaucho@ucsb.edu`);
    }
  });

  it("rolls the draft back if the resume upload fails, so the user can retry", async () => {
    failNext("storage.upload", { message: "storage unavailable" });
    const response = await submit({});
    assert.equal(response.status, 500);
    assert.equal(db.tables.application_drafts.length, 0);
    assert.equal(response.cookies.get(DRAFT_COOKIE), undefined);
  });

  it("is rate limited per IP and per email", async () => {
    for (const name of ["draftCreationIp", "draftCreationEmail"]) {
      db.rateLimited.clear();
      db.rateLimited.add(name);
      const response = await submit({});
      assert.equal(response.status, 429, name);
      assert.ok(Number(response.headers.get("retry-after")) >= 1);
    }
    assert.equal(db.tables.application_drafts.length, 0);
  });
});

describe("claim-draft: expired, missing and already-claimed drafts", () => {
  let user;

  beforeEach(() => {
    resetDb();
    user = addUser({ email: "gaucho@ucsb.edu" });
    signInAs(user);
  });

  const claim = (id, query = "") =>
    claimRoute.POST(jsonRequest(`/api/apply/claim-draft${query}`, id ? withCookie(id) : {}));

  it("no cookie: 404 as JSON, or a redirect to /auth/confirmed when arriving from the email link", async () => {
    assert.equal((await claim(undefined)).status, 404);
    const redirected = await claimRoute.GET(getRequest("/api/apply/claim-draft?next=/auth/confirmed"));
    assert.equal(redirectPath(redirected), "/auth/confirmed");
  });

  it("unknown draft: 410, or redirect to /auth?error=draft_expired", async () => {
    const id = "11111111-1111-1111-1111-111111111111";
    assert.equal((await claim(id)).status, 410);
    const redirected = await claimRoute.GET(getRequest("/api/apply/claim-draft?next=/auth/confirmed", withCookie(id)));
    assert.equal(redirectPath(redirected), "/auth?error=draft_expired");
  });

  it("expired draft: 410, no application created, draft left for cleanup", async () => {
    const draft = addDraft({ email: user.email, expiresInMs: -1000 });
    const response = await claim(draft.id);
    assert.equal(response.status, 410);
    assert.match((await response.json()).error, /expired/i);
    assert.equal(db.tables.applications.length, 0);
    const redirected = await claimRoute.GET(getRequest("/api/apply/claim-draft?next=/auth/confirmed", withCookie(draft.id)));
    assert.equal(redirectPath(redirected), "/auth?error=draft_expired");
  });

  it("already-claimed draft: 410 saying it is already linked, redirect uses draft_claimed, nothing created", async () => {
    const draft = addDraft({ email: user.email, claimed: true });
    const response = await claim(draft.id);
    assert.equal(response.status, 410);
    assert.match((await response.json()).error, /already been linked/i);
    assert.equal(db.tables.applications.length, 0);
    const redirected = await claimRoute.GET(getRequest("/api/apply/claim-draft?next=/auth/confirmed", withCookie(draft.id)));
    assert.equal(redirectPath(redirected), "/auth?error=draft_claimed");
  });
});

describe("claim-draft: ownership and success", () => {
  let user;

  beforeEach(() => {
    resetDb();
    user = addUser({ email: "gaucho@ucsb.edu" });
    signInAs(user);
  });

  const claim = (id, query = "") =>
    claimRoute.POST(jsonRequest(`/api/apply/claim-draft${query}`, withCookie(id)));

  it("rejects an account whose email does not match the draft, leaving the draft claimable", async () => {
    const draft = addDraft({ email: "someone-else@ucsb.edu" });
    const response = await claim(draft.id);
    assert.equal(response.status, 403);
    assert.equal(db.tables.application_drafts[0].claimed_at, null);
    assert.equal(db.tables.applications.length, 0);
  });

  it("rejects an account whose email is NOT confirmed, even when the address matches", async () => {
    const unconfirmed = addUser({ email: "victim@ucsb.edu", confirmed: false });
    const draft = addDraft({ email: "victim@ucsb.edu", resumePath: "drafts/v.pdf" });
    signInAs(unconfirmed);

    const response = await claim(draft.id);
    assert.equal(response.status, 403, "owning a session is not proof of owning the inbox");
    assert.equal(db.tables.applications.length, 0);
    assert.equal(db.tables.application_drafts[0].claimed_at, null);
    assert.ok(db.storage.has("resumes/drafts/v.pdf"));
  });

  it("links the application to the account, moves the resume, deletes the draft, clears the cookie", async () => {
    const draft = addDraft({ email: user.email, resumePath: "drafts/mine.pdf" });
    const response = await claim(draft.id);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });

    assert.equal(db.tables.applications.length, 1);
    const [created] = db.tables.applications;
    assert.equal(created.user_id, user.id);
    assert.equal(created.email, "gaucho@ucsb.edu");
    assert.equal(created.preferred_first_name, "Gaucho");
    assert.equal(created.resume_path, `applications/${user.id}.pdf`);
    assert.ok(db.storage.has(`resumes/applications/${user.id}.pdf`));
    assert.ok(!db.storage.has("resumes/drafts/mine.pdf"));
    assert.equal(db.tables.application_drafts.length, 0);
    assert.ok(isCookieCleared(response, DRAFT_COOKIE));
    assert.deepEqual(db.revalidated, [user.id]);
  });

  it("works without a resume", async () => {
    const draft = addDraft({ email: user.email });
    assert.equal((await claim(draft.id)).status, 200);
    assert.equal(db.tables.applications[0].resume_path, null);
  });

  it("redirects to a same-site `next` path and ignores external ones (no open redirect)", async () => {
    const draft = addDraft({ email: user.email });
    const response = await claim(draft.id, "?next=/portal/application");
    assert.equal(redirectPath(response), "/portal/application");

    resetDb();
    const again = addUser({ email: "gaucho@ucsb.edu" });
    signInAs(again);
    for (const next of ["//evil.example", "https://evil.example", "javascript:alert(1)"]) {
      const fresh = addDraft({ email: again.email });
      const result = await claim(fresh.id, `?next=${encodeURIComponent(next)}`);
      assert.equal(result.status, 200, next);
      assert.equal(result.headers.get("location"), null, `${next} must not redirect`);
      db.tables.applications.length = 0;
      db.users.get(again.id);
    }
  });

  it("replaying the same cookie after a successful claim creates nothing new", async () => {
    const draft = addDraft({ email: user.email, resumePath: "drafts/mine.pdf" });
    assert.equal((await claim(draft.id)).status, 200);
    const replay = await claim(draft.id);
    assert.equal(replay.status, 410);
    assert.equal(db.tables.applications.length, 1);
    assert.ok(db.storage.has(`resumes/applications/${user.id}.pdf`), "the stored resume survives a replay");
  });

  it("two simultaneous claims create exactly one application and never destroy the resume", async () => {
    const draft = addDraft({ email: user.email, resumePath: "drafts/mine.pdf" });
    const [first, second] = await Promise.all([claim(draft.id), claim(draft.id)]);

    const statuses = [first.status, second.status].sort();
    assert.equal(statuses[0], 200, "one request wins");
    assert.ok([409, 410].includes(statuses[1]), `the loser must get a clean conflict, got ${statuses[1]}`);
    assert.equal(db.tables.applications.length, 1);
    assert.ok(db.storage.has(`resumes/applications/${user.id}.pdf`));
  });

  it("if the account already has an application: 409, and the draft AND its resume survive for retry", async () => {
    addApplication({ user });
    const draft = addDraft({ email: user.email, resumePath: "drafts/keep.pdf" });
    const response = await claim(draft.id);
    assert.equal(response.status, 409);
    assert.equal(db.tables.application_drafts.length, 1, "the draft must not be lost");
    assert.equal(db.tables.application_drafts[0].claimed_at, null, "and it must be claimable again");
    assert.ok(db.storage.has("resumes/drafts/keep.pdf"), "the applicant's resume must not be deleted by a failed claim");
    assert.ok(!db.storage.has(`resumes/applications/${user.id}.pdf`));
  });

  it("if moving the resume fails: 500, no application, draft still claimable", async () => {
    const draft = addDraft({ email: user.email, resumePath: "drafts/keep.pdf" });
    failNext("storage.move", { message: "storage unavailable" });
    const response = await claim(draft.id);
    assert.equal(response.status, 500);
    assert.equal(db.tables.applications.length, 0);
    assert.equal(db.tables.application_drafts[0].claimed_at, null);
    assert.ok(db.storage.has("resumes/drafts/keep.pdf"));
  });
});
