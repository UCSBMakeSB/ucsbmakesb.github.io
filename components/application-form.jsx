"use client";

import { useState } from "react";

const FIELD_LABELS = {
  preferredFirstName: "Preferred first name",
  lastName: "Last name",
  email: "Email",
  mobileNumber: "Mobile number",
  emergencyContactName: "Emergency contact name",
  emergencyContactMobileNumber: "Emergency contact mobile number",
  major: "College major",
  year: "College year",
  age: "Age",
  country: "Country of residence",
  school: "Institution",
  "food-allergies": "Food allergies or restrictions",
  waiver: "Waiver",
  experience: "Hackathon experience",
  resume: "Resume",
};

export function ApplicationForm({ children, className, submitLabel = "Continue" }) {
  // status: "idle" | "submitting" | "success" | "error"
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState([]);

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;

    setStatus("submitting");
    setMessage("");
    setFieldErrors([]);

    try {
      const response = await fetch("/api/apply", {
        method: "POST",
        body: new FormData(form),
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        form.reset();
        setStatus("success");
        setMessage("Thanks for applying! Your application has been received.");
        return;
      }

      setStatus("error");
      setMessage(data.error || "Something went wrong. Please try again.");
      setFieldErrors(
        Object.entries(data.fields ?? {}).map(
          ([field, text]) => `${FIELD_LABELS[field] ?? field}: ${text}`,
        ),
      );
    } catch {
      setStatus("error");
      setMessage("Couldn't reach the server. Check your connection and try again.");
    }
  }

  return (
    <form className={className} onSubmit={handleSubmit}>
      {children}

      <button
        type="submit"
        className="application-form-submit"
        disabled={status === "submitting"}
      >
        {status === "submitting" ? "Submitting..." : submitLabel}
      </button>

      {message && (
        <div
          className="application-form-status"
          data-status={status}
          role={status === "error" ? "alert" : "status"}
        >
          <p>{message}</p>
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
