// End-to-end (route level) tests for the things that were losing applications:
// confirming on another device, confirming late, the /apply <-> /portal
// redirect loop, a database that has not had the migration run, and the
// emailed-link routes.
import "../support/helpers.mjs";
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
  DRAFT_COOKIE,
  formRequest,
  getRequest,
  jsonRequest,
  pdf,
  redirectPath,
  validApplicationForm,
} from "../support/helpers.mjs";
import { addApplication, addDraft, addUser, db, resetDb, signInAs } from "../support/fakes/db.mjs";
import { DRAFT_TTL_MS } from "../../lib/draft.js";

const draftRoute = await import("../../app/api/apply/draft/route.js");
const claimRoute = await import("../../app/api/apply/claim-draft/route.js");
const callbackRoute = await import("../../app/auth/callback/route.js");
const confirmRoute = await import("../../app/auth/confirm/route.js");
const profileRoute = await import("../../app/api/profile/route.js");
const applicationRoute = await import("../../app/api/application/route.js");
const settingsRoute = await import("../../app/api/settings/route.js");

const submit = (overrides, options) =>
  draftRoute.POST(formRequest("/api/apply/draft", validApplicationForm(overrides), options));
const claimPost = (options = {}) => claimRoute.POST(jsonRequest("/api/apply/claim-draft", options));
const claimGet = (next = "/portal", options = {}) =>
  claimRoute.GET(getRequest(`/api/apply/claim-draft?next=${next}`, options));

const DAY = 24 * 60 * 60 * 1000;

describe("the short application saves end to end", () => {
  beforeEach(resetDb);

  it("form -> draft -> confirmed account -> application, with no post-admission answers", async () => {
    assert.equal((await submit({ email: "new@ucsb.edu" })).status, 201);
    const user = addUser({ email: "new@ucsb.edu" });
    signInAs(user);

    assert.equal((await claimPost()).status, 200);
    const [application] = db.tables.applications;
    assert.equal(application.user_id, user.id);
    assert.equal(application.application_question_1, "I want to build a robot.");
    assert.equal(application.prior_hackathon_experience, true);
    for (const column of ["mobile_number", "emergency_contact_name", "emergency_contact_mobile_number", "age", "waiver_accepted"]) {
      assert.equal(application[column] ?? null, null, `${column} is asked after admission`);
    }
  });

  it("works for a non-UCSB, international applicant with a single name and no resume", async () => {
    const response = await submit({
      preferredFirstName: "Sukarno",
      lastName: undefined,
      email: "sukarno@student.itb.ac.id",
      country: "indonesia",
      school: "Institut Teknologi Bandung",
      major: "other",
      resume: undefined,
    });
    assert.equal(response.status, 201);
    signInAs(addUser({ email: "sukarno@student.itb.ac.id" }));
    assert.equal((await claimPost()).status, 200);
    assert.equal(db.tables.applications[0].last_name, null);
    assert.equal(db.tables.applications[0].school, "Institut Teknologi Bandung");
  });

  it("a tab left open from before the change is told to refresh, not shown errors for fields it doesn't have", async () => {
    const response = await submit({
      applicationQuestion1: undefined,
      mobileNumber: "805-555-0100",
      emergencyContactName: "Parent",
      emergencyContactMobileNumber: "805-555-0101",
      age: "20",
      waiver: "on",
    });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.match(body.error, /refresh/i);
    assert.deepEqual(body.fields, {});
  });
});

