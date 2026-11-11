import { createHmac, timingSafeEqual } from "node:crypto";

function getSecret() {
  const secret = process.env.DRAFT_TOKEN_SECRET;
  if (!secret) throw new Error("Missing DRAFT_TOKEN_SECRET environment variable.");
  return secret;
}

function encode(value) {
  return Buffer.from(value).toString("base64url");
}

function decode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signature(payload) {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function createDraftToken({ draftId, email, expiresAt }) {
  const payload = encode(JSON.stringify({
    draftId,
    email,
    exp: Math.floor(new Date(expiresAt).getTime() / 1000),
  }));
  return `${payload}.${signature(payload)}`;
}

export function verifyDraftToken(token) {
  if (typeof token !== "string") return null;
  const [payload, providedSignature] = token.split(".");
  if (!payload || !providedSignature) return null;

  const expectedSignature = signature(payload);
  const provided = Buffer.from(providedSignature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null;
  }

  try {
    const data = JSON.parse(decode(payload));
    if (
      typeof data.draftId !== "string" ||
      typeof data.email !== "string" ||
      !Number.isInteger(data.exp) ||
      data.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}
