import "../support/helpers.mjs";
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { DRAFT_COOKIE, getRequest, redirectPath } from "../support/helpers.mjs";
import { addApplication, addUser, db, failNext, resetDb } from "../support/fakes/db.mjs";

const { GET } = await import("../../app/auth/callback/route.js");

const callback = (query, options) => GET(getRequest(`/auth/callback${query}`, options));
const appOf = (user) => db.tables.applications.find((row) => row.user_id === user.id);

describe("auth callback: email synchronization after confirmation", () => {
  let alice;

  beforeEach(() => {
    resetDb();
    alice = addUser({ email: "alice@ucsb.edu" });
    addApplication({ user: alice });
    db.codes.set("good-code", { userId: alice.id });
  });

  // Supabase flips the auth email when the user clicks the confirmation link;
  // simulate that before the callback runs.
  const confirmChangeTo = (email) => {
    alice.email = email;
  };

  it("sends a link with no code to the sign-in page with an explanation", async () => {
    const response = await callback("");
    assert.equal(redirectPath(response), "/login?notice=confirm_link");
  });

  it("an invalid, expired or reused code lands on sign-in (the email is usually already confirmed), with no session", async () => {
    const response = await callback("?code=bogus");
    assert.equal(redirectPath(response), "/login?notice=confirm_link");
    assert.equal(db.currentUserId, null, "no session may be created from a bad code");
  });

  it("an expired-link error from Supabase also lands on sign-in and changes nothing", async () => {
    db.codes.set("expired", { error: { message: "Email link is invalid or has expired" } });
    const response = await callback("?code=expired");
    assert.equal(redirectPath(response), "/login?notice=confirm_link");
    assert.equal(appOf(alice).email, "alice@ucsb.edu");
  });

  it("Supabase's own dead-link redirect (?error_code=otp_expired, no code) explains that the link expired", async () => {
    const response = await callback(
      "?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired",
    );
    assert.equal(redirectPath(response), "/login?notice=confirm_link");
  });

  it("copies the newly confirmed email onto the application", async () => {
    confirmChangeTo("alice.new@ucsb.edu");
    const response = await callback("?code=good-code");
    assert.equal(redirectPath(response), "/auth/confirmed");
    assert.equal(appOf(alice).email, "alice.new@ucsb.edu");
  });

  it("leaves the application alone when the email did not change", async () => {
    const before = JSON.stringify(appOf(alice));
    const response = await callback("?code=good-code");
    assert.equal(redirectPath(response), "/auth/confirmed");
    assert.equal(JSON.stringify(appOf(alice)), before);
  });

  it("an account with no application yet is handed to claim-draft, with or without the draft cookie", async () => {
    const bob = addUser({ email: "bob@ucsb.edu" });
    for (const options of [undefined, { cookies: { [DRAFT_COOKIE]: "draft-id" } }]) {
      db.codes.set("bob-code", { userId: bob.id });
      const response = await callback("?code=bob-code", options);
      assert.equal(redirectPath(response), "/api/apply/claim-draft?next=/auth/confirmed");
    }
    assert.equal(db.tables.applications.length, 1, "the callback itself creates nothing");
  });

  it("only ever syncs the email onto the confirming user's own application", async () => {
    const bob = addUser({ email: "bob@ucsb.edu" });
    addApplication({ user: bob });
    confirmChangeTo("alice.new@ucsb.edu");
    await callback("?code=good-code");
    assert.equal(appOf(bob).email, "bob@ucsb.edu");
  });

  it("surfaces email_sync_failed (and keeps the old application email) when the new address is already on another application", async () => {
    addApplication({ email: "taken@ucsb.edu", user: addUser({ email: "someone-else@ucsb.edu" }) });
    confirmChangeTo("taken@ucsb.edu");
    const response = await callback("?code=good-code");
    assert.equal(redirectPath(response), "/auth?error=email_sync_failed");
    assert.equal(appOf(alice).email, "alice@ucsb.edu");
  });

  it("surfaces email_sync_failed when the application lookup fails", async () => {
    failNext("applications.select");
    const response = await callback("?code=good-code");
    assert.equal(redirectPath(response), "/auth?error=email_sync_failed");
  });

  it("a password-reset link that can't be used says so, instead of talking about email confirmation", async () => {
    const response = await callback("?code=bogus&next=/auth/reset");
    assert.equal(redirectPath(response), "/login?notice=reset_link");
  });

  it("password-recovery links continue to /auth/reset after syncing", async () => {
    const response = await callback("?code=good-code&next=/auth/reset");
    assert.equal(redirectPath(response), "/auth/reset");
  });

  it("ignores any other `next` value (no open redirect)", async () => {
    for (const next of ["https://evil.example", "//evil.example", "/portal", "/api/settings"]) {
      const response = await callback(`?code=good-code&next=${encodeURIComponent(next)}`);
      assert.equal(redirectPath(response), "/auth/confirmed", next);
      db.codes.set("good-code", { userId: alice.id });
    }
  });

  it("an account that already has its application skips claim-draft even if a stale draft cookie is present", async () => {
    const response = await callback("?code=good-code", { cookies: { [DRAFT_COOKIE]: "draft-id" } });
    assert.equal(redirectPath(response), "/auth/confirmed");
  });
});
