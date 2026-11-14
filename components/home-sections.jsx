import { ApplyLink } from "./apply-link";

const barriers = [
  "Low-income students",
  "First-generation students",
  "Community college students",
  "Women in STEM",
  "Underrepresented groups",
  "Anyone without makerspace access",
];

const specials = [
  ["01", "UCSB’s first hardware hackathon"],
  ["02", "Free to attend"],
  ["03", "Parts and tools provided"],
  ["04", "Mentors on hand"],
  ["05", "MakeWeek workshops the week before"],
];

const tracks = [
  "Weather balloon / high altitude",
  "Rocketry",
  "Go-kart / vehicles",
  "Robotics",
  "Accessibility / assistive tech",
  "Sustainability",
  "Healthcare",
];

const ideas = [
  "A weather balloon",
  "A small rocket",
  "A drifting go-kart",
  "A jet-propelled bike",
  "A surgical robot arm",
];

const provided = [
  [
    "Flights and travel",
    "We offer flights to Santa Barbara for low-income students, and we are working to fly out all participants. Makers from other schools can also get their travel reimbursed.",
  ],
  [
    "Housing",
    "Makers from other schools can stay with us through dorm hosting.",
  ],
  [
    "Food, hardware and mentors",
    "Meals, hardware, parts and tools are all provided, and mentors are on hand to help you get unstuck.",
  ],
  [
    "A pop-up Micro Center",
    "Need a part? Our pop-up Micro Center has components on hand so a missing part never ends a project.",
  ],
];

export function SpecialBlock() {
  return (
    <div className="special-block">
      <h3>What makes MakeSB special</h3>
      <ol className="special-list">
        {specials.map(([number, text]) => (
          <li key={number}>
            <span className="row-number" aria-hidden="true">
              {number}
            </span>
            <span>{text}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function MissionSection() {
  return (
    <section
      id="mission"
      className="page-section big-section"
      aria-labelledby="mission-title"
    >
      <div className="page-section-inner">
        <h2 id="mission-title">Our mission</h2>
        <p className="big-statement">
          MakeSB supports students who have faced barriers to advanced STEM.
        </p>
        <ul className="barrier-list" aria-label="Who we are here for">
          {barriers.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
        <p className="big-follow">
          If you have faced barriers to building hardware, we want you here.
          Apply, even if you are not sure you belong. You do.
        </p>
      </div>
    </section>
  );
}

export function TracksSection() {
  return (
    <section
      id="tracks"
      className="page-section big-section"
      aria-labelledby="tracks-title"
    >
      <div className="page-section-inner">
        <h2 id="tracks-title">Tracks and project ideas</h2>
        <ol className="track-list">
          {tracks.map((text, index) => (
            <li key={text}>
              <span className="row-number" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{text}</span>
            </li>
          ))}
        </ol>
        <h3 className="idea-heading">Need a spark? Build</h3>
        <ul className="idea-list">
          {ideas.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function ProvidedSection() {
  return (
    <section
      id="support"
      className="page-section big-section"
      aria-labelledby="support-title"
    >
      <div className="page-section-inner">
        <h2 id="support-title">Everything you need to build</h2>
        <dl className="provided-list">
          {provided.map(([title, text]) => (
            <div key={title}>
              <dt>{title}</dt>
              <dd>{text}</dd>
            </div>
          ))}
        </dl>
        <p className="big-follow">
          Questions about flights, travel or housing? Email{" "}
          <a href="mailto:team@makesb.org">team@makesb.org</a>.
        </p>
      </div>
    </section>
  );
}

export function ApplySection({ sponsorUrl }) {
  return (
    <section
      id="contact"
      className="page-section"
      aria-labelledby="contact-title"
    >
      <div className="page-section-inner apply-band">
        <p className="deadline">Applications close November 30</p>
        <h2 id="contact-title">Apply Here</h2>
        <ApplyLink className="apply-button">
          Apply to MakeSB <span aria-hidden="true">↗</span>
        </ApplyLink>
        <a className="sponsor-link" href={sponsorUrl}>
          Sponsor MakeSB <span aria-hidden="true">→</span>
        </a>
        <p className="apply-contact">
          Questions? Email <a href="mailto:team@makesb.org">team@makesb.org</a>
        </p>
      </div>
    </section>
  );
}
