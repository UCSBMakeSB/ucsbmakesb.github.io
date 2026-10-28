import { PortalApp } from "../../../components/portal/portal-app";
import { notFound } from "next/navigation";

const pageTitles = {
  profile: "Profile | MakeSB",
  application: "Application | MakeSB",
  settings: "Account settings | MakeSB",
};

export async function generateMetadata({ params }) {
  const { section } = await params;
  if (section?.length > 1 || (section?.[0] && !pageTitles[section[0]])) {
    return {};
  }
  const title = pageTitles[section?.[0]];
  return title ? { title } : { title: "Portal | MakeSB" };
}

export default async function PortalPage({ params }) {
  const { section } = await params;
  if (section?.length > 1 || (section?.[0] && !pageTitles[section[0]])) {
    notFound();
  }

  return <PortalApp />;
}
