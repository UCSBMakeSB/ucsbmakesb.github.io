import { NextResponse } from "next/server";
import { getSupabaseAdmin, getSupabaseServer } from "../../../lib/supabase-server";
import { revalidatePortalAccount } from "../../../lib/portal-data";

export const runtime = "nodejs";

const PROFILE_FIELDS = {
  preferredFirstName: ["preferred_first_name", 100, true],
  lastName: ["last_name", 100, true],
  mobileNumber: ["mobile_number", 40, true],
  emergencyContactName: ["emergency_contact_name", 150, true],
  emergencyContactMobileNumber: ["emergency_contact_mobile_number", 40, true],
  major: ["major", 100, true],
  year: ["year", 100, true],
  age: ["age", 100, true],
  country: ["country", 100, true],
  school: ["school", 200, true],
  "food-allergies": ["food_allergies", 500, false],
};

async function getAuthenticatedUser() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

function applicationToAccount(application, email) {
  return {
    firstName: application.preferred_first_name,
    lastName: application.last_name,
    email: email ?? application.email,
    mobileNumber: application.mobile_number,
    emergencyContactName: application.emergency_contact_name,
    emergencyContactMobileNumber: application.emergency_contact_mobile_number,
    major: application.major,
    year: application.year,
    age: application.age,
    country: application.country,
    school: application.school,
    "food-allergies": application.food_allergies ?? "",
  };
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

  const updates = {};
  const errors = {};
  for (const [field, [column, maxLength, required]] of Object.entries(PROFILE_FIELDS)) {
    if (!(field in body)) continue;
    if (typeof body[field] !== "string") {
      errors[field] = "Must be text.";
      continue;
    }

    const value = body[field].trim();
    if (required && !value) {
      errors[field] = "This field is required.";
    } else if (value.length > maxLength) {
      errors[field] = `Must be ${maxLength} characters or fewer.`;
    } else {
      updates[column] = value || null;
    }
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json(
      { error: "Please fix the highlighted fields.", fields: errors },
      { status: 400 },
    );
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No profile changes submitted." }, { status: 400 });
  }

  const { data: application, error } = await getSupabaseAdmin()
    .from("applications")
    .update(updates)
    .eq("user_id", user.id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("Profile update failed:", error);
    return NextResponse.json(
      { error: "Couldn't save your profile." },
      { status: 500 },
    );
  }
  if (!application) {
    return NextResponse.json({ error: "Application not found." }, { status: 404 });
  }

  revalidatePortalAccount(user.id);
  return NextResponse.json({
    account: applicationToAccount(application, user.email),
  });
}
