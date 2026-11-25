import "../support/helpers.mjs";
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { formRequest } from "../support/helpers.mjs";
import { addApplication, addUser, db, resetDb, signInAs } from "../support/fakes/db.mjs";
import { MAX_QUESTION_WORDS } from "../../lib/word-count.js";

const application = await import("../../app/api/application/route.js");

const words = (n) => Array.from({ length: n }, () => "word").join(" ");
const save = (fields) => {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return application.PATCH(formRequest("/api/application", form, { method: "PATCH" }));
};

describe("application question word limit", () => {
  let alice;

  beforeEach(() => {
    resetDb();
    alice = addUser({ email: "alice@ucsb.edu" });
    addApplication({ user: alice, resume_path: `applications/${alice.id}.pdf` });
    signInAs(alice);
  });

  it("accepts an answer of exactly the maximum number of words", async () => {
    const response = await save({ application_question_1: words(MAX_QUESTION_WORDS) });
    assert.equal(response.status, 200);
  });

  it("rejects an answer one word over the limit, naming the limit, and saves nothing", async () => {
    const response = await save({ application_question_1: words(MAX_QUESTION_WORDS + 1) });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.match(body.fields.application_question_1, /1,500 words or fewer/);
    const row = db.tables.applications.find((r) => r.user_id === alice.id);
    assert.equal(row.application_question_1, undefined);
  });

  it("applies to every question, not only the first", async () => {
    for (let i = 1; i <= 8; i += 1) {
      const response = await save({ [`application_question_${i}`]: words(MAX_QUESTION_WORDS + 5) });
      assert.equal(response.status, 400, `question ${i}`);
    }
  });

  it("counts words, not spaces: extra spaces and line breaks do not add words", async () => {
    // (FormData turns every "\n" into "\r\n", so keep the line breaks few.)
    const text = Array(MAX_QUESTION_WORDS).fill("a").join("  ").replace("  ", "\n\n");
    const response = await save({ application_question_1: text });
    assert.equal(response.status, 200);
  });
});
