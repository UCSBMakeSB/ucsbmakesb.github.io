"use client";

import Link from "next/link";

import { useState } from "react";
import FieldRenderer, { formFields } from "../field-renderer";
import { usePortalAccount } from "./account";

const profileGroups = [
  {
    title: "Personal Details",
    description: "How we will contact you about MakeSB.",
    names: ["preferredFirstName", "lastName", "mobileNumber"],
  },
  {
    title: "Emergency Info",
    description: "Someone we can contact in an emergency.",
    names: ["emergencyContactName", "emergencyContactMobileNumber"],
  },
  {
    title: "Demographics",
    description: "Information about your background and education.",
    names: ["major", "year", "age", "country", "school"],
  },
  {
    title: "Food Details",
    description: "Tell us about any food allergies or restrictions.",
    names: ["food-allergies"],
  },
];

export default function Profile() {
  const { account, setAccount } = usePortalAccount();
  const [feedback, setFeedback] = useState(null);
  const [saving, setSaving] = useState(false);

  function getDefaultValue(field) {
    if (field.name === "preferredFirstName") return account.firstName;
    if (field.name === "lastName") return account.lastName;
    return account[field.name];
  }

  async function submit(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));

    setSaving(true);
    setFeedback(null);
    const previousAccount = account;
    const nextAccount = {
      ...account,
      firstName: values.preferredFirstName,
      lastName: values.lastName,
      mobileNumber: values.mobileNumber,
      emergencyContactName: values.emergencyContactName,
      emergencyContactMobileNumber: values.emergencyContactMobileNumber,
      major: values.major,
      year: values.year,
      age: values.age,
      country: values.country,
      school: values.school,
      "food-allergies": values["food-allergies"],
    };
    setAccount(nextAccount);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const fields = Object.entries(data.fields ?? {}).map(
          ([field, message]) => `${field}: ${message}`,
        );
        throw new Error(fields.join(" ") || data.error || "Couldn't save your changes.");
      }
      setAccount((previous) => ({ ...previous, ...data.account }));
      setFeedback("Profile changes saved.");
    } catch (error) {
      setAccount(previousAccount);
      setFeedback(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main id="account-main" className="portal-main portal-profile">
      <p className="portal-eyebrow">MakeSB 2027 / Your account</p>
      <h1>Profile</h1>
      <p className="portal-intro">
        View and update the information on your applicant profile.
        <br /><br />
        If you're trying to open a new application for someone else, log out and visit the <Link href="/apply">Apply</Link> page.
      </p>
      <form className="portal-profile-form" onSubmit={submit}>
        {profileGroups.map((group) => (
            <section className="portal-form-section" key={group.title}>
              <div className="portal-card-heading">
                <h2>{group.title}</h2>
                <p>{group.description}</p>
              </div>
              <div className="portal-form-section-fields">
                {group.names.map((name) => {
                  const field = formFields.find(
                    (candidate) => candidate.name === name,
                  );
                  return (
                    <FieldRenderer
                      key={field.id}
                      portal
                      field={{
                        ...field,
                        defaultValue: getDefaultValue(field),
                      }}
                    />
                  );
                })}
              </div>
            </section>
        ))}
        {feedback && (
          <p
            className={
              feedback === "Profile changes saved."
                ? "portal-success"
                : "portal-error"
            }
            role={feedback === "Profile changes saved." ? "status" : "alert"}
          >
            {feedback}
          </p>
        )}
        <button className="portal-button" type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      </form>
    </main>
  );
}
