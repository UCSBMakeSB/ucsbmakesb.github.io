// Maximum words for each application question, keyed by question number.
// This is the single source of truth: the portal's question list
// (components/portal/application-data.js) copies each value onto its question
// object as `maxWords`, and the API (app/api/application/route.js) enforces the
// same numbers. Change a number here and both follow.
//
// Each limit is the longest answer saved as of Nov 25, 2026 (125 applications)
// plus headroom (about 15%, set by hand), so no existing answer is invalidated. Never set a
// limit below the longest answer already in the database.
//
// The server also caps every answer at 10,000 characters as a backstop.
export const QUESTION_MAX_WORDS = {
  1: 400, // Why do you want to come to MakeSB?   (longest so far 318)
  2: 500, // A project you're proud of            (longest so far 465)
  3: 300, // Skills and background                (longest so far 241)
  4: 300, // Problems you want to solve           (longest so far 227)
  5: 400, // Anything else                        (longest so far 330)
  6: 150, // Travel details                       (longest so far 116)
  7: 150, // Students you admire                  (longest so far 113)
  8: 200, // Message to an LLM                    (longest so far 129)
};

/** Word limit for a question field name such as "application_question_3". */
export function maxWordsFor(field) {
  const number = Number(String(field).match(/(\d+)$/)?.[1]);
  return QUESTION_MAX_WORDS[number];
}
