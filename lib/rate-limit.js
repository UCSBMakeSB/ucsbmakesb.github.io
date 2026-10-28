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
  if (!url || !token) {
    throw new Error(
      "Missing LIMITER_KV_REST_API_URL or LIMITER_KV_REST_API_TOKEN environment variable.",
    );
  }

  redis = new Redis({ url, token });
  return redis;
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

  return new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(config.limit, config.window),
    prefix: `makesb:${name}`,
    analytics: false,
    dynamicLimits: false,
    enableProtection: false,
  });
}

export function getRateLimiters() {
  if (rateLimiters) return rateLimiters;

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
