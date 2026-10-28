import { Footer } from "../../components/page-layout";
import { redirect } from "next/navigation";
import { PortalHeader } from "../../components/portal/header";
import { PortalAccountProvider } from "../../components/portal/account";
import { PortalSidebar } from "../../components/portal/sidebar";
import { PortalScrollReset } from "../../components/portal/scroll-reset";
import { getSupabaseAdmin, getSupabaseServer } from "../../lib/supabase-server";
import "../../css/portal.css";

const pages = [
  {
    title: "Dashboard",
    href: "/portal",
  },
  {
    title: "Profile",
    href: "/portal/profile",
  },
  {
    title: "Application",
    href: "/portal/application",
  },
  {
    title: "Account settings",
    href: "/portal/settings",
  },
];

function applicationToAccount(application, email) {
  return {
    firstName: application.preferred_first_name,
    lastName: application.last_name,
    email: email ?? application.email,
    mobileNumber: application.mobile_number,
    emergencyContactName: application.emergency_contact_name,
    emergencyContactMobileNumber: application.emergency_contact_mobile_number,
    major: application.major,
    year: application.year,
    age: application.age,
    country: application.country,
    school: application.school,
    "food-allergies": application.food_allergies ?? "",
    waiver: application.waiver_accepted,
    experience: application.prior_hackathon_experience ? "yes" : "no",
    resume: application.resume_path
      ? { name: application.resume_path.split("/").pop() }
      : null,
    ...Object.fromEntries(
      Array.from({ length: 8 }, (_, index) => [
        `applicationQuestion${index + 1}`,
        application[`application_question_${index + 1}`] ?? "",
      ]),
    ),
  };
}

async function getInitialAccount() {
  const supabaseServer = await getSupabaseServer();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  if (!user) {
    redirect("/login?next=/portal");
  }

  const { data: application, error } = await getSupabaseAdmin()
    .from("applications")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Portal application lookup failed:", error);
    throw new Error("Couldn't load the portal application.");
  }
  if (!application) {
    redirect("/apply");
  }

  return applicationToAccount(application, user.email);
}

export default async function Layout({ children }) {
  const initialAccount = await getInitialAccount();

  return (
    <PortalAccountProvider initialAccount={initialAccount}>
      <PortalScrollReset />
      <PortalHeader />
      <div className="portal-shell">
        <a className="skip-link" href="#account-main">
          Skip to account settings
        </a>
        <div className="portal-layout">
          <PortalSidebar pages={pages} />
          {children}
        </div>
      </div>
      <Footer />
    </PortalAccountProvider>
  );
}
