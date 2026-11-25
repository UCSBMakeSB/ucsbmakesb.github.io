// Maximum words for each application question, keyed by question number.
// This is the single source of truth: the portal's question list
// (components/portal/application-data.js) copies each value onto its question
// object as `maxWords`, and the API (app/api/application/route.js) enforces the
// same numbers. Change a number here and both follow.
//
// The server also caps every answer at 10,000 characters as a backstop.
export const QUESTION_MAX_WORDS = {
  1: 250, // Why do you want to come to MakeSB?
  2: 300, // A project you're proud of
  3: 250, // Skills and background
  4: 150, // Problems you want to solve
  5: 150, // Anything else
  6: 100, // Travel details
  7: 100, // Students you admire
  8: 100, // Message to an LLM
};

/** Word limit for a question field name such as "application_question_3". */
export function maxWordsFor(field) {
  const number = Number(String(field).match(/(\d+)$/)?.[1]);
  return QUESTION_MAX_WORDS[number];
}
