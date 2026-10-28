import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getSupabaseAdmin, getSupabaseServer } from "../../../lib/supabase-server";

export const runtime = "nodejs";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SECURE_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{12,}$/;

async function getAuthenticatedUser() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function PATCH(request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const section = body.section;
  if (!["profile", "email", "password"].includes(section)) {
    return NextResponse.json({ error: "Invalid settings section." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  if (section === "profile") {
    const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
    const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
    const errors = {};

    if (!firstName) errors.firstName = "Preferred first name is required.";
    else if (firstName.length > 100) errors.firstName = "Must be 100 characters or fewer.";
    if (!lastName) errors.lastName = "Last name is required.";
    else if (lastName.length > 100) errors.lastName = "Must be 100 characters or fewer.";
    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { error: "Please fix the highlighted fields.", fields: errors },
        { status: 400 },
      );
    }

    const { data: application, error } = await supabase
      .from("applications")
      .update({
        preferred_first_name: firstName,
        last_name: lastName,
      })
      .eq("user_id", user.id)
      .select("preferred_first_name, last_name")
      .maybeSingle();

    if (error) {
      console.error("Settings profile update failed:", error);
      return NextResponse.json({ error: "Couldn't save your name." }, { status: 500 });
    }
    if (!application) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    return NextResponse.json({
      account: { firstName: application.preferred_first_name, lastName: application.last_name },
    });
  }

  const currentPassword =
    typeof body.currentPassword === "string" ? body.currentPassword : "";
  if (!currentPassword) {
    return NextResponse.json({ error: "Enter your current password." }, { status: 400 });
  }

  const authUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const authKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!authUrl || !authKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY environment variable.",
    );
  }
  const authClient = createClient(authUrl, authKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: passwordError } = await authClient.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (passwordError) {
    return NextResponse.json(
      { error: "Your current password is incorrect." },
      { status: 401 },
    );
  }

  if (section === "password") {
    const newPassword =
      typeof body.newPassword === "string" ? body.newPassword : "";
    if (!SECURE_PASSWORD.test(newPassword)) {
      return NextResponse.json(
        {
          error:
            "Password must be at least 12 characters and include uppercase, lowercase, a number, and a symbol.",
        },
        { status: 400 },
      );
    }
    if (newPassword !== body.confirmPassword) {
      return NextResponse.json({ error: "Your new passwords don't match." }, { status: 400 });
    }

    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });
    if (error) {
      console.error("Password update failed:", error);
      return NextResponse.json({ error: "Couldn't update your password." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (email === user.email?.toLowerCase()) {
    return NextResponse.json(
      { error: "Enter a different email address." },
      { status: 400 },
    );
  }

  const { error: authError } = await authClient.auth.updateUser(
    { email },
    { emailRedirectTo: new URL("/auth/callback", request.url).toString() },
  );
  if (authError) {
    if (authError.message.toLowerCase().includes("already")) {
      return NextResponse.json(
        { error: "That email address is already in use." },
        { status: 409 },
      );
    }
    console.error("Email auth update failed:", authError);
    return NextResponse.json({ error: "Couldn't update your email." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    pendingEmail: email,
    message:
      "Check your inbox to confirm your new email address. Your current email stays active until confirmation.",
  });
}