describe("drafts survive a slow or cross-device email confirmation", () => {
  let user;

  beforeEach(() => {
    resetDb();
    user = addUser({ email: "gaucho@ucsb.edu" });
  });

  it("a new draft lives for 30 days, not 30 minutes", async () => {
    await submit({});
    const lifetime = new Date(db.tables.application_drafts[0].expires_at) - Date.now();
    assert.ok(lifetime > DRAFT_TTL_MS - 60_000 && lifetime <= DRAFT_TTL_MS);
    assert.ok(lifetime > 29 * DAY);
  });

  it("re-submitting extends an existing draft's life", async () => {
    addDraft({ email: "gaucho@ucsb.edu", expiresInMs: 60_000 });
    await submit({});
    assert.ok(new Date(db.tables.application_drafts[0].expires_at) - Date.now() > 29 * DAY);
  });

  it("the draft cookie outlives a slow confirmation", async () => {
    const response = await submit({});
    assert.ok(response.cookies.get(DRAFT_COOKIE).maxAge >= 7 * 24 * 60 * 60);
  });

  it("claims by confirmed email with NO draft cookie (link opened on another device or browser)", async () => {
    addDraft({ email: user.email, resumePath: "drafts/mine.pdf" });
    signInAs(user);

    const response = await claimPost();
    assert.equal(response.status, 200);
    assert.equal(db.tables.applications.length, 1);
    assert.equal(db.tables.applications[0].user_id, user.id);
    assert.ok(db.storage.has(`resumes/applications/${user.id}.pdf`));
    assert.equal(db.tables.application_drafts.length, 0);
  });

  it("a stale cookie (expired or unknown draft) does not hide the applicant's live draft", async () => {
    const stale = addDraft({ email: user.email, expiresInMs: -1000 });
    addDraft({ email: user.email });
    signInAs(user);

    for (const cookie of [stale.id, "99999999-9999-9999-9999-999999999999"]) {
      db.tables.applications.length = 0;
      if (!db.tables.application_drafts.some((draft) => new Date(draft.expires_at) > new Date())) {
        addDraft({ email: user.email });
      }
      const response = await claimPost({ cookies: { [DRAFT_COOKIE]: cookie } });
      assert.equal(response.status, 200, cookie);
      assert.equal(db.tables.applications.length, 1);
    }
  });

  it("someone else's draft cookie does not block the applicant's own draft, and their draft is untouched", async () => {
    const other = addDraft({ email: "roommate@ucsb.edu" });
    addDraft({ email: user.email, payload: undefined });
    signInAs(user);

    const response = await claimPost({ cookies: { [DRAFT_COOKIE]: other.id } });
    assert.equal(response.status, 200);
    assert.equal(db.tables.applications[0].email, user.email);
    assert.deepEqual(db.tables.application_drafts.map((draft) => draft.id), [other.id]);
    assert.equal(db.tables.application_drafts[0].claimed_at, null);
  });

  it("matching by email never hands over a look-alike address", async () => {
    addDraft({ email: "gauch_@ucsb.edu" });
    addDraft({ email: "xgaucho@ucsb.edu" });
    signInAs(user);
    assert.equal((await claimPost()).status, 404);
    assert.equal(db.tables.applications.length, 0);
  });

  it("an UNCONFIRMED account still cannot claim by email", async () => {
    const squatter = addUser({ email: "victim@ucsb.edu", confirmed: false });
    addDraft({ email: "victim@ucsb.edu" });
    signInAs(squatter);
    assert.equal((await claimPost()).status, 403);
    assert.equal(db.tables.applications.length, 0);
    assert.equal(db.tables.application_drafts[0].claimed_at, null);
  });
});

describe("no redirect loop between /portal and /apply", () => {
  let user;

  beforeEach(() => {
    resetDb();
    user = addUser({ email: "gaucho@ucsb.edu" });
    signInAs(user);
  });

  it("the portal's hand-off links a pending draft and returns to the portal", async () => {
    addDraft({ email: user.email });
    const response = await claimGet("/portal");
    assert.equal(redirectPath(response), "/portal");
    assert.equal(db.tables.applications.length, 1);
    assert.deepEqual(db.revalidated, [user.id], "the portal must not be served its cached 'no application'");
  });

  it("with nothing to link it ends on the /apply form", async () => {
    assert.equal(redirectPath(await claimGet("/portal")), "/apply");
  });

  it("an account that already has its application just continues (second click on the emailed link)", async () => {
    addApplication({ user });
    const response = await claimGet("/auth/confirmed");
    assert.equal(redirectPath(response), "/auth/confirmed");
    assert.equal(db.tables.applications.length, 1);
    assert.deepEqual(db.revalidated, [user.id]);
  });

  it("a signed-in applicant's form is saved under the account email and sent straight to the claim step", async () => {
    const response = await submit({ email: "typo@gmial.com" });
    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.next, "/api/apply/claim-draft?next=/portal/application");
    assert.equal(db.tables.application_drafts[0].email, user.email);

    assert.equal(redirectPath(await claimGet("/portal/application")), "/portal/application");
    assert.equal(db.tables.applications[0].email, user.email);
  });

  it("an anonymous applicant is not given a `next` (they go on to create an account)", async () => {
    signInAs(null);
    const body = await (await submit({})).json();
    assert.deepEqual(body, { ok: true });
  });
});

