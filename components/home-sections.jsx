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
  "a weather balloon",
  "a small rocket",
  "a drifting go-kart",
  "a jet-propelled bike",
  "a surgical robot arm",
];

export function AboutSection() {
  return (
    <section
      id="about"
      className="page-section"
      aria-labelledby="about-title"
    >
      <div className="page-section-inner about-essay">
        <h2 id="about-title">What is MakeSB?</h2>
        <p className="about-lead">
          MakeSB is UCSB’s first hardware makeathon. For one weekend in January,
          students team up to design and build something real from scratch. It
          is free, and we supply the parts, tools, food and mentors. A pop-up
          Micro Center on site stocks components for when a part goes missing,
          and MakeWeek workshops the week before get you ready.
        </p>
        <p>
          We built MakeSB for students who have faced barriers to advanced STEM.
          That includes low-income and first-generation students, community
          college students, women in STEM, underrepresented groups, and anyone
          who has never had access to a makerspace. If that sounds like you,
          apply. You belong here.
        </p>
        <p>
          Coming from another school? We offer flights to Santa Barbara for
          low-income students and are working to fly out every participant.
          Makers from other schools can also get travel reimbursed and stay in
          UCSB dorms through our hosting program.
        </p>
      </div>
    </section>
  );
}

export function TracksSection() {
  return (
    <section
      id="tracks"
      className="page-section"
      aria-labelledby="tracks-title"
    >
      <div className="page-section-inner">
        <h2 id="tracks-title">Tracks and project ideas</h2>
        <ul className="track-tags">
          {tracks.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
        <p className="idea-line">
          Need a spark? Build {ideas.slice(0, -1).join(", ")}, or{" "}
          {ideas[ideas.length - 1]}.
        </p>
      </div>
    </section>
  );
}
