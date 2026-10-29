// Fake of lib/rate-limit.js. The pure helpers come from the REAL module (loaded
// under a different URL so the loader hook doesn't swap it back to this file);
// only the Redis-backed limiters are faked.
import { createRequire } from "node:module";
import { db } from "./db.mjs";

export {
  getClientIp,
  getEmailIdentifier,
  getRetryAfterSeconds,
  rateLimitResponse,
} from "../../../lib/rate-limit.js?real";

const require = createRequire(import.meta.url);
const config = require("../../../ratelimits.json");

let limiters;

export function getRateLimiters() {
  limiters ??= Object.fromEntries(
    Object.keys(config).map((name) => [
      name,
      {
        async limit(key) {
          db.calls.push({ type: "rateLimit", name, key });
          const denied = db.rateLimited.has(name);
          return { success: !denied, remaining: denied ? 0 : 1, reset: Date.now() + 60_000 };
        },
      },
    ]),
  );
  return limiters;
}
