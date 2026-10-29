import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  getClientIp,
  getEmailIdentifier,
  getRateLimiters,
  rateLimitResponse,
} from "../../../../lib/rate-limit";

export const runtime = "nodejs";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESET_MESSAGE =
  "If an account exists for that email, you'll receive a password reset link shortly.";

function rateLimitedResponse(result) {
  const body = rateLimitResponse(result);
  return NextResponse.json(body, {
    status: 429,
    headers: { "Retry-After": String(body.retryAfterSeconds) },
  });
}

function getAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY environment variable.",
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const limiters = getRateLimiters();
  const ipResult = await limiters.passwordResetIp.limit(
    `ip:${getClientIp(request)}`,
  );
  if (!ipResult.success) return rateLimitedResponse(ipResult);

  const emailResult = await limiters.passwordResetEmail.limit(
    `email:${getEmailIdentifier(email)}`,
  );
  if (!emailResult.success) return rateLimitedResponse(emailResult);

  try {
    const { error } = await getAuthClient().auth.resetPasswordForEmail(email, {
      redirectTo: new URL("/auth/callback?next=/auth/reset", request.url).toString(),
    });

    if (error) {
      console.error("Password reset request failed:", error);
      return NextResponse.json(
        { error: "We couldn't process your request. Please try again." },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Password reset request failed:", error);
    return NextResponse.json(
      { error: "We couldn't process your request. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ message: RESET_MESSAGE });
}
