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
