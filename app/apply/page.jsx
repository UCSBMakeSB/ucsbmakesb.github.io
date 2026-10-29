import Image from "next/image";
import { redirect } from "next/navigation";
import { ApplicationForm } from "../../components/application-form";
import { FaqItem } from "../../components/faq-section";
import { Header, Footer } from "../../components/page-layout";
import { ScrollClippedForm } from "../../components/scroll-clipped-form";
import FieldRenderer, { formFields } from "../../components/field-renderer";
import { getSupabaseServer } from "../../lib/supabase-server";

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

export default async function Apply() {
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
      redirect("/portal/profile");
    }
  }

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
          <ApplicationForm className="application-form" disabled={!submissionsConfigured}>
            <div className="application-form-fields">
              {formFields
                .filter((field) => field.section === "primary")
                .map((field) => (
                  <FieldRenderer key={field.id} field={field} />
                ))}
            </div>
            <FieldRenderer
              field={formFields.find((field) => field.section === "standalone")}
            />
            <div className="application-form-fields">
              {formFields
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
