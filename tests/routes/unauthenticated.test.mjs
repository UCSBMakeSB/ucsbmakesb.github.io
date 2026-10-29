import "../support/helpers.mjs";
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
  DRAFT_COOKIE,
  formRequest,
  getRequest,
  jsonRequest,
  validApplicationForm,
} from "../support/helpers.mjs";
import { addApplication, addDraft, addUser, db, resetDb, signInAs } from "../support/fakes/db.mjs";

const settings = await import("../../app/api/settings/route.js");
const profile = await import("../../app/api/profile/route.js");
const application = await import("../../app/api/application/route.js");
const claimDraft = await import("../../app/api/apply/claim-draft/route.js");
const legacyApply = await import("../../app/api/apply/route.js");
const prepareSignup = await import("../../app/api/auth/prepare-signup/route.js");

function snapshot() {
  return JSON.stringify({
    applications: db.tables.applications,
    drafts: db.tables.application_drafts,
    storage: [...db.storage.keys()],
    users: [...db.users.values()],
  });
}

describe("unauthenticated API requests", () => {
  let draft;
  let before;

  beforeEach(() => {
    resetDb();
    const owner = addUser({ email: "owner@ucsb.edu" });
    addApplication({ user: owner });
    draft = addDraft({ email: "someone@ucsb.edu", resumePath: "drafts/abc.pdf" });
    signInAs(null); // no session at all
    before = snapshot();
  });

  const protectedCalls = {
    "PATCH /api/settings (profile)": () =>
      settings.PATCH(jsonRequest("/api/settings", { method: "PATCH", body: { section: "profile", firstName: "X", lastName: "Y" } })),
    "PATCH /api/settings (password)": () =>
      settings.PATCH(jsonRequest("/api/settings", { method: "PATCH", body: { section: "password", currentPassword: "x", newPassword: "Aa1!aaaaaaaa", confirmPassword: "Aa1!aaaaaaaa" } })),
    "PATCH /api/settings (email)": () =>
      settings.PATCH(jsonRequest("/api/settings", { method: "PATCH", body: { section: "email", currentPassword: "x", email: "new@ucsb.edu" } })),
    "PATCH /api/profile": () =>
      profile.PATCH(jsonRequest("/api/profile", { method: "PATCH", body: { preferredFirstName: "X" } })),
    "GET /api/application": () => application.GET(getRequest("/api/application")),
    "PATCH /api/application": () => {
      const form = new FormData();
      form.set("application_question_1", "hello");
      return application.PATCH(formRequest("/api/application", form, { method: "PATCH" }));
    },
    "POST /api/apply/claim-draft": () =>
      claimDraft.POST(jsonRequest("/api/apply/claim-draft", { cookies: { [DRAFT_COOKIE]: draft.id } })),
    "GET /api/apply/claim-draft": () =>
      claimDraft.GET(getRequest("/api/apply/claim-draft?next=/portal", { cookies: { [DRAFT_COOKIE]: draft.id } })),
  };

  for (const [name, call] of Object.entries(protectedCalls)) {
    it(`${name} is rejected with 401 and changes nothing`, async () => {
      const response = await call();
      assert.equal(response.status, 401);
      assert.equal((await response.json()).error, "You must be signed in.");
      assert.equal(snapshot(), before, "no data may change for an unauthenticated caller");
      assert.equal(db.calls.filter((c) => c.type === "signInWithPassword").length, 0);
    });
  }

  it("a stolen draft cookie alone cannot claim a draft without a session", async () => {
    const response = await claimDraft.POST(
      jsonRequest("/api/apply/claim-draft", { cookies: { [DRAFT_COOKIE]: draft.id } }),
    );
    assert.equal(response.status, 401);
    assert.equal(db.tables.application_drafts[0].claimed_at, null);
  });

  it("the retired /api/apply endpoint no longer writes anything", async () => {
    const response = await legacyApply.POST(formRequest("/api/apply", validApplicationForm()));
    assert.equal(response.status, 410);
    assert.equal(snapshot(), before);
  });

  it("the signup preflight is intentionally public (no session needed)", async () => {
    const response = await prepareSignup.POST(
      jsonRequest("/api/auth/prepare-signup", { body: { email: "nobody@ucsb.edu" } }),
    );
    assert.equal(response.status, 200);
  });
});
