import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const require = createRequire(import.meta.url);
const rateLimitConfig = require("../ratelimits.json");
const RATE_LIMIT_NAMES = [
  "signupPreparationIp",
  "signupPreparationEmail",
  "draftCreationIp",
  "draftCreationEmail",
  "passwordResetIp",
  "passwordResetEmail",
  "passwordVerificationUser",
  "passwordVerificationIp",
  "emailChangeUser",
  "passwordChangeUser",
];

let redis;
let rateLimiters;

function getRedis() {
  if (redis) return redis;

  const url = process.env.LIMITER_KV_REST_API_URL;
  const token = process.env.LIMITER_KV_REST_API_TOKEN;
  if (!url || !token) return null;

  redis = new Redis({ url, token });
  return redis;
}

// What a limiter answers when it cannot do its job. The limiter is abuse
// protection, not a gate applicants must pass: if Redis is unreachable, over
// its quota, or not configured, people must still be able to apply. Before
// this, any limiter error surfaced as a 500 on /apply and account creation.
//
// Same shape as cal.com's limiter, which returns `success: true` when its key
// is missing, on timeout, and from `onError`:
// https://github.com/calcom/cal.com/blob/main/packages/lib/rateLimit.ts
const ALLOWED = Object.freeze({ success: true, remaining: 1, reset: 0, failedOpen: true });

/** Wraps a limiter so a thrown error allows the request instead of failing it. */
export function failOpen(limiter, name, log = console.error) {
  return {
    async limit(...args) {
      try {
        return await limiter.limit(...args);
      } catch (error) {
        log(`Rate limiter "${name}" failed; allowing the request.`, error);
        return { ...ALLOWED };
      }
    },
  };
}

function createLimiter(name) {
  const config = rateLimitConfig[name];
  if (
    !config ||
    !Number.isInteger(config.limit) ||
    config.limit < 1 ||
    typeof config.window !== "string" ||
    !/^\d+ (s|m|h|d)$/.test(config.window)
  ) {
    throw new Error(
      `Invalid rate-limit configuration for "${name}" in ratelimits.json.`,
    );
  }

  const client = getRedis();
  if (!client) {
    return { limit: async () => ({ ...ALLOWED }) };
  }

  return failOpen(
    new Ratelimit({
      redis: client,
      limiter: Ratelimit.slidingWindow(config.limit, config.window),
      prefix: `makesb:${name}`,
      analytics: false,
      dynamicLimits: false,
      enableProtection: false,
      // Give up on a slow Redis after 2 s and let the request through (the
      // library's own fail-open path) rather than hold the applicant's submit.
      timeout: 2000,
    }),
    name,
  );
}

export function getRateLimiters() {
  if (rateLimiters) return rateLimiters;

  if (!getRedis()) {
    console.error(
      "Rate limiting is DISABLED: LIMITER_KV_REST_API_URL or LIMITER_KV_REST_API_TOKEN is not set.",
    );
  }

  rateLimiters = Object.fromEntries(
    RATE_LIMIT_NAMES.map((name) => [name, createLimiter(name)]),
  );

  return rateLimiters;
}

export function getClientIp(request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const forwardedIp = forwardedFor?.split(",")[0]?.trim();
  return forwardedIp || request.headers.get("x-real-ip") || "unknown";
}

export function getEmailIdentifier(email) {
  return createHash("sha256").update(email).digest("hex");
}

export function getRetryAfterSeconds(reset) {
  if (!Number.isFinite(reset)) return 60;
  return Math.max(1, Math.ceil((reset - Date.now()) / 1000));
}

export function rateLimitResponse(result) {
  return {
    error: "Too many attempts. Please try again later.",
    retryAfterSeconds: getRetryAfterSeconds(result.reset),
  };
}
