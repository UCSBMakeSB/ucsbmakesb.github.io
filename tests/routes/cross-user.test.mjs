import "../support/helpers.mjs";
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
  DRAFT_COOKIE,
  formRequest,
  getRequest,
  jsonRequest,
  pdf,
} from "../support/helpers.mjs";
import { addApplication, addDraft, addUser, db, resetDb, signInAs } from "../support/fakes/db.mjs";

const settings = await import("../../app/api/settings/route.js");
const profile = await import("../../app/api/profile/route.js");
const application = await import("../../app/api/application/route.js");
const claimDraft = await import("../../app/api/apply/claim-draft/route.js");

const appFor = (user) => db.tables.applications.find((row) => row.user_id === user.id);

describe("cross-user application access", () => {
  let alice;
  let bob;

  beforeEach(() => {
    resetDb();
    alice = addUser({ email: "alice@ucsb.edu" });
    bob = addUser({ email: "bob@ucsb.edu" });
    addApplication({ user: alice, preferred_first_name: "Alice", resume_path: `applications/${alice.id}.pdf` });
    addApplication({ user: bob, preferred_first_name: "Bob", resume_path: `applications/${bob.id}.pdf` });
    db.storage.set(`resumes/applications/${alice.id}.pdf`, { size: 1 });
    db.storage.set(`resumes/applications/${bob.id}.pdf`, { size: 1 });
  });

  it("GET /api/application returns only the signed-in user's application", async () => {
    signInAs(alice);
    const asAlice = await (await application.GET(getRequest("/api/application"))).json();
    assert.equal(asAlice.account.firstName, "Alice");
    assert.equal(asAlice.account.email, "alice@ucsb.edu");

    signInAs(bob);
    const asBob = await (await application.GET(getRequest("/api/application"))).json();
    assert.equal(asBob.account.firstName, "Bob");
    assert.equal(asBob.account.email, "bob@ucsb.edu");
  });

  it("identity comes from the session, never from request parameters", async () => {
    signInAs(alice);
    const response = await application.GET(
      getRequest(`/api/application?user_id=${bob.id}&userId=${bob.id}&email=bob@ucsb.edu`, {
        headers: { "x-user-id": bob.id },
      }),
    );
    assert.equal((await response.json()).account.firstName, "Alice");
  });

  it("PATCH /api/profile edits only the caller's row and ignores injected identity fields", async () => {
    signInAs(alice);
    const response = await profile.PATCH(
      jsonRequest("/api/profile", {
        method: "PATCH",
        body: {
          preferredFirstName: "Mallory",
          user_id: bob.id,
          id: appFor(bob).id,
          email: "bob@ucsb.edu",
          resume_path: "applications/stolen.pdf",
        },
      }),
    );
    assert.equal(response.status, 200);
    assert.equal(appFor(alice).preferred_first_name, "Mallory");
    assert.equal(appFor(alice).user_id, alice.id, "ownership must not be reassignable");
    assert.equal(appFor(alice).email, "alice@ucsb.edu");
    assert.equal(appFor(alice).resume_path, `applications/${alice.id}.pdf`);
    assert.equal(appFor(bob).preferred_first_name, "Bob");
    assert.equal(appFor(bob).email, "bob@ucsb.edu");
  });

  it("PATCH /api/settings (profile) edits only the caller's row", async () => {
    signInAs(alice);
    const response = await settings.PATCH(
      jsonRequest("/api/settings", {
        method: "PATCH",
        body: { section: "profile", firstName: "Alicia", lastName: "Gaucho", user_id: bob.id },
      }),
    );
    assert.equal(response.status, 200);
    assert.equal(appFor(alice).preferred_first_name, "Alicia");
    assert.equal(appFor(bob).preferred_first_name, "Bob");
    assert.equal(appFor(bob).last_name, "Student");
  });

  it("PATCH /api/application edits only the caller's essays and resume", async () => {
    signInAs(alice);
    const form = new FormData();
    form.set("application_question_1", "Alice's essay");
    form.set("resume", pdf("new.pdf"));
    const response = await application.PATCH(formRequest("/api/application", form, { method: "PATCH" }));
    assert.equal(response.status, 200);

    assert.equal(appFor(alice).application_question_1, "Alice's essay");
    assert.equal(appFor(bob).application_question_1, undefined);
    assert.ok(appFor(alice).resume_path.startsWith(`applications/${alice.id}-`), "new file is namespaced to the owner");
    assert.ok(db.storage.has(`resumes/${appFor(alice).resume_path}`));
    assert.ok(!db.storage.has(`resumes/applications/${alice.id}.pdf`), "alice's old resume is removed");
    assert.ok(db.storage.has(`resumes/applications/${bob.id}.pdf`), "bob's resume is untouched");
  });

  it("a signed-in user with no application gets 404 and cannot touch anyone else's", async () => {
    const carol = addUser({ email: "carol@ucsb.edu" });
    signInAs(carol);

    const results = await Promise.all([
      application.GET(getRequest("/api/application")),
      profile.PATCH(jsonRequest("/api/profile", { method: "PATCH", body: { preferredFirstName: "Hijack" } })),
      settings.PATCH(jsonRequest("/api/settings", { method: "PATCH", body: { section: "profile", firstName: "Hijack", lastName: "Hijack" } })),
    ]);
    for (const response of results) assert.equal(response.status, 404);
    assert.equal(appFor(alice).preferred_first_name, "Alice");
    assert.equal(appFor(bob).preferred_first_name, "Bob");
  });

  it("a user cannot claim a draft that belongs to a different email", async () => {
    const draft = addDraft({ email: "bob-draft@ucsb.edu", resumePath: "drafts/bobs.pdf" });
    signInAs(alice);

    const response = await claimDraft.POST(
      jsonRequest("/api/apply/claim-draft", { cookies: { [DRAFT_COOKIE]: draft.id } }),
    );
    assert.equal(response.status, 403);
    assert.equal(db.tables.application_drafts.length, 1);
    assert.equal(db.tables.application_drafts[0].claimed_at, null, "the owner's draft must stay claimable");
    assert.ok(db.storage.has("resumes/drafts/bobs.pdf"));
    assert.equal(db.tables.applications.length, 2, "no new application was created");
  });

  it("a password change for one user never touches another user's credentials", async () => {
    signInAs(alice);
    const response = await settings.PATCH(
      jsonRequest("/api/settings", {
        method: "PATCH",
        body: {
          section: "password",
          currentPassword: alice.password,
          newPassword: "Brand-New-Pass-42!",
          confirmPassword: "Brand-New-Pass-42!",
          userId: bob.id,
          user_id: bob.id,
        },
      }),
    );
    assert.equal(response.status, 200);
    assert.equal(alice.password, "Brand-New-Pass-42!");
    assert.equal(bob.password, "Correct-Horse-9!");
    const updates = db.calls.filter((call) => call.type === "admin.updateUserById");
    assert.deepEqual(updates.map((call) => call.id), [alice.id]);
  });
});
