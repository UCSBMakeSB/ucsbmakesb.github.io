import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { countWords, MAX_QUESTION_WORDS } from "../lib/word-count.js";

describe("countWords", () => {
  it("counts whitespace-separated words", () => {
    assert.equal(countWords("one two three"), 3);
    assert.equal(countWords("  leading and   trailing\n\nlines\tand tabs  "), 6);
  });

  it("returns 0 for empty, blank or non-string input", () => {
    for (const value of ["", "   ", "\n\t", undefined, null, 42, {}]) {
      assert.equal(countWords(value), 0, String(value));
    }
  });

  it("the limit is a sensible number below the 10,000 character cap", () => {
    assert.equal(MAX_QUESTION_WORDS, 1500);
    assert.ok(MAX_QUESTION_WORDS * 6 <= 10000 + 1000);
  });
});

import { maxWordsFor, QUESTION_MAX_WORDS } from "../lib/question-limits.js";

describe("question limits", () => {
  it("every one of the 8 questions has a positive whole-number limit well under the 10,000 character cap", () => {
    for (let n = 1; n <= 8; n += 1) {
      const limit = QUESTION_MAX_WORDS[n];
      assert.ok(Number.isInteger(limit) && limit > 0, `question ${n}`);
      assert.ok(limit * 8 < 10000, `question ${n} stays under the character cap`);
    }
  });

  it("maxWordsFor reads the number from a field name", () => {
    assert.equal(maxWordsFor("application_question_1"), QUESTION_MAX_WORDS[1]);
    assert.equal(maxWordsFor("application_question_8"), QUESTION_MAX_WORDS[8]);
    assert.equal(maxWordsFor("something_else"), undefined);
  });
});
