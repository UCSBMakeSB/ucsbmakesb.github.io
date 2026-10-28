"use client";

import { Dashboard } from "./dashboard";
import Application from "./application";
import { AccountSettings } from "./settings";
import Profile from "./profile";
import { usePortalPath } from "./navigation";

export function PortalClientRouter() {
  const pathname = usePortalPath();

  if (pathname === "/portal/profile") return <Profile />;
  if (pathname === "/portal/application") return <Application />;
  if (pathname === "/portal/settings") return <AccountSettings />;
  return <Dashboard />;
}