describe("a database without supabase/2026-11-14-apply-simplify.sql", () => {
  let user;

  beforeEach(() => {
    resetDb();
    db.legacyNotNull = true;
    user = addUser({ email: "gaucho@ucsb.edu" });
    signInAs(user);
  });

  it("cannot save the short application, but loses nothing: draft and resume stay claimable", async () => {
    await submit({ resume: pdf() });
    const [draft] = db.tables.application_drafts;

    const response = await claimPost();
    assert.equal(response.status, 500);
    assert.equal(db.tables.applications.length, 0);
    assert.equal(db.tables.application_drafts.length, 1);
    assert.equal(db.tables.application_drafts[0].claimed_at, null);
    assert.ok(db.storage.has(`resumes/${draft.resume_path}`), "the resume was moved back");
  });

  it("a browser is sent to /apply with a notice instead of a JSON error", async () => {
    await submit({});
    assert.equal(redirectPath(await claimGet("/portal")), "/apply?notice=claim_failed");
  });

  it("the same draft is linked once the migration has been run", async () => {
    await submit({});
    assert.equal((await claimPost()).status, 500);
    db.legacyNotNull = false;
    assert.equal((await claimPost()).status, 200);
    assert.equal(db.tables.applications.length, 1);
  });
});

describe("emailed links", () => {
  let user;

  beforeEach(() => {
    resetDb();
    user = addUser({ email: "gaucho@ucsb.edu", confirmed: false });
  });

  it("/auth/confirm verifies a token-hash link from any device and hands off to claim-draft", async () => {
    db.otps.set("hash-1", { userId: user.id, type: "email" });
    const response = await confirmRoute.GET(getRequest("/auth/confirm?token_hash=hash-1&type=email"));
    assert.equal(redirectPath(response), "/api/apply/claim-draft?next=/auth/confirmed");
    assert.equal(db.currentUserId, user.id);
    assert.ok(user.email_confirmed_at);
  });

  it("/auth/confirm: a used, expired or malformed link goes to sign-in with an explanation and no session", async () => {
    db.otps.set("hash-1", { userId: user.id, type: "email" });
    await confirmRoute.GET(getRequest("/auth/confirm?token_hash=hash-1&type=email"));
    db.currentUserId = null;

    for (const query of [
      "?token_hash=hash-1&type=email", // already used
      "?token_hash=nope&type=email",
      "?type=email",
      "?token_hash=hash-1",
      "?token_hash=hash-1&type=sms",
    ]) {
      const response = await confirmRoute.GET(getRequest(`/auth/confirm${query}`));
      assert.equal(redirectPath(response), "/login?notice=confirm_link", query);
      assert.equal(db.currentUserId, null, query);
    }
  });

  it("/auth/confirm: a password-recovery link goes to the reset page, and a dead one says so", async () => {
    addApplication({ user });
    db.otps.set("rec-1", { userId: user.id, type: "recovery" });
    const ok = await confirmRoute.GET(getRequest("/auth/confirm?token_hash=rec-1&type=recovery"));
    assert.equal(redirectPath(ok), "/auth/reset");

    const dead = await confirmRoute.GET(getRequest("/auth/confirm?token_hash=rec-1&type=recovery"));
    assert.equal(redirectPath(dead), "/login?notice=reset_link");
  });

  it("the full cross-device path: apply on one device, confirm on another, application is linked", async () => {
    signInAs(null);
    await submit({ email: user.email }); // device A, gets the cookie
    db.otps.set("hash-2", { userId: user.id, type: "email" });

    // device B: no draft cookie at all
    const confirmed = await confirmRoute.GET(getRequest("/auth/confirm?token_hash=hash-2&type=email"));
    const claimed = await claimRoute.GET(getRequest(redirectPath(confirmed)));
    assert.equal(redirectPath(claimed), "/auth/confirmed");
    assert.equal(db.tables.applications.length, 1);
    assert.equal(db.tables.applications[0].user_id, user.id);
  });

  it("/auth/callback: opening the link in another browser (code exchange fails) points to sign-in; signing in then links the draft", async () => {
    addDraft({ email: user.email });
    db.codes.set("pkce", { error: { message: "invalid request: both auth code and code verifier should be non-empty" } });
    const response = await callbackRoute.GET(getRequest("/auth/callback?code=pkce"));
    assert.equal(redirectPath(response), "/login?notice=confirm_link");

    // Supabase confirmed the address when the link was opened; the applicant signs in.
    user.email_confirmed_at = new Date().toISOString();
    signInAs(user);
    assert.equal(redirectPath(await claimGet("/portal")), "/portal");
    assert.equal(db.tables.applications.length, 1);
  });
});

