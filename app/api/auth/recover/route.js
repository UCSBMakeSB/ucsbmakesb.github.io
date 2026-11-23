import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getSupabaseAdmin, getSupabaseServer } from "../../../../lib/supabase-server";
import { escapeLikePattern } from "../../../../lib/db-helpers";
import {
  getClientIp,
  getEmailIdentifier,
  getRateLimiters,
  rateLimitResponse,
} from "../../../../lib/rate-limit";

export const runtime = "nodejs";

const DRAFT_COOKIE = "makesb_application_draft";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RECOVERY_TTL_SECONDS = 30 * 60;

function getAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase authentication configuration.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function setDraftCookie(response, draftId, maxAge) {
  response.cookies.set(DRAFT_COOKIE, draftId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

function getAuthRateLimit(authError) {
  const text = [
    authError?.code,
    authError?.message,
  ].filter(Boolean).join(" ").toLowerCase();

  if (
    authError?.status !== 429 &&
    authError?.code !== "over_email_send_rate_limit" &&
    !text.includes("rate limit") &&
    !text.includes("too many requests")
  ) {
    return null;
  }

  let retryAfterSeconds = null;
  const secondsMatch = text.match(/(\d+)\s*seconds?/i);
  const minutesMatch = text.match(/(\d+)\s*minutes?/i);
  if (secondsMatch) retryAfterSeconds = Number(secondsMatch[1]);
  else if (minutesMatch) retryAfterSeconds = Number(minutesMatch[1]) * 60;

  return {
    retryAfterSeconds: retryAfterSeconds && retryAfterSeconds > 0
      ? retryAfterSeconds
      : 60,
  };
}

function formatRetryAfter(seconds) {
  if (seconds < 60) {
    return `${seconds} second${seconds === 1 ? "" : "s"}`;
  }
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

async function findAuthUser(admin, email) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw error;

    const users = data?.users ?? [];
    const user = users.find(
      (candidate) => candidate.email?.toLowerCase() === email,
    );
    if (user) return user;
    if (users.length < 1000) return null;
  }
  return null;
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = typeof body.email === "string"
    ? body.email.trim().toLowerCase()
    : "";
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const limiters = getRateLimiters();
  const ipResult = await limiters.recoveryIp.limit(
    `ip:${getClientIp(request)}`,
  );
  if (!ipResult.success) {
    const limited = rateLimitResponse(ipResult);
    return NextResponse.json(limited, {
      status: 429,
      headers: { "Retry-After": String(limited.retryAfterSeconds) },
    });
  }

  const emailResult = await limiters.recoveryEmail.limit(
    `email:${getEmailIdentifier(email)}`,
  );
  if (!emailResult.success) {
    const limited = rateLimitResponse(emailResult);
    return NextResponse.json(limited, {
      status: 429,
      headers: { "Retry-After": String(limited.retryAfterSeconds) },
    });
  }

  try {
    const supabaseServer = await getSupabaseServer();
    const {
      data: { user: signedInUser },
    } = await supabaseServer.auth.getUser();
    if (signedInUser) {
      return NextResponse.json({
        code: "logged_in",
        redirectTo: "/portal",
      });
    }

    const admin = getSupabaseAdmin();
    const emailPattern = escapeLikePattern(email);
    const [{ data: applications, error: applicationError }, {
      data: drafts,
      error: draftError,
    }] = await Promise.all([
      admin
        .from("applications")
        .select("id")
        .ilike("email", emailPattern)
        .limit(1),
      admin
        .from("application_drafts")
        .select("id, email, expires_at, claimed_at")
        .ilike("email", emailPattern)
        .is("claimed_at", null)
        .order("created_at", { ascending: false })
        .limit(1),
    ]);

    if (applicationError || draftError) {
      console.error(
        "Application recovery lookup failed:",
        applicationError || draftError,
      );
      return NextResponse.json(
        { error: "We couldn't check the email right now. Please try again." },
        { status: 500 },
      );
    }

    if (applications?.length) {
      return NextResponse.json({
        code: "account_found",
        redirectTo: "/login",
      });
    }

    const draft = drafts?.[0] ?? null;
    if (!draft) {
      return NextResponse.json({
        code: "not_found",
        redirectTo: "/apply",
      });
    }

    const now = Date.now();
    const authUser = await findAuthUser(admin, email);

    // Before an auth account exists, account creation is the correct flow.
    // Give the draft a fresh recovery window even if it was active or expired.
    if (!authUser) {
      const expiresAt = new Date(now + RECOVERY_TTL_SECONDS * 1000);
      const { error: updateError } = await admin
        .from("application_drafts")
        .update({ expires_at: expiresAt.toISOString() })
        .eq("id", draft.id);
      if (updateError) {
        console.error("Application recovery expiry update failed:", updateError);
        return NextResponse.json(
          { error: "We couldn't restore the application. Please try again." },
          { status: 500 },
        );
      }

      const recoveryUrl = new URL("/auth", request.url);
      recoveryUrl.searchParams.set("email", email);
      recoveryUrl.searchParams.set("recovery", "1");
      const response = NextResponse.json({
        code: "create_account",
        redirectTo: `${recoveryUrl.pathname}${recoveryUrl.search}`,
        expiresAt: expiresAt.toISOString(),
      });
      setDraftCookie(response, draft.id, RECOVERY_TTL_SECONDS);
      return response;
    }

    if (authUser.email_confirmed_at) {
      const response = NextResponse.json({
        code: "account_found",
        redirectTo: "/login",
      });
      setDraftCookie(
        response,
        draft.id,
        Math.max(
          1,
          Math.ceil(
            (new Date(draft.expires_at).getTime() - now) / 1000,
          ),
        ),
      );
      return response;
    }

    const isActive = new Date(draft.expires_at).getTime() > now;
    const expiresAt = isActive
      ? new Date(draft.expires_at)
      : new Date(now + RECOVERY_TTL_SECONDS * 1000);

    if (!isActive) {
      const { error: updateError } = await admin
        .from("application_drafts")
        .update({ expires_at: expiresAt.toISOString() })
        .eq("id", draft.id);
      if (updateError) {
        console.error("Application recovery expiry update failed:", updateError);
        return NextResponse.json(
          { error: "We couldn't restore the application. Please try again." },
          { status: 500 },
        );
      }
    }

    const auth = getAuthClient().auth;
    const redirectTo = new URL("/auth/callback", request.url).toString();
    const { error: authError } = await auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: redirectTo },
    });

    if (authError) {
      console.error("Application recovery confirmation email failed:", authError);
      const authRateLimit = getAuthRateLimit(authError);
      if (authRateLimit) {
        const retryAfter = formatRetryAfter(authRateLimit.retryAfterSeconds);
        return NextResponse.json(
          {
            code: "auth_rate_limited",
            error: `Too many requests. Try again in ${retryAfter}.`,
            retryAfterSeconds: authRateLimit.retryAfterSeconds,
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(authRateLimit.retryAfterSeconds),
            },
          },
        );
      }
      return NextResponse.json(
        { error: "We couldn't send the confirmation email. Please try again." },
        { status: 500 },
      );
    }

    const response = NextResponse.json({
      code: isActive ? "draft_active" : "draft_expired",
      expiresAt: expiresAt.toISOString(),
    });
    setDraftCookie(
      response,
      draft.id,
      isActive
        ? Math.max(1, Math.ceil((expiresAt.getTime() - now) / 1000))
        : RECOVERY_TTL_SECONDS,
    );
    return response;
  } catch (error) {
    console.error("Application recovery request failed:", error);
    return NextResponse.json(
      { error: "We couldn't process the recovery request. Please try again." },
      { status: 500 },
    );
  }
}
