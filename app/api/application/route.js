import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin, getSupabaseServer } from "../../../lib/supabase-server";
import {
  getResumeExtension,
  validateResume,
} from "../../../lib/application-validation";

export const runtime = "nodejs";

const QUESTION_FIELDS = [
  "application_question_1",
  "application_question_2",
  "application_question_3",
  "application_question_4",
  "application_question_5",
  "application_question_6",
  "application_question_7",
  "application_question_8",
];

const REQUIRED_QUESTION_FIELDS = new Set(QUESTION_FIELDS.slice(0, 4));
const MAX_QUESTION_LENGTH = 10000;
const RESUME_CONTENT_TYPES = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
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
    waiver: application.waiver_accepted,
    experience: application.prior_hackathon_experience ? "yes" : "no",
    resume: application.resume_path
      ? { name: application.resume_path.split("/").pop() }
      : null,
    ...Object.fromEntries(
      QUESTION_FIELDS.map((field, index) => [
        `applicationQuestion${index + 1}`,
        application[field] ?? "",
      ]),
    ),
  };
}

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const { data: application, error } = await getSupabaseAdmin()
    .from("applications")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Application lookup failed:", error);
    return NextResponse.json(
      { error: "Couldn't load your application." },
      { status: 500 },
    );
  }
  if (!application) {
    return NextResponse.json({ error: "Application not found." }, { status: 404 });
  }

  return NextResponse.json({ account: applicationToAccount(application, user.email) });
}

export async function PATCH(request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart form data." }, { status: 400 });
  }

  const updates = {};
  const errors = {};
  for (const field of QUESTION_FIELDS) {
    if (!formData.has(field)) continue;
    const value = formData.get(field);
    if (typeof value !== "string") {
      errors[field] = "Must be text.";
      continue;
    }

    const text = value.trim();
    if (REQUIRED_QUESTION_FIELDS.has(field) && !text) {
      errors[field] = "This field is required.";
    } else if (text.length > MAX_QUESTION_LENGTH) {
      errors[field] = `Must be ${MAX_QUESTION_LENGTH} characters or fewer.`;
    } else {
      updates[field] = text || null;
    }
  }

  if (formData.has("waiver")) {
    if (formData.get("waiver") !== "on") {
      errors.waiver = "You must accept the waiver.";
    } else {
      updates.waiver_accepted = true;
    }
  }

  const resumeResult = validateResume(formData.get("resume"));
  Object.assign(errors, resumeResult.errors);

  if (Object.keys(errors).length > 0) {
    return NextResponse.json(
      { error: "Please fix the highlighted fields.", fields: errors },
      { status: 400 },
    );
  }
  if (Object.keys(updates).length === 0 && !resumeResult.file) {
    return NextResponse.json({ error: "No application changes submitted." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: currentApplication, error: currentError } = await supabase
    .from("applications")
    .select("resume_path")
    .eq("user_id", user.id)
    .maybeSingle();

  if (currentError) {
    console.error("Current application lookup failed:", currentError);
    return NextResponse.json(
      { error: "Couldn't load your application." },
      { status: 500 },
    );
  }
  if (!currentApplication) {
    return NextResponse.json({ error: "Application not found." }, { status: 404 });
  }

  let newResumePath;
  if (resumeResult.file) {
    const extension = getResumeExtension(resumeResult.file);
    newResumePath = `applications/${user.id}-${randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("resumes")
      .upload(newResumePath, await resumeResult.file.arrayBuffer(), {
        contentType: RESUME_CONTENT_TYPES[extension],
        upsert: false,
      });

    if (uploadError) {
      console.error("Application resume upload failed:", uploadError);
      return NextResponse.json(
        { error: "We couldn't upload your resume. Please try again." },
        { status: 500 },
      );
    }
    updates.resume_path = newResumePath;
  }

  const { data: application, error } = await supabase
    .from("applications")
    .update(updates)
    .eq("user_id", user.id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("Application update failed:", error);
    if (newResumePath) {
      await supabase.storage.from("resumes").remove([newResumePath]);
    }
    return NextResponse.json(
      { error: "Couldn't save your application." },
      { status: 500 },
    );
  }
  if (!application) {
    if (newResumePath) {
      await supabase.storage.from("resumes").remove([newResumePath]);
    }
    return NextResponse.json({ error: "Application not found." }, { status: 404 });
  }

  if (newResumePath && currentApplication.resume_path) {
    const { error: removeError } = await supabase.storage
      .from("resumes")
      .remove([currentApplication.resume_path]);
    if (removeError) {
      console.error("Previous application resume cleanup failed:", removeError);
    }
  }

  return NextResponse.json({ account: applicationToAccount(application, user.email) });
}
