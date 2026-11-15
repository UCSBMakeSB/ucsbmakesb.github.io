import Image from "next/image";
import { redirect } from "next/navigation";
import { ApplicationForm } from "../../components/application-form";
import { FaqItem } from "../../components/faq-section";
import { Header, Footer } from "../../components/page-layout";
import { ScrollClippedForm } from "../../components/scroll-clipped-form";
import FieldRenderer, { formFields } from "../../components/field-renderer";
import { escapeLikePattern } from "../../lib/db-helpers";
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

You may register with a team of up to 4 people. Each team member must register individually and enter the exact same team name. If you do not have a team, register as an individual, and we will help place you into a team before or during the event.

We are also looking for volunteers, mentors, faculty, industry guests, and alumni who are interested in helping students build and refine their projects.

Prizes and Tracks will be released soon!
`;

const NOTICES = {
  draft_expired:
    "Your saved application expired before it was linked to your account. Please submit it again, it only takes a couple of minutes.",
  draft_claimed:
    "That application is already being linked to an account. Open the portal, or submit the form again if it is not there.",
  email_mismatch:
    "That application was started with a different email than the one you're signed in with. Submit it again here and it will be saved to this account.",
  claim_failed:
    "Your answers are saved, but we couldn't finish setting up your portal just now. Please try again in a minute. If it keeps happening, email team@makesb.org.",
};

// Signed-in applicants normally live in the portal. The form is only shown to
// a signed-in user when their account has no application yet (for example the
// saved draft expired), so they are never bounced between /apply and /portal.
async function getSignedInState(user) {
  const admin = getSupabaseAdmin();
  const { data: application, error: applicationError } = await admin
    .from("applications")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (applicationError) {
    console.error("Apply page application lookup failed:", applicationError);
    return { hasApplication: false, hasPendingDraft: false };
  }
  if (application) return { hasApplication: true, hasPendingDraft: false };

  const { data: drafts, error: draftError } = await admin
    .from("application_drafts")
    .select("id")
    .ilike("email", escapeLikePattern(user.email ?? ""))
    .is("claimed_at", null)
    .gt("expires_at", new Date().toISOString())
    .limit(1);
  if (draftError) {
    console.error("Apply page draft lookup failed:", draftError);
  }
  return { hasApplication: false, hasPendingDraft: Boolean(drafts?.length) };
}

export default async function Apply({ searchParams }) {
  const authConfigured = Boolean(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  const submissionsConfigured = Boolean(
    authConfigured && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const params = (await searchParams) ?? {};
  const notice = NOTICES[params.notice] ?? null;

  let signedInEmail = null;
  let hasPendingDraft = false;
  if (submissionsConfigured) {
    const supabase = await getSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const state = await getSignedInState(user);
      if (state.hasApplication) {
        redirect("/portal/profile");
      }
      signedInEmail = user.email ?? null;
      hasPendingDraft = state.hasPendingDraft;
    }
  }

  const fieldFor = (field) =>
    field.name === "email" && signedInEmail
      ? { ...field, defaultValue: signedInEmail, readOnly: true }
      : field;

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
                Register today for UCSB's first hardware hackathon and make
                something special. <em>How will you change the world?</em>
              </h2>
            </div>
            <div className="apply-bird-container">
              <Image
                src="/assets/faq-smile.png"
                className="apply-bird"
                width={540 / 5}
                height={710 / 5}
                alt="Bird that's so excited for you to register that it's jumping up and down."
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
          <p className="application-form-note">
            Applying takes about two minutes. We only ask for logistics like
            emergency contacts and dietary needs later, if you're admitted.
          </p>
          {notice && (
            <p className="application-form-status" data-status="error" role="alert">
              {notice}
            </p>
          )}
          {hasPendingDraft ? (
            <div className="application-form-status" role="status">
              <p>
                We have your application on file for {signedInEmail}. One more
                step links it to your account.
              </p>
              <p>
                <a href="/api/apply/claim-draft?next=/portal/application">
                  Finish setting up my portal
                </a>
              </p>
            </div>
          ) : (
            <ApplicationForm className="application-form" disabled={!submissionsConfigured}>
              <div className="application-form-fields">
                {formFields
                  .filter((field) => field.section === "primary")
                  .map((field) => (
                    <FieldRenderer key={field.id} field={fieldFor(field)} />
                  ))}
              </div>
              {/* The waiver checkbox used to render here (section
                  "standalone"). ASK AFTER ADMISSION: it now lives in the
                  portal, see postAdmissionFields in components/field-renderer.jsx. */}
              <div className="application-form-fields application-form-fields-wide">
                {formFields
                  .filter((field) => field.section === "secondary")
                  .map((field) => (
                    <FieldRenderer key={field.id || field.name} field={field} />
                  ))}
              </div>
            </ApplicationForm>
          )}
        </ScrollClippedForm>
      </main>

      <Footer sponsorUrl={sponsorUrl} />
    </>
  );
}
