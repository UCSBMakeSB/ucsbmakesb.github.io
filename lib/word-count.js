// Word limit for each application question. The server also caps every answer
// at 10,000 characters; 1,500 words is a little under that for typical English
// (about 6 characters per word including the space), so the word limit is the
// one people will normally see.
export const MAX_QUESTION_WORDS = 1500;

/** Number of whitespace-separated words in `text`. */
export function countWords(text) {
  if (typeof text !== "string") return 0;
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}
