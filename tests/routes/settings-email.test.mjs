import "../support/helpers.mjs";
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { STRONG_PASSWORD, jsonRequest } from "../support/helpers.mjs";
import { addApplication, addUser, db, resetDb, signInAs } from "../support/fakes/db.mjs";

const { PATCH } = await import("../../app/api/settings/route.js");

describe("settings: duplicate and invalid email changes", () => {
  let alice;
  let bob;

  beforeEach(() => {
    resetDb();
    alice = addUser({ email: "alice@ucsb.edu" });
    bob = addUser({ email: "bob@ucsb.edu" });
    addApplication({ user: alice });
    addApplication({ user: bob });
    signInAs(alice);
  });

  const changeEmail = (email, overrides = {}) =>
    PATCH(
      jsonRequest("/api/settings", {
        method: "PATCH",
        body: { section: "email", currentPassword: STRONG_PASSWORD, email, ...overrides },
      }),
    );

  it("rejects the address the account already has, ignoring case and spacing", async () => {
    for (const email of ["alice@ucsb.edu", "ALICE@UCSB.EDU", "  Alice@ucsb.edu  "]) {
      const response = await changeEmail(email);
      assert.equal(response.status, 400, email);
      assert.equal((await response.json()).error, "Enter a different email address.");
    }
    assert.equal(db.emailChanges.length, 0);
  });

  it("rejects malformed addresses", async () => {
    const tooLong = `${"a".repeat(250)}@ucsb.edu`;
    for (const email of ["nope", "a@b", "two words@ucsb.edu", "@ucsb.edu", "", tooLong, undefined, 42, null]) {
      const response = await changeEmail(email);
      assert.equal(response.status, 400, String(email));
      assert.equal((await response.json()).error, "Enter a valid email address.");
    }
    assert.equal(db.emailChanges.length, 0);
  });

  it("returns 409 when another ACCOUNT already uses the address (case-insensitive)", async () => {
    for (const email of ["bob@ucsb.edu", "BOB@ucsb.edu"]) {
      const response = await changeEmail(email);
      assert.equal(response.status, 409, email);
      assert.equal((await response.json()).error, "That email address is already in use.");
    }
    assert.equal(db.emailChanges.length, 0);
  });

  it("returns 409 when another user's APPLICATION already holds the address", async () => {
    addApplication({ email: "held@ucsb.edu", user: addUser({ email: "someone-else@ucsb.edu" }) });
    const response = await changeEmail("held@ucsb.edu");
    assert.equal(response.status, 409);
    assert.equal(db.emailChanges.length, 0, "no confirmation email may be sent for an address that cannot be synced");
  });

  it("returns 409 when an unlinked (legacy) application holds the address", async () => {
    addApplication({ email: "legacy@ucsb.edu" }); // user_id: null
    const response = await changeEmail("legacy@ucsb.edu");
    assert.equal(response.status, 409);
    assert.equal(db.emailChanges.length, 0);
  });

  it("treats % and _ in the requested address literally, not as wildcards", async () => {
    // Would collide with bob@ucsb.edu if the lookup used the raw string with ilike.
    for (const email of ["b_b@ucsb.edu", "b%@ucsb.edu", "%@ucsb.edu"]) {
      db.emailChanges.length = 0;
      const response = await changeEmail(email);
      assert.equal(response.status, 200, `${email} should not collide with bob@ucsb.edu`);
      assert.equal(db.emailChanges.length, 1);
    }
  });

  it("starts a confirmed change: normalizes the address, keeps the old one active", async () => {
    const response = await changeEmail("  New.Address@UCSB.edu ");
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.ok, true);
    assert.equal(body.pendingEmail, "new.address@ucsb.edu");
    assert.match(body.message, /current email stays active until confirmation/i);

    assert.equal(db.emailChanges.length, 1);
    assert.equal(db.emailChanges[0].userId, alice.id);
    assert.equal(db.emailChanges[0].redirectTo, "http://localhost:3000/auth/callback");

    assert.equal(alice.email, "alice@ucsb.edu", "auth email only changes after confirmation");
    assert.equal(db.tables.applications.find((row) => row.user_id === alice.id).email, "alice@ucsb.edu");
  });

  it("a user can only ever change their own address", async () => {
    const response = await changeEmail("fresh@ucsb.edu", { userId: bob.id, user_id: bob.id });
    assert.equal(response.status, 200);
    assert.equal(db.emailChanges[0].userId, alice.id);
  });
});
