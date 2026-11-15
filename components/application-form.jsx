"use client";

import { useRef, useState } from "react";

// Keep in sync with MAX_RESUME_BYTES in lib/application-validation.js. Checked
// here too because Vercel rejects request bodies over 4.5 MB before our API
// runs, which the applicant would otherwise see as an unexplained failure.
const MAX_RESUME_BYTES = 4 * 1024 * 1024;

const FIELD_LABELS = {
  preferredFirstName: "Preferred first name",
  lastName: "Last name",
  email: "Email",
  // ASK AFTER ADMISSION: restore in the post-admission portal.
  // mobileNumber: "Mobile number",
  // emergencyContactName: "Emergency contact name",
  // emergencyContactMobileNumber: "Emergency contact mobile number",
  major: "College major",
  year: "College year",
  // age: "Age",
  country: "Country of residence",
  school: "Institution",
  // "food-allergies": "Food allergies or restrictions",
  // waiver: "Waiver",
  experience: "Hackathon experience",
  applicationQuestion1: "Why do you want to come to MakeSB?",
  applicationQuestion2: "Project you're proud of",
  resume: "Resume",
};

function retryText(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "in a few minutes";
  if (seconds < 90) return "in about a minute";
  return `in about ${Math.ceil(seconds / 60)} minutes`;
}

export function ApplicationForm({ children, className, submitLabel = "Continue", disabled = false }) {
  // status: "idle" | "submitting" | "success" | "error"
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState([]);
  const [hasLoginLink, setHasLoginLink] = useState(false);
  const statusRef = useRef(null);

  function showError(text, { fields = [], loginLink = false } = {}) {
    setStatus("error");
    setMessage(text);
    setFieldErrors(fields);
    setHasLoginLink(loginLink);
    // The message renders under the submit button; make sure it is seen.
    window.requestAnimationFrame(() => {
      statusRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (disabled) return;
    const form = event.currentTarget;
    const formData = new FormData(form);

    const resume = formData.get("resume");
    if (resume instanceof File && resume.size > MAX_RESUME_BYTES) {
      showError(
        "Your resume is larger than 4 MB. Please upload a smaller file, or remove it for now and add it later in the portal.",
      );
      return;
    }

    setStatus("submitting");
    setMessage("");
    setFieldErrors([]);
    setHasLoginLink(false);

    try {
      const response = await fetch("/api/apply/draft", {
        method: "POST",
        body: formData,
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        // Signed-in applicants skip account creation; the server says where to go.
        const next =
          typeof data.next === "string" && data.next.startsWith("/") && !data.next.startsWith("//")
            ? data.next
            : "/auth";
        window.location.assign(next);
        return;
      }

      if (response.status === 413) {
        showError(
          "That upload is too large. Please use a resume under 4 MB, or remove it for now and add it later in the portal.",
        );
        return;
      }
      if (response.status === 429) {
        showError(
          `Lots of people are applying right now. Your answers are still on this page. Please press Continue again ${retryText(Number(data.retryAfterSeconds))}.`,
        );
        return;
      }

      showError(data.error || "Something went wrong. Please try again.", {
        loginLink: data.code === "application_exists",
        fields: Object.entries(data.fields ?? {}).map(
          ([field, text]) => `${FIELD_LABELS[field] ?? field}: ${text}`,
        ),
      });
    } catch {
      showError("Couldn't reach the server. Check your connection and try again.");
    }
  }

  return (
    <form className={className} onSubmit={handleSubmit}>
      {children}

      <button
        type="submit"
        className="application-form-submit"
        disabled={disabled || status === "submitting"}
      >
        {status === "submitting" ? "Submitting..." : submitLabel}
      </button>

      {message && (
        <div
          ref={statusRef}
          className="application-form-status"
          data-status={status}
          role={status === "error" ? "alert" : "status"}
        >
          <p>{message}</p>
          {hasLoginLink && (
            <p>
              <a href="/login">Log in to your account</a>
            </p>
          )}
          {fieldErrors.length > 0 && (
            <ul>
              {fieldErrors.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}
