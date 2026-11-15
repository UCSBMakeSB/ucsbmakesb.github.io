import { FaqSection } from "../components/faq-section";
import { Header, Footer } from "../components/page-layout";
import { TeamGrid } from "../components/team-grid";
import { SponsorsSection } from "../components/sponsors-section";
import { AboutSection, TracksSection } from "../components/home-sections";
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
              <span className="hero-tagline">
                UCSB’s first hardware makeathon
              </span>
            </p>
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
              <p className="hero-deadline">Applications close November 30</p>
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

        <AboutSection />

        <TracksSection />

        <FaqSection />

        <SponsorsSection />

        <section
          id="team"
          className="page-section"
          aria-labelledby="team-title"
        >
          <div className="page-section-inner team-inner">
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
