import Image from "next/image";
import { redirect } from "next/navigation";
import { ApplicationForm } from "../../components/application-form";
import { FaqItem } from "../../components/faq-section";
import { Header, Footer } from "../../components/page-layout";
import { ScrollClippedForm } from "../../components/scroll-clipped-form";
import FieldRenderer, { formFields } from "../../components/field-renderer";
import { getSupabaseAdmin, getSupabaseServer } from "../../lib/supabase-server";

const sponsorUrl =
  "mailto:patrick_liu@ucsb.edu?subject=MakeSB%202027%20Sponsorship";

const info = `Over 36+ hours, teams will design, prototype, and demo hardware projects using parts, tools, and resources provided at the event.

Event Details
Building Location: TBD
Cost: Free
Food and parts: Provided

Participants will have access to resources such as 3D printing through the Library and IEEE Makerspace, electronics components, cameras, displays, drone/RC parts, ESP32s, and other hardware supplies. You may also bring your own parts, but completed projects are not allowed.

Leading up to MakeSB, we will host MakeWeek, a series of hour-long workshops covering topics such as CAD, ESP32 development, electronics, and hardware prototyping.

Teams are 4 to 5 people. Everyone completes an individual application, then one person creates a join code and the rest enter it. If you do not have a team, apply on your own and we will help place you. For a bigger or smaller team, email team@makesb.org and we will decide case by case.

We are also looking for volunteers, mentors, faculty, industry guests, and alumni who are interested in helping students build and refine their projects.

Prizes and Tracks will be released soon!
`;

const NOTICES = {
  draft_expired:
    "Your saved application expired before it could be linked to your account.",
  draft_claimed: "That application is already linked to an account.",
  no_application: "We couldn't find a saved application for your email address.",
};

// Signed in, but no application on the account. The portal sends these users
// here, so this page must never send them back to the portal (that was an
// infinite redirect loop).
function NoApplication({ notice }) {
  return (
    <>
      <Header fixed />
      <main id="main" className="auth-page">
        <section className="auth-card" aria-labelledby="no-application-title">
          <p className="auth-eyebrow">MakeSB 2027 / Application</p>
          <h1 id="no-application-title">We couldn't find your application</h1>
          <p className="auth-intro">
            {NOTICES[notice] ||
              "You're signed in, but there's no application on this account yet."}{" "}
            Try again below, and if it still doesn't work, email{" "}
            <a href="mailto:team@makesb.org">team@makesb.org</a> from the address
            you applied with and we'll sort it out.
          </p>
          <p className="auth-footer">
            <a href="/api/apply/claim-draft?next=/portal/profile">
              Try linking my application again
            </a>
          </p>
        </section>
      </main>
    </>
  );
}

export default async function Apply({ searchParams }) {
  const authConfigured = Boolean(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  const submissionsConfigured = Boolean(
    authConfigured && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  if (authConfigured) {
    const supabase = await getSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: application, error } = await getSupabaseAdmin()
        .from("applications")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) console.error("Apply page application lookup failed:", error);
      if (application) redirect("/portal/profile");

      const { notice } = (await searchParams) ?? {};
      return <NoApplication notice={notice} />;
    }
  }

  // Questions asked only after admission (still used by the portal).
  const applyFields = formFields.filter((field) => !field.postAdmission);

  return (
    <>
      <Header fixed />
      <main id="main" className="hero apply-hero">
        <ScrollClippedForm>
          <div className="form-header">
            <div>
              <h1 className="form-header-text">
                Build Something <span>Real</span>
              </h1>
              <h2>
                Create your account for UCSB's first hardware hackathon and make
                something special. <em>How will you change the world?</em>
              </h2>
            </div>
            <div className="apply-bird-container">
              <Image
                src="/assets/faq-smile.png"
                className="apply-bird"
                width={540 / 5}
                height={710 / 5}
                alt="Bird that's so excited for you to create your account that it's jumping up and down."
              />
              <div className="apply-bird-shadow" />
            </div>
          </div>

          <FaqItem question="Have questions?" answer={info} inline />

          {!submissionsConfigured && (
            <p role="status">
              Applications are temporarily unavailable. Please try again later.
            </p>
          )}
          <ApplicationForm className="application-form" submitLabel="Create account" disabled={!submissionsConfigured}>
            <div className="application-form-fields">
              {applyFields
                .filter((field) => field.section === "primary")
                .map((field) => (
                  <FieldRenderer key={field.id} field={field} />
                ))}
            </div>
            <FieldRenderer
              field={applyFields.find((field) => field.section === "standalone")}
            />
            <div className="application-form-fields">
              {applyFields
                .filter((field) => field.section === "secondary")
                .map((field) => (
                  <FieldRenderer key={field.id || field.name} field={field} />
                ))}
            </div>
          </ApplicationForm>
        </ScrollClippedForm>
      </main>

      <Footer sponsorUrl={sponsorUrl} />
    </>
  );
}
