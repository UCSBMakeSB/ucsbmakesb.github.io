"use client";

import { useState } from "react";
import FieldRenderer from "../field-renderer";
import { usePortalAccount } from "./account";
import {
  applicationGroups,
  applicationQuestions,
  applicationSupplements,
} from "./application-data";

export default function Application() {
  const { account, setAccount } = usePortalAccount();
  const [feedback, setFeedback] = useState(null);
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const submission = new FormData();
    for (const question of applicationQuestions) {
      submission.set(
        question.name.replace(
          /^applicationQuestion(\d+)$/,
          "application_question_$1",
        ),
        formData.get(question.name) ?? "",
      );
    }
    const waiver = formData.get("waiver");
    if (waiver !== null) submission.set("waiver", waiver);
    const resume = formData.get("resume");
    if (resume) submission.set("resume", resume);

    setSaving(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/application", {
        method: "PATCH",
        body: submission,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const fields = Object.entries(data.fields ?? {}).map(
          ([field, message]) => `${field.replaceAll("_", " ")}: ${message}`,
        );
        throw new Error(fields.join(" ") || data.error || "Couldn't save your application.");
      }
      setAccount(data.account);
      setFeedback("Application changes saved.");
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main id="account-main" className="portal-main portal-application">
      <p className="portal-eyebrow">MakeSB 2027 / Your application</p>
      <h1>Application</h1>
      <p className="portal-intro">Complete your application for MakeSB 2027.</p>
      <form className="portal-application-form" onSubmit={submit}>
        {applicationGroups.map((group) => (
          <section className="portal-form-section" key={group.title}>
            <div className="portal-card-heading">
              <h2>{group.title}</h2>
              <p>{group.description}</p>
            </div>
            <div className="portal-form-section-fields">
              {group.questions.map((field) => (
                <FieldRenderer
                  key={field.id}
                  portal
                  field={{ ...field, defaultValue: account[field.name] }}
                />
              ))}
            </div>
          </section>
        ))}
        <section className="portal-form-section">
          <div className="portal-card-heading">
            <h2>{applicationSupplements.title}</h2>
            <p>{applicationSupplements.description}</p>
          </div>
          <div className="portal-form-section-fields">
            {applicationSupplements.fields.map((field) => (
              <FieldRenderer
                key={field.name}
                portal
                field={{
                  ...field,
                  defaultValue:
                    field.name === "waiver" ? account.waiver : undefined,
                  existingFileName:
                    field.name === "resume" ? account.resume?.name : undefined,
                }}
              />
            ))}
          </div>
        </section>
        {feedback && (
          <p
            className={feedback === "Application changes saved." ? "portal-success" : "portal-error"}
            role={feedback === "Application changes saved." ? "status" : "alert"}
          >
            {feedback}
          </p>
        )}
        <button className="portal-button" type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </button>
      </form>
    </main>
  );
}
