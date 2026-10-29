// Escape a user-supplied string for use as an exact (but case-insensitive)
// match with PostgREST's `ilike`.
//
// `ilike` is a pattern match: `%` matches any run of characters and `_` matches
// any single character. An email like `%@ucsb.edu` would therefore match every
// UCSB address, and `john_doe@ucsb.edu` would also match `johnxdoe@ucsb.edu`.
// Backslash is Postgres' default LIKE escape character, so we escape all three.
export function escapeLikePattern(value) {
  return String(value).replace(/[\\%_]/g, "\\$&");
}
