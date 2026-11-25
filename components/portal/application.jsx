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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const applicationReceived =
    !saving &&
    !hasUnsavedChanges &&
    (!feedback || feedback === "Application changes saved.") &&
    account.waiver &&
    account.resume?.name &&
    applicationQuestions.every(
      (question) =>
        question.requirement !== "required" || account[question.name]?.trim(),
    );

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
    setHasUnsavedChanges(false);
    setFeedback(null);
    const previousAccount = account;
    const nextAccount = { ...account };
    for (const question of applicationQuestions) {
      nextAccount[question.name] = formData.get(question.name) ?? "";
    }
    if (waiver !== null) nextAccount.waiver = waiver === "on";
    if (resume instanceof File && resume.name) {
      nextAccount.resume = { name: resume.name };
    }
    setAccount(nextAccount);
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
        throw new Error(
          fields.join(" ") || data.error || "Couldn't save your application.",
        );
      }
      setAccount(data.account);
      setFeedback("Application changes saved.");
    } catch (error) {
      setAccount(previousAccount);
      setFeedback(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main id="account-main" className="portal-main portal-application">
      <p className="portal-eyebrow">MakeSB 2027 / Your application</p>
      <h1>Application</h1>
      <p className="portal-intro">
        Complete your application for MakeSB 2027. You can edit your submitted
        application through November 30. For your application to be considered,
        all required fields must be completed. We recommend that you also save
        these responses in another place for safe keeping.
        <br />
        <br />
        Note that changes are NOT saved by default. Before navigating away from
        this page, be sure to click "Save" to store your changes.
      </p>
      <form
        className="portal-application-form"
        onChange={() => setHasUnsavedChanges(true)}
        onSubmit={submit}
      >
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
        {feedback && !applicationReceived && (
          <p
            className={
              feedback === "Application changes saved."
                ? "portal-success"
                : "portal-error"
            }
            role={
              feedback === "Application changes saved." ? "status" : "alert"
            }
          >
            {feedback}
          </p>
        )}
        <p>
          You can edit your submitted application through November 30. For your
          application to be considered, all required fields must be completed.
          <br />
          <br />
          Note that changes are NOT saved by default. Before navigating away
          from this page, be sure to click "Save" to store your changes.
        </p>
        <div className="portal-application-actions">
          <button className="portal-button" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
          <div className="portal-application-status" role="status">
            {applicationReceived && (
              <>
                <span aria-hidden="true">✓</span> Application Received! Changes
                are accepted until the 30th
              </>
            )}
          </div>
        </div>
      </form>
    </main>
  );
}
