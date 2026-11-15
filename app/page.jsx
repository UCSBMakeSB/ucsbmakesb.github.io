import { FaqSection } from "../components/faq-section";
import { Header, Footer } from "../components/page-layout";
import { TeamSelector } from "../components/team-selector";
// import { Schedule } from "../components/schedule"; // Schedule hidden; uncomment to restore (also <Schedule /> below and the "schedule" link in components/page-layout.jsx)
import { SponsorsSection } from "../components/sponsors-section";
import { HomeScrollReset } from "../components/home-scroll-reset";

import Image from "next/image";
import { ApplyLink } from "../components/apply-link";

const sponsorUrl =
  "mailto:patrick_liu@ucsb.edu?subject=MakeSB%202027%20Sponsorship";

export default function HomePage() {
  return (
    <>
      <HomeScrollReset />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main">
        <section id="hero" className="hero" aria-labelledby="event-title">
          <Image
            className="hero-art"
            src="/assets/homepage.png"
            width={1672}
            height={941}
            alt="Illustration of Storke Tower and the UC Santa Barbara campus at golden hour"
            preload
          />
          <div className="hero-title">
            <h1 id="event-title">
              <span>Make</span>
              <em>SB</em>
            </h1>
            <p>
              <span className="hero-date-line">January 15—17, 2027</span>
              <br />
              UC Santa Barbara
            </p>
            <p className="hero-deadline">Apply by November 30</p>
          </div>
          <div className="hero-bottom">
            <div className="hero-info">
              <nav className="social-links" aria-label="Social links">
                <a
                  href="https://linktr.ee/ucsbmakesb"
                  target="_blank"
                  rel="noreferrer"
                >
                  LinkTree
                </a>
              </nav>
            </div>
            <div className="hero-actions">
              <ApplyLink className="apply-button">
                Apply to MakeSB <span aria-hidden="true">↗</span>
              </ApplyLink>
              <a
                className="sponsor-link"
                href={sponsorUrl}
              >
                Sponsor MakeSB <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </section>

        <section
          className="deadline-banner"
          aria-label="Application deadline"
        >
          <p>
            <strong>Applications are due November 30.</strong>
            <span>
              Questions? <a href="mailto:team@makesb.org">team@makesb.org</a>
            </span>
          </p>
          <ApplyLink className="apply-button">
            Apply now <span aria-hidden="true">↗</span>
          </ApplyLink>
        </section>

        <section
          id="about"
          className="page-section"
          aria-labelledby="about-title"
        >
          <div className="page-section-inner">
            <h2 id="about-title">What is MakeSB?</h2>
            <p className="lead">
              MakeSB is UCSB’s first hardware makeathon. For one weekend in
              January, students team up to design and build something real from
              scratch. It is free, and we supply the parts, tools, food and
              mentors. A pop-up Micro Center on site stocks components for when
              a part goes missing, and MakeWeek workshops the week before get
              you ready.
            </p>
            <p className="lead">
              We built MakeSB for students who have faced barriers to advanced
              STEM. That includes low-income and first-generation students,
              community college students, women in STEM, underrepresented
              groups, and anyone who has never had access to a makerspace. If
              that sounds like you, apply. You belong here.
            </p>

            <h3 className="subhead">Our mission</h3>
            <p>
              We want to make hardware accessible: giving people the parts,
              tools and support to build things they couldn’t otherwise. If
              you’ve faced barriers to advanced STEM, please apply. That is
              exactly why we built this.
            </p>
            <p>
              The best projects are fun and different. Think weather balloons,
              small rockets, drifting go-karts, a jet bike, or a surgical robot
              arm. We want MakeSB around for decades, and we want to help UCSB
              students land as many internships as possible through our
              sponsors.
            </p>
          </div>
        </section>

        <section
          id="special"
          className="page-section"
          aria-labelledby="special-title"
        >
          <div className="page-section-inner">
            <h2 id="special-title">What makes MakeSB special</h2>
            <p className="lead">
              It’s the first event of its kind at UCSB, and it’s free. Here is
              what you get.
            </p>
            <ul className="feature-grid">
              <li>
                <h3>Real parts, real budgets</h3>
                <p>
                  Sponsors like DigiKey and ST provide parts. Google Quantum AI,
                  SpaceX and UCSB make the funding possible, so teams can build
                  projects worth over $1,000.
                </p>
              </li>
              <li>
                <h3>A pop-up parts store</h3>
                <p>
                  A literal pop-up Micro Center for makers, on site all
                  weekend.
                </p>
              </li>
              <li>
                <h3>Parts before the event</h3>
                <p>
                  Shuttles to Home Depot and a hardware request form mean your
                  parts show up before the event starts.
                </p>
              </li>
              <li>
                <h3>Mentors from industry</h3>
                <p>
                  Engineers from companies like Meta, Amazon and Tesla, matched
                  to your project.
                </p>
              </li>
              <li>
                <h3>MakeWeek</h3>
                <p>
                  The week before, join idea jams, form your team, and attend
                  workshops.
                </p>
              </li>
              <li>
                <h3>Everything provided</h3>
                <p>Food, sleeping space and hardware are all taken care of.</p>
              </li>
            </ul>
          </div>
        </section>

        <section
          id="travel"
          className="page-section"
          aria-labelledby="travel-title"
        >
          <div className="page-section-inner">
            <h2 id="travel-title">Flights and housing</h2>
            <p className="lead">
              Coming from another school? Don’t let cost or distance stop you.
            </p>
            <ul className="feature-grid">
              <li>
                <h3>Flights to Santa Barbara</h3>
                <p>
                  We offer flights for low-income students, and we are working
                  hard to fly out every participant. We can’t cover everyone
                  yet.
                </p>
              </li>
              <li>
                <h3>Travel reimbursement</h3>
                <p>Makers from other schools can also get travel reimbursed.</p>
              </li>
              <li>
                <h3>Housing</h3>
                <p>
                  Makers from other schools can stay in UCSB dorms through our
                  hosting program, or in Isla Vista.
                </p>
              </li>
              <li>
                <h3>Airport shuttles</h3>
                <p>Shuttle pickups from the Santa Barbara airport (SBA).</p>
              </li>
            </ul>
            <p>
              If cost is the thing stopping you, email{" "}
              <a href="mailto:patrick_liu@ucsb.edu">patrick_liu@ucsb.edu</a>{" "}
              and we will do our best to support you.
            </p>
          </div>
        </section>

        <section
          id="perks"
          className="page-section"
          aria-labelledby="perks-title"
        >
          <div className="page-section-inner">
            <h2 id="perks-title">Perks and prizes</h2>
            <p className="lead">
              Build something great, and you could take home something great.
            </p>
            <ul className="feature-grid">
              <li>
                <h3>Free skydiving</h3>
                <p>For the best first-year project.</p>
              </li>
              <li>
                <h3>Free Framework laptop</h3>
                <p>For the most technically impressive project.</p>
              </li>
              <li>
                <h3>A Costco membership</h3>
                <p>
                  Thanks to our Costco sponsorship, a free Costco membership is
                  one of the prizes.
                </p>
              </li>
            </ul>
            {/* Not confirmed yet, so not shown: ASUS ROG grand prize / 2nd / 3rd
                place prizes, DigiKey and ASUS tracks, tracks from other sponsors,
                and extra perks (kits, swag, socials). Add them here once final. */}
            <p>
              More prizes and tracks will be announced as our sponsors confirm
              them.
            </p>
          </div>
        </section>

        {/* Schedule hidden for now. To restore: uncomment the import above, replace this comment with <Schedule />, re-add ["schedule", "Schedule"] to links in components/page-layout.jsx, and set the #faqs gradient start back to layer3 in css/styles.css. */}

        <FaqSection />

        <SponsorsSection />

        <section
          id="contact"
          className="page-section"
          aria-labelledby="contact-title"
        >
          <div className="page-section-inner">
            <h2 id="contact-title">Apply Here</h2>
            <p className="lead">
              Applications are due <strong>November 30</strong>. Questions? Email{" "}
              <a href="mailto:team@makesb.org">team@makesb.org</a>.
            </p>
            <ApplyLink className="apply-button">
              Apply to MakeSB <span aria-hidden="true">↗</span>
            </ApplyLink>
            <a className="sponsor-link" href={sponsorUrl}>
              Sponsor MakeSB <span aria-hidden="true">→</span>
            </a>
          </div>
        </section>

        <section
          id="team"
          className="page-section"
          aria-labelledby="team-title"
        >
          <div className="page-section-inner">
            <h2 id="team-title">Meet Our Team</h2>
            <TeamSelector />
          </div>
        </section>
      </main>
      <Footer sponsorUrl={sponsorUrl} />
    </>
  );
}
