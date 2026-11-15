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
import { BASE } from "../support/helpers.mjs";
import { HOSTILE_NEXT } from "../support/hostile-next.mjs";

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

  const submit = (overrides, options) =>
    draftRoute.POST(formRequest("/api/apply/draft", validApplicationForm(overrides), options));

  it("rejects an invalid form with per-field errors and stores nothing", async () => {
    const response = await submit({ email: "not-an-email", major: undefined });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.ok(body.fields.email && body.fields.major);
    assert.equal(db.tables.application_drafts.length, 0);
  });

  it("does not consume draft rate limits for invalid forms", async () => {
    db.rateLimited.add("draftCreationIp");
    db.rateLimited.add("draftCreationEmail");
    const response = await submit({ email: "not-an-email", major: undefined });
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
    assert.equal(draft.payload.application_question_1, "I want to build a robot.");
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

  it("re-submitting from the same browser (draft cookie) reuses the draft instead of creating a second one", async () => {
    const existing = addDraft({ email: "gaucho@ucsb.edu" });
    const response = await submit({}, withCookie(existing.id));
    assert.equal(response.status, 200);
    assert.equal(db.tables.application_drafts.length, 1);
    assert.equal(response.cookies.get(DRAFT_COOKIE).value, existing.id);
  });

  it("re-submitting saves the NEW answers and resume (it used to keep the old ones silently)", async () => {
    const existing = addDraft({ email: "gaucho@ucsb.edu", resumePath: "drafts/old.pdf" });
    const response = await submit(
      { preferredFirstName: "Corrected", resume: pdf("new.pdf") },
      withCookie(existing.id),
    );
    assert.equal(response.status, 200);

    const [draft] = db.tables.application_drafts;
    assert.equal(draft.id, existing.id);
    assert.equal(draft.payload.preferred_first_name, "Corrected");
    assert.notEqual(draft.resume_path, "drafts/old.pdf");
    assert.ok(db.storage.has(`resumes/${draft.resume_path}`), "the new resume is stored");
    assert.ok(!db.storage.has("resumes/drafts/old.pdf"), "the replaced resume is not orphaned");
  });

  it("re-submitting without a resume keeps the one already uploaded", async () => {
    const existing = addDraft({ email: "gaucho@ucsb.edu", resumePath: "drafts/keep.pdf" });
    const response = await submit({ resume: undefined }, withCookie(existing.id));
    assert.equal(response.status, 200);
    assert.equal(db.tables.application_drafts[0].resume_path, "drafts/keep.pdf");
    assert.ok(db.storage.has("resumes/drafts/keep.pdf"));
  });

  it("knowing an applicant's email is NOT enough to overwrite their draft or delete their resume", async () => {
    const victim = addDraft({ email: "gaucho@ucsb.edu", resumePath: "drafts/victim.pdf" });
    const before = structuredClone(victim);

    // No cookie, a made-up cookie, and the cookie of a draft for another address.
    const mine = addDraft({ email: "attacker@ucsb.edu" });
    for (const options of [undefined, withCookie("22222222-2222-2222-2222-222222222222"), withCookie(mine.id)]) {
      const response = await submit(
        { email: "Gaucho@UCSB.edu", preferredFirstName: "Mallory", resume: pdf("evil.pdf") },
        options,
      );
      assert.equal(response.status, 201, "a separate draft is created");
      assert.notEqual(response.cookies.get(DRAFT_COOKIE).value, victim.id, "the victim's draft id is not handed out");
    }

    const stored = db.tables.application_drafts.find((draft) => draft.id === victim.id);
    assert.deepEqual(stored, before, "answers, resume path and expiry are untouched");
    assert.ok(db.storage.has("resumes/drafts/victim.pdf"), "the victim's resume is still there");
    assert.equal(
      db.tables.application_drafts.filter((draft) => draft.email === "gaucho@ucsb.edu").length,
      4,
      "the victim's draft plus one separate draft per attempt",
    );
  });

  it("a draft cookie only unlocks a draft for the SAME email as the form", async () => {
    const other = addDraft({ email: "roommate@ucsb.edu", resumePath: "drafts/roommate.pdf" });
    const before = structuredClone(other);
    const response = await submit({ email: "gaucho@ucsb.edu" }, withCookie(other.id));
    assert.equal(response.status, 201);
    assert.deepEqual(db.tables.application_drafts.find((draft) => draft.id === other.id), before);
    assert.ok(db.storage.has("resumes/drafts/roommate.pdf"));
  });

  it("an expired or claimed draft cannot be overwritten with its old cookie", async () => {
    const expired = addDraft({ email: "gaucho@ucsb.edu", expiresInMs: -1000 });
    const first = await submit({}, withCookie(expired.id));
    assert.equal(first.status, 201);
    assert.notEqual(db.tables.application_drafts[0].id, expired.id);

    resetDb();
    const claimed = addDraft({ email: "gaucho@ucsb.edu", claimed: true });
    const second = await submit({ preferredFirstName: "Mallory" }, withCookie(claimed.id));
    assert.equal(second.status, 409);
    assert.equal(db.tables.application_drafts[0].payload.preferred_first_name, "Gaucho");
  });

  it("a confirmed session for the address may overwrite its draft without the cookie; an unconfirmed one may not", async () => {
    const existing = addDraft({ email: "gaucho@ucsb.edu", resumePath: "drafts/old.pdf" });

    signInAs(addUser({ email: "gaucho@ucsb.edu", confirmed: false }));
    const squatter = await submit({ preferredFirstName: "Mallory" });
    assert.equal(squatter.status, 201, "an unconfirmed account gets a separate draft");
    assert.equal(
      db.tables.application_drafts.find((draft) => draft.id === existing.id).payload.preferred_first_name,
      "Gaucho",
    );

    db.tables.application_drafts.splice(1);
    db.users.clear();
    signInAs(addUser({ email: "gaucho@ucsb.edu" }));
    const owner = await submit({ preferredFirstName: "Corrected" });
    assert.equal(owner.status, 200);
    assert.equal(db.tables.application_drafts.length, 1);
    assert.equal(db.tables.application_drafts[0].id, existing.id);
    assert.equal(db.tables.application_drafts[0].payload.preferred_first_name, "Corrected");
  });

  it("with two live drafts for one address, the browser's own cookie decides which one it rewrites", async () => {
    const mine = addDraft({ email: "gaucho@ucsb.edu" });
    const planted = addDraft({ email: "gaucho@ucsb.edu", payload: { planted: true } });
    const response = await submit({ preferredFirstName: "Corrected" }, withCookie(mine.id));
    assert.equal(response.status, 200);
    assert.equal(db.tables.application_drafts.find((draft) => draft.id === mine.id).payload.preferred_first_name, "Corrected");
    assert.deepEqual(db.tables.application_drafts.find((draft) => draft.id === planted.id).payload, { planted: true });
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

  it("nothing to claim: 404 as JSON, or the /apply form for a browser (never a page that bounces back)", async () => {
    assert.equal((await claim(undefined)).status, 404);
    const redirected = await claimRoute.GET(getRequest("/api/apply/claim-draft?next=/auth/confirmed"));
    assert.equal(redirectPath(redirected), "/apply");
  });

  it("unknown draft: 410, or redirect to /apply with a draft_expired notice", async () => {
    const id = "11111111-1111-1111-1111-111111111111";
    assert.equal((await claim(id)).status, 410);
    const redirected = await claimRoute.GET(getRequest("/api/apply/claim-draft?next=/auth/confirmed", withCookie(id)));
    assert.equal(redirectPath(redirected), "/apply?notice=draft_expired");
  });

  it("expired draft: 410, no application created, draft left for cleanup", async () => {
    const draft = addDraft({ email: user.email, expiresInMs: -1000 });
    const response = await claim(draft.id);
    assert.equal(response.status, 410);
    assert.match((await response.json()).error, /expired/i);
    assert.equal(db.tables.applications.length, 0);
    const redirected = await claimRoute.GET(getRequest("/api/apply/claim-draft?next=/auth/confirmed", withCookie(draft.id)));
    assert.equal(redirectPath(redirected), "/apply?notice=draft_expired");
  });

  it("already-claimed draft: 410 saying it is already linked, redirect uses draft_claimed, nothing created", async () => {
    const draft = addDraft({ email: user.email, claimed: true });
    const response = await claim(draft.id);
    assert.equal(response.status, 410);
    assert.match((await response.json()).error, /already been linked/i);
    assert.equal(db.tables.applications.length, 0);
    const redirected = await claimRoute.GET(getRequest("/api/apply/claim-draft?next=/auth/confirmed", withCookie(draft.id)));
    assert.equal(redirectPath(redirected), "/apply?notice=draft_claimed");
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

  it("redirects to a same-site `next` path and never off-site (no open redirect)", async () => {
    const draft = addDraft({ email: user.email });
    const response = await claim(draft.id, "?next=/portal/application");
    assert.equal(redirectPath(response), "/portal/application");

    for (const next of HOSTILE_NEXT) {
      // Every exit of the route that redirects to `next`: a fresh claim, an
      // account that already has its application (with and without a draft).
      const exits = {
        "fresh claim": () => addDraft({ email: user.email }),
        "already applied": () => addApplication({ user }),
        "already applied, draft pending": () => {
          addApplication({ user });
          addDraft({ email: user.email });
        },
      };
      for (const [exit, seed] of Object.entries(exits)) {
        db.tables.applications.length = 0;
        db.tables.application_drafts.length = 0;
        seed();
        const result = await claimRoute.GET(
          getRequest(`/api/apply/claim-draft?next=${encodeURIComponent(next)}`),
        );
        const location = result.headers.get("location");
        assert.ok(location, `${exit}: a browser navigation ends on a page`);
        assert.equal(new URL(location).origin, BASE, `${exit}: ${JSON.stringify(next)} left the site: ${location}`);
        assert.equal(redirectPath(result), "/portal", `${exit}: ${JSON.stringify(next)}`);
      }
    }
  });

  it("the raw query string forms of the reported exploit stay on the site", async () => {
    for (const query of ["?next=/%5Cevil.com", "?next=/%09/evil.com", "?next=%2F%2Fevil.com", "?next=/%5C%5Cevil.com", "?next=%5C%5Cevil.com", "?next=/%0A/evil.com"]) {
      addApplication({ user });
      const result = await claimRoute.GET(getRequest(`/api/apply/claim-draft${query}`));
      assert.equal(new URL(result.headers.get("location")).origin, BASE, query);
      db.tables.applications.length = 0;
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
