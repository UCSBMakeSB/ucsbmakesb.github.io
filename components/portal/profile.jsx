"use client";

import { useState } from "react";
import FieldRenderer, { formFields } from "../field-renderer";
import { usePortalAccount } from "./account";

const profileFields = formFields.filter(
  (field) => field.section === "primary",
);

export default function Profile() {
  const { account, actions, setAccount } = usePortalAccount();
  const [feedback, setFeedback] = useState(null);

  function getDefaultValue(field) {
    if (field.name === "preferredFirstName") return account.firstName;
    if (field.name === "lastName") return account.lastName;
    return account[field.name];
  }

  async function submit(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));

    try {
      if (actions?.updateProfile) {
        const updated = await actions.updateProfile({
          firstName: values.preferredFirstName.trim(),
          lastName: values.lastName.trim(),
        });
        setAccount((previous) => ({ ...previous, ...updated }));
      } else {
        setAccount((previous) => ({
          ...previous,
          firstName: values.preferredFirstName.trim(),
          lastName: values.lastName.trim(),
          email: values.email,
          mobileNumber: values.mobileNumber,
          emergencyContactName: values.emergencyContactName,
          emergencyContactMobileNumber: values.emergencyContactMobileNumber,
          major: values.major,
          year: values.year,
          age: values.age,
          country: values.country,
          school: values.school,
          "food-allergies": values["food-allergies"],
        }));
      }
      setFeedback("Profile changes saved.");
    } catch {
      setFeedback("We couldn’t save your changes. Please try again.");
    }
  }

  return (
    <main id="account-main" className="portal-main portal-profile">
      <p className="portal-eyebrow">MakeSB 2027 / Your account</p>
      <h1>Profile</h1>
      <p className="portal-intro">
        View and update the information on your applicant profile.
      </p>
      <form className="portal-profile-form" onSubmit={submit}>
        {profileFields.map((field) => (
          <FieldRenderer
            key={field.id}
            field={{
              ...field,
              defaultValue: getDefaultValue(field),
              required: field.name !== "food-allergies",
            }}
          />
        ))}
        {feedback && (
          <p
            className={
              feedback.startsWith("We ") ? "portal-error" : "portal-success"
            }
            role={feedback.startsWith("We ") ? "alert" : "status"}
          >
            {feedback}
          </p>
        )}
        <button className="portal-button" type="submit">
          Save changes
        </button>
      </form>
    </main>
  );
}