describe("portal: post-admission details are optional", () => {
  let user;

  beforeEach(() => {
    resetDb();
    user = addUser({ email: "gaucho@ucsb.edu" });
    addApplication({
      user,
      last_name: null,
      mobile_number: null,
      emergency_contact_name: null,
      emergency_contact_mobile_number: null,
      age: null,
      waiver_accepted: null,
      application_question_1: "I want to build a robot.",
    });
    signInAs(user);
  });

  const patchProfile = (body) =>
    profileRoute.PATCH(jsonRequest("/api/profile", { method: "PATCH", body }));

  it("the profile saves with phone, emergency contact, age and last name left blank", async () => {
    const response = await patchProfile({
      preferredFirstName: "Gaucho",
      lastName: "",
      mobileNumber: "",
      emergencyContactName: "",
      emergencyContactMobileNumber: "",
      major: "computer-engineering",
      year: "junior",
      age: "",
      country: "united-states",
      school: "ucsb",
      "food-allergies": "",
    });
    assert.equal(response.status, 200);
    const { account } = await response.json();
    assert.equal(account.lastName, "", "the portal header reads lastName.slice(), so it must be a string");
    assert.equal(db.tables.applications[0].mobile_number, null);
  });

  it("the profile still requires what admission is decided on", async () => {
    const response = await patchProfile({ preferredFirstName: "", major: "", school: "" });
    assert.equal(response.status, 400);
    const { fields } = await response.json();
    assert.ok(fields.preferredFirstName && fields.major && fields.school);
  });

  it("post-admission details can still be filled in later", async () => {
    const response = await patchProfile({
      mobileNumber: "+62 812-3456-7890",
      emergencyContactName: "Ibu",
      emergencyContactMobileNumber: "+44 20 7946 0958",
      age: "20",
    });
    assert.equal(response.status, 200);
    assert.equal(db.tables.applications[0].mobile_number, "+62 812-3456-7890");
    assert.equal(db.tables.applications[0].age, "20");
  });

  it("the application saves with only the first short answer, and without the waiver", async () => {
    const form = new FormData();
    form.set("application_question_1", "I want to build a robot.");
    for (let index = 2; index <= 8; index += 1) form.set(`application_question_${index}`, "");
    const response = await applicationRoute.PATCH(formRequest("/api/application", form, { method: "PATCH" }));
    assert.equal(response.status, 200);
    assert.equal(db.tables.applications[0].waiver_accepted, null);
  });

  it("the first short answer is still required", async () => {
    const form = new FormData();
    form.set("application_question_1", "   ");
    const response = await applicationRoute.PATCH(formRequest("/api/application", form, { method: "PATCH" }));
    assert.equal(response.status, 400);
    assert.ok((await response.json()).fields.application_question_1);
  });

  it("the waiver can be accepted in the portal", async () => {
    const form = new FormData();
    form.set("waiver", "on");
    const response = await applicationRoute.PATCH(formRequest("/api/application", form, { method: "PATCH" }));
    assert.equal(response.status, 200);
    assert.equal(db.tables.applications[0].waiver_accepted, true);
  });

  it("account settings accept a blank last name", async () => {
    const response = await settingsRoute.PATCH(
      jsonRequest("/api/settings", { method: "PATCH", body: { section: "profile", firstName: "Gaucho", lastName: "" } }),
    );
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).account, { firstName: "Gaucho", lastName: "" });
  });
});
