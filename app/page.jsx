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
            <p className="hero-tagline">UCSB’s First Hardware Makeathon</p>          </div>
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
              MakeSB is UCSB’s first hardware makeathon. Over one weekend in
              January, student teams design and build original projects from
              the ground up. Participation is free, and we provide the parts,
              tools, meals and mentorship. An on-site pop-up parts store
              supplies components when you need them, and MakeWeek workshops
              the week before prepare you for the event.
            </p>
            <p className="lead">
              MakeSB was created for students who have faced barriers to
              advanced STEM education, including low-income and first-generation
              students, community college students, women in engineering,
              underrepresented groups, and anyone who has not had access to a
              makerspace. If this describes you, we encourage you to apply.
            </p>

            <h3 className="subhead">Our mission</h3>
            <p>
              Our mission is to make hardware accessible by giving students the
              parts, tools and support they need to build projects they could
              not otherwise attempt. We want participants to take on ambitious,
              creative ideas, such as weather balloons, small rockets, drifting
              go-karts, a jet bike or a surgical robot arm.
            </p>
            <p>
              Our long-term goal is to establish MakeSB as a lasting UCSB
              tradition and to connect students with internship opportunities
              through our sponsors.
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
              MakeSB is the first event of its kind at UCSB, and it is free to
              attend. Here is what we provide.
            </p>
            <ul className="feature-grid">
              <li>
                <h3>Funded hardware</h3>
                <p>
                  Sponsors including DigiKey and STMicroelectronics donate
                  components, while Google Quantum AI, SpaceX and UCSB provide
                  the funding that allows teams to build projects costing more
                  than $1,000.
                </p>
              </li>
              <li>
                <h3>On-site parts store</h3>
                <p>
                  A pop-up parts store is available to makers throughout the
                  weekend.
                </p>
              </li>
              <li>
                <h3>Parts before the event</h3>
                <p>
                  Shuttles to Home Depot and a hardware request form ensure your
                  parts are ready before the event begins.
                </p>
              </li>
              <li>
                <h3>Industry mentors</h3>
                <p>
                  Engineers from companies such as Meta, Amazon and Tesla are
                  matched to your project.
                </p>
              </li>
              <li>
                <h3>MakeWeek</h3>
                <p>
                  The week before the event includes idea jams, team formation
                  and technical workshops.
                </p>
              </li>
              <li>
                <h3>Everything included</h3>
                <p>
                  Meals, sleeping space and hardware are provided to all
                  participants.
                </p>
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
              Traveling from another school? We want cost and distance to stand
              in the way as little as possible.
            </p>
            <ul className="feature-grid">
              <li>
                <h3>Flights to Santa Barbara</h3>
                <p>
                  We offer flights to low-income students, and we are working to
                  extend this support to all participants.
                </p>
              </li>
              <li>
                <h3>Travel reimbursement</h3>
                <p>
                  Participants from other schools may also receive travel
                  reimbursement.
                </p>
              </li>
              <li>
                <h3>Housing</h3>
                <p>
                  Participants from other schools can stay in UCSB dorms through
                  our hosting program or with hosts in Isla Vista.
                </p>
              </li>
              <li>
                <h3>Airport shuttles</h3>
                <p>
                  Shuttle service is available from the Santa Barbara Airport
                  (SBA).
                </p>
              </li>
            </ul>
            <p>
              If cost is preventing you from attending, please contact{" "}
              <a href="mailto:patrick_liu@ucsb.edu">patrick_liu@ucsb.edu</a>.
              We will do our best to support you.
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
              Outstanding projects will be recognized with prizes from our
              sponsors.
            </p>
            <ul className="feature-grid">
              <li>
                <h3>Skydiving experience</h3>
                <p>Awarded to the best first-year project.</p>
              </li>
              <li>
                <h3>Framework laptop</h3>
                <p>Awarded to the most technically impressive project.</p>
              </li>
              <li>
                <h3>Costco membership</h3>
                <p>
                  A Costco membership is offered as a prize through our Costco
                  sponsorship.
                </p>
              </li>
            </ul>
            {/* Not confirmed yet, so not shown: ASUS ROG grand prize / 2nd / 3rd
                place prizes, DigiKey and ASUS tracks, tracks from other sponsors,
                and extra perks (kits, swag, socials). Add them here once final. */}
            <p>
              Additional prizes and tracks will be announced as our sponsors
              confirm them.
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
