import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getResumeExtension, validateApplication } from "../../../lib/application-validation";
import { getSupabaseAdmin } from "../../../lib/supabase-server";

export const runtime = "nodejs";

const RESUME_CONTENT_TYPES = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export async function POST(request) {
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Couldn't read the submitted form." },
      { status: 400 },
    );
  }

  const result = validateApplication(formData);
  if (!result.ok) {
    return NextResponse.json(
      { error: "Please fix the highlighted fields.", fields: result.errors },
      { status: 400 },
    );
  }

  const { row, resume } = result;
  const id = randomUUID();
  const ext = resume ? getResumeExtension(resume) : null;
  // Never use the user's filename in the path: it's the applicant's data and
  // could contain path tricks. The row id is enough to find it again.
  const resumePath = ext ? `${id}.${ext}` : null;

  try {
    const supabase = getSupabaseAdmin();

    // Insert first so a duplicate email is rejected before we store a file.
    const { error: insertError } = await supabase
      .from("applications")
      .insert({ id, ...row, resume_path: resumePath });

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "An application with this email has already been submitted." },
          { status: 409 },
        );
      }
      console.error("Application insert failed:", insertError);
      return NextResponse.json(
        { error: "Something went wrong saving your application. Please try again." },
        { status: 500 },
      );
    }

    if (resume) {
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(resumePath, await resume.arrayBuffer(), {
          contentType: RESUME_CONTENT_TYPES[ext],
          upsert: false,
        });

      if (uploadError) {
        console.error("Resume upload failed:", uploadError);
        // Roll back the row so the applicant can retry with the same email.
        await supabase.from("applications").delete().eq("id", id);
        return NextResponse.json(
          { error: "We couldn't upload your resume. Please try again." },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Unexpected /api/apply error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
