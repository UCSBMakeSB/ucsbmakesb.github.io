import "../support/helpers.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import { jsonRequest } from "../support/helpers.mjs";
import { resetDb } from "../support/fakes/db.mjs";

const { POST } = await import("../../app/api/auth/prepare-signup/route.js");

test("harness: the real route runs against the fakes", async () => {
  resetDb();
  const response = await POST(jsonRequest("/api/auth/prepare-signup", { body: { email: "x@ucsb.edu" } }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { code: "no_application" });
});
