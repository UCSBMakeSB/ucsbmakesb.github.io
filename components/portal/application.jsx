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
