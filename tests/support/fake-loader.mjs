// Node module-resolution hook used only by the route-level tests.
//
// It does two jobs:
//   1. Swaps the modules that talk to the outside world (Supabase, Upstash,
//      Next's cache) for in-memory fakes, so the REAL route handlers run
//      unmodified against a predictable fake backend.
//   2. Lets plain Node load the app's Next-style imports, which omit file
//      extensions (`../lib/foo`, `next/server`).
const here = new URL(".", import.meta.url);
const root = new URL("../../", here);

const fakeForFile = new Map([
  [new URL("lib/supabase-server.js", root).href, new URL("fakes/supabase-server.mjs", here).href],
  [new URL("lib/rate-limit.js", root).href, new URL("fakes/rate-limit.mjs", here).href],
  [new URL("lib/portal-data.js", root).href, new URL("fakes/portal-data.mjs", here).href],
]);

const fakeForBare = new Map([
  ["@supabase/supabase-js", new URL("fakes/supabase-js.mjs", here).href],
]);

const RETRYABLE = new Set(["ERR_MODULE_NOT_FOUND", "ERR_UNSUPPORTED_DIR_IMPORT"]);

export async function resolve(specifier, context, nextResolve) {
  if (fakeForBare.has(specifier)) {
    return { url: fakeForBare.get(specifier), shortCircuit: true };
  }

  let result;
  try {
    result = await nextResolve(specifier, context);
  } catch (error) {
    if (!RETRYABLE.has(error.code)) throw error;

    const isRelative = specifier.startsWith(".") || specifier.startsWith("/");
    const candidates = isRelative
      ? [`${specifier}.js`, `${specifier}/index.js`]
      : specifier.startsWith("next/")
        ? [`${specifier}.js`]
        : [];

    for (const candidate of candidates) {
      try {
        result = await nextResolve(candidate, context);
        break;
      } catch {
        // try the next candidate
      }
    }
    if (!result) throw error;
  }

  const fake = fakeForFile.get(result.url);
  return fake ? { url: fake, shortCircuit: true } : result;
}
