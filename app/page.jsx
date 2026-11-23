import { FaqSection } from "../components/faq-section";
import { Header, Footer } from "../components/page-layout";
import { TeamGrid } from "../components/team-grid";
import { SponsorsSection } from "../components/sponsors-section";
import { Schedule } from "../components/schedule";
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
            priority
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
            <p className="hero-tagline">UCSB’s First Hardware Makeathon</p>{" "}
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
              <a className="sponsor-link" href={sponsorUrl}>
                Sponsor MakeSB <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </section>

        

        <section className="deadline-banner" aria-label="Application deadline">
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
            <p>
              MakeSB is UCSB’s first hardware hackathon! It’s a weekend-long
              engineering event where students come together to design and build
              innovative projects from scratch. As something that is first of
              its kind, we are extremely excited to bring together hundreds of
              undergraduate students. Additionally, we offer workshops,
              mentorship, and events where hackers can learn and build technical
              skills, learn from others, and meet and make new friends.
            </p>
          </div>
        </section>

        {/* <Schedule /> */}

        <FaqSection />

        <SponsorsSection />
{/* 
        <section
          id="contact"
          className="page-section"
          aria-labelledby="contact-title"
        >
          <div className="page-section-inner">
            <h2 id="contact-title">Apply Here</h2>
            <p className="lead">
              Applications are due <strong>November 30</strong>. Questions?
              Email <a href="mailto:team@makesb.org">team@makesb.org</a>.
            </p>
            <ApplyLink className="apply-button">
              Apply to MakeSB <span aria-hidden="true">↗</span>
            </ApplyLink>
            <a className="sponsor-link" href={sponsorUrl}>
              Sponsor MakeSB <span aria-hidden="true">→</span>
            </a>
          </div>
        </section> */}

        <section
          id="team"
          className="page-section"
          aria-labelledby="team-title"
        >
          <div className="page-section-inner">
            <div className="team-head">
              <h2 id="team-title">Meet Our Team</h2>
              <p className="team-note">The students building MakeSB</p>
            </div>
            <TeamGrid />
          </div>
        </section>
      </main>
      <Footer sponsorUrl={sponsorUrl} />
    </>
  );
}
