import "../support/helpers.mjs";
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { formRequest } from "../support/helpers.mjs";
import { addApplication, addUser, db, resetDb, signInAs } from "../support/fakes/db.mjs";
import { QUESTION_MAX_WORDS } from "../../lib/question-limits.js";

const application = await import("../../app/api/application/route.js");

const words = (n) => Array.from({ length: n }, () => "word").join(" ");
const save = (fields) => {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return application.PATCH(formRequest("/api/application", form, { method: "PATCH" }));
};
const field = (n) => `application_question_${n}`;
const rowOf = (user) => db.tables.applications.find((row) => row.user_id === user.id);

describe("application question word limits (one per question)", () => {
  let alice;

  beforeEach(() => {
    resetDb();
    alice = addUser({ email: "alice@ucsb.edu" });
    addApplication({ user: alice, resume_path: `applications/${alice.id}.pdf` });
    signInAs(alice);
  });

  for (const [number, limit] of Object.entries(QUESTION_MAX_WORDS)) {
    it(`question ${number}: accepts exactly ${limit} words and rejects ${limit + 1}`, async () => {
      assert.equal((await save({ [field(number)]: words(limit) })).status, 200);

      const response = await save({ [field(number)]: words(limit + 1) });
      assert.equal(response.status, 400);
      const body = await response.json();
      assert.equal(body.fields[field(number)], `Must be ${limit} words or fewer.`);
    });
  }

  it("a rejected answer saves nothing", async () => {
    await save({ [field(8)]: words(QUESTION_MAX_WORDS[8] + 1) });
    assert.equal(rowOf(alice)[field(8)], undefined);
  });

  it("one over-limit answer does not stop the others from being checked and reported", async () => {
    const response = await save({
      [field(1)]: words(QUESTION_MAX_WORDS[1] + 1),
      [field(6)]: words(QUESTION_MAX_WORDS[6] + 1),
    });
    const { fields } = await response.json();
    assert.ok(fields[field(1)] && fields[field(6)]);
  });

  it("counts words, not spaces: extra spaces and line breaks do not add words", async () => {
    // (FormData turns every "\n" into "\r\n", so keep the line breaks few.)
    const text = Array(QUESTION_MAX_WORDS[1]).fill("a").join("  ").replace("  ", "\n\n");
    assert.equal((await save({ [field(1)]: text })).status, 200);
  });
});
