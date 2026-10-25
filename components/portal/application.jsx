"use client";

import { useState } from "react";
import FieldRenderer, { formFields } from "../field-renderer";
import { usePortalAccount } from "./account";

const applicationQuestions = [
  {
    type: "essay",
    id: "application-question-1",
    name: "applicationQuestion1",
    label: "Why do you want to come to MakeSB?",
    rows: 8,
    requirement: "required",
  },
  {
    type: "essay",
    id: "application-question-2",
    name: "applicationQuestion2",
    label:
      "Tell us about a project you're proud of. What specific decisions did you make and why?",
    rows: 8,
    requirement: "required",
  },
  {
    type: "essay",
    id: "application-question-3",
    name: "applicationQuestion3",
    label: "What skills do you want to use, and what's your background?",
    rows: 8,
    requirement: "required",
  },
  {
    type: "essay",
    id: "application-question-4",
    name: "applicationQuestion4",
    label: "What kinds of problems are you interested in solving?",
    rows: 4,
    requirement: "required",
  },
  {
    type: "essay",
    id: "application-question-5",
    name: "applicationQuestion5",
    label: "Is there anything else you'd like to share?",
    rows: 4,
    requirement: "recommended",
  },
  {
    type: "essay",
    id: "application-question-6",
    name: "applicationQuestion6",
    label:
      "If you're flying in, please share your travel details (i.e. flight times, etc.).",
    rows: 4,
    requirement: "optional",
  },
  {
    type: "essay",
    id: "application-question-7",
    name: "applicationQuestion7",
    label:
      "Are there any students whose skills, passion, or projects you admire that are potentially applying to MakeSB? Please enter names and emails (max 3, or enter N/A).",
    rows: 4,
    requirement: "optional",
  },
  {
    type: "essay",
    id: "application-question-8",
    name: "applicationQuestion8",
    label:
      "What would you say to an LLM grading your app? (we won't use LLMs)",
    rows: 4,
    requirement: "fun",
  },
];

const waiver = formFields.find((field) => field.name === "waiver");
const resume = formFields.find((field) => field.name === "resume");

export default function Application() {
  const { account, setAccount } = usePortalAccount();
  const [feedback, setFeedback] = useState(null);

  function submit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const resumeFile = formData.get("resume");
    const updates = Object.fromEntries(
      applicationQuestions.map((question) => [
        question.name,
        formData.get(question.name),
      ]),
    );

    updates.waiver = formData.get("waiver") === "on";
    if (resumeFile?.name) updates.resume = { name: resumeFile.name };
    setAccount((previous) => ({ ...previous, ...updates }));
    setFeedback("Application changes saved in preview mode.");
  }

  return (
    <main id="account-main" className="portal-main portal-application">
      <p className="portal-eyebrow">MakeSB 2027 / Your application</p>
      <h1>Application</h1>
      <p className="portal-intro">Complete your application for MakeSB 2027.</p>
      <form className="portal-application-form" onSubmit={submit}>
        {applicationQuestions.map((field) => (
          <FieldRenderer
            key={field.id}
            field={{ ...field, defaultValue: account[field.name] }}
          />
        ))}
        <FieldRenderer
          field={{
            ...resume,
            existingFileName: account.resume?.name,
          }}
        />
        <FieldRenderer
          field={{ ...waiver, defaultValue: account.waiver }}
        />
        {feedback && (
          <p className="portal-success" role="status">
            {feedback}
          </p>
        )}
        <button className="portal-button" type="submit">
          Save
        </button>
      </form>
    </main>
  );
}
