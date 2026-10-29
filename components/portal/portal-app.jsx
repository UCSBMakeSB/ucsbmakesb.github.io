"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Dashboard } from "./dashboard";
import Application from "./application";
import { AccountSettings } from "./settings";
import Profile from "./profile";

const views = {
  "/portal": Dashboard,
  "/portal/profile": Profile,
  "/portal/application": Application,
  "/portal/settings": AccountSettings,
};

const titles = {
  "/portal": "Portal | MakeSB",
  "/portal/profile": "Profile | MakeSB",
  "/portal/application": "Application | MakeSB",
  "/portal/settings": "Account settings | MakeSB",
};

export function PortalApp() {
  const pathname = usePathname();
  const View = views[pathname] ?? Dashboard;

  useEffect(() => {
    document.title = titles[pathname] ?? titles["/portal"];
  }, [pathname]);

  return (
    <div key={pathname} className="portal-page-transition">
      <View />
    </div>
  );
}
