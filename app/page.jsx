import { FaqSection } from "../components/faq-section";
import { Header, Footer } from "../components/page-layout";
import { TeamSelector } from "../components/team-selector";
import { Schedule } from "../components/schedule";

import Image from "next/image";
import Link from "next/link";

const applyUrl =
  "https://docs.google.com/forms/d/e/1FAIpQLSc69LeujVIem99yf-DhmwljMJxpeXlxWjMpiGqNGNK5MQrKGQ/viewform?usp=publish-editor";

const sponsorUrl =
  "mailto:patrick_liu@ucsb.edu?subject=MakeSB%202027%20Sponsorship";

export default function HomePage() {
  return (
    <>
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
              <a
                className="apply-button"
                href={applyUrl}
                target="_blank"
                rel="noreferrer"
              >
                Apply to MakeSB <span aria-hidden="true">↗</span>
              </a>
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

        <Schedule />

        <FaqSection />

        <section
          id="sponsors"
          className="page-section"
          aria-labelledby="sponsors-title"
        >
          <div className="page-section-inner">
            <h2 id="sponsors-title">Sponsors</h2>
            <ul className="sponsor-row">
              <li>Coming Soon!</li>
            </ul>
          </div>
        </section>

        <section
          id="contact"
          className="page-section"
          aria-labelledby="contact-title"
        >
          <div className="page-section-inner">
            <h2 id="contact-title">Apply Here</h2>
            <a
              className="apply-button"
              href={applyUrl}
              target="_blank"
              rel="noreferrer"
            >
              Apply to MakeSB <span aria-hidden="true">↗</span>
            </a>
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
            <p className="team-description">
              Meet the students making MakeSB happen.
            </p>
            <TeamSelector />
          </div>
        </section>
      </main>
      <Footer applyUrl={applyUrl} sponsorUrl={sponsorUrl} />
    </>
  );
}
