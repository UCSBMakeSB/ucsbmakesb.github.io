"use client";

import { createContext, useContext, useMemo, useState } from "react";

const previewUser = {
  firstName: "Alex",
  lastName: "Rivera",
  email: "alex@example.com",
  password: "preview-password",
  mobileNumber: "805-555-0142",
  emergencyContactName: "Jordan Rivera",
  emergencyContactMobileNumber: "805-555-0188",
  major: "computer-science",
  year: "senior",
  age: "21",
  country: "united-states",
  school: "ucsb",
  "food-allergies": "No allergies",
  waiver: true,
  experience: "yes",
  resume: { name: "alex-rivera-resume.pdf" },
  applicationQuestion1:
    "I want to build something useful with a team and learn from other makers.",
  applicationQuestion2:
    "I plan to turn the prototype into an open-source project and keep iterating after the event.",
};

export async function getPreviewUser() {
  return structuredClone(previewUser);
}

const PortalAccountContext = createContext(null);

export function PortalAccountProvider({
  children,
  initialAccount,
  actions,
}) {
  const [account, setAccount] = useState(initialAccount ?? previewUser);
  const value = useMemo(
    () => ({ account, actions, setAccount, loading: false }),
    [account, actions],
  );

  return (
    <PortalAccountContext.Provider value={value}>
      {children}
    </PortalAccountContext.Provider>
  );
}

export function usePortalAccount() {
  const context = useContext(PortalAccountContext);
  if (!context)
    throw new Error(
      "usePortalAccount must be used within PortalAccountProvider",
    );
  return context;
}
