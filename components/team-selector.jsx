"use client";

import { useState } from "react";
import Image from "next/image";

const teams = [
  {
    id: "presidents",
    name: "Presidents",
    icon: "♡",
    members: [
      ["/assets/team/Julia.jpeg", "Julia Smith"],
      ["/assets/team/patrick.jpg", "Patrick Liu"],
    ],
  },
  {
    id: "design-develop",
    name: "Design & Develop",
    icon: "✦",
    members: [
      ["/assets/team/Youjia.jpg", "Youjia He"],
      ["/assets/team/celine.jpg", "Celine Zhao"],
      ["/assets/team/Rocco Eyerman.JPG", "Rocco Eyerman"],
      ["/assets/team/amanda.jpg", "Amanda Tian"],
      ["/assets/team/Gautam.jpeg", "Gautam Khajuria"]
    ],
  },
  {
    id: "marketing-outreach-graphics",
    name: "Marketing · Outreach · Graphics",
    icon: "◎",
    members: [["/assets/team/aran.png", "Aran Chen"]],
  },
  {
    id: "sponsorships-finances",
    name: "Sponsorships · Finances",
    icon: "$",
    members: [["/assets/team/youthika.png", "Youthika Anbu"]],
  },
  {
    id: "makeops",
    name: "MakeOps",
    icon: "⚙",
    members: [
      ["/assets/team/Shaikh.png", "Mu'Aaz Shaikh"]
    ]
  }
];

export function TeamSelector() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentTeam = teams[currentIndex];

  function selectTeam(index) {
    setCurrentIndex((index + teams.length) % teams.length);
  }

  function handleKeyDown(event) {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      selectTeam(currentIndex - 1);
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      selectTeam(currentIndex + 1);
    }
  }

  return (
    <section
      className="team-arcade"
      aria-label="Choose a team and meet its members"
    >
      <div className="handheld-column">
        <div
          className="handheld gameboy"
          tabIndex="0"
          onKeyDown={handleKeyDown}
          aria-label="Team selector. Use the up and down arrow keys, the D-pad, or the screen menu to change teams."
        >
          {/* looks weird :( <span className="gameboy-glass-highlight" aria-hidden="true" /> */}
          <span className="gameboy-brand" aria-hidden="true">
            MAKE<span>SB</span> POCKET
          </span>
          <div className="gameboy-screen-bezel">
            <div
              className="handheld-screen"
              aria-live="polite"
              aria-atomic="true"
            >
              <div className="screen-toolbar">
                <span>Team Groups</span>
                <span className="screen-lights" aria-hidden="true">
                  <i />
                  <i />
                </span>
              </div>
              <ol className="screen-menu" aria-label="Team groups">
                {teams.map((team, index) => (
                  <li
                    key={team.id}
                    className={index === currentIndex ? "is-selected" : ""}
                    aria-current={index === currentIndex ? "true" : undefined}
                  >
                    <button
                      type="button"
                      aria-pressed={index === currentIndex}
                      onClick={() => selectTeam(index)}
                    >
                      <span aria-hidden="true">{team.icon}</span>
                      <strong>{team.name}</strong>
                    </button>
                  </li>
                ))}
              </ol>
              <span className="screen-count">
                {String(currentIndex + 1).padStart(2, "0")} /{" "}
                {String(teams.length).padStart(2, "0")}
              </span>
            </div>
          </div>
          <div className="d-pad" aria-label="Team controls">
            <button
              className="team-control team-control-up"
              type="button"
              aria-label="Previous team"
              onClick={() => selectTeam(currentIndex - 1)}
            >
              ▲
            </button>
            <span className="d-pad-arm d-pad-left" aria-hidden="true">
              ◀
            </span>
            <span className="d-pad-center" aria-hidden="true" />
            <span className="d-pad-arm d-pad-right" aria-hidden="true">
              ▶
            </span>
            <button
              className="team-control team-control-down"
              type="button"
              aria-label="Next team"
              onClick={() => selectTeam(currentIndex + 1)}
            >
              ▼
            </button>
          </div>
          <div className="action-buttons" aria-hidden="true">
            <span className="action-button action-button-b">
              <i>B</i>
            </span>
            <span className="action-button action-button-a">
              <i>A</i>
            </span>
          </div>
          <div className="system-buttons" aria-hidden="true">
            <span>
              <i />
              Select
            </span>
            <span>
              <i />
              Start
            </span>
          </div>
          <div className="speaker-vents" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <span className="gameboy-model" aria-hidden="true">
            TEAM SELECT · {String(currentIndex + 1).padStart(2, "0")}
          </span>
        </div>
        <p className="control-hint">
          <span aria-hidden="true">↑ / ↓</span> Select team
        </p>
      </div>
      <div className="team-display">
        <div className="team-display-heading">
          <div>
            <p>
              Current Group <span className="status-light" aria-hidden="true" />
            </p>
            <h3 className="current-team-title">{currentTeam.name}</h3>
          </div>
          <span className="current-team-icon" aria-hidden="true">
            {currentTeam.icon}
          </span>
        </div>
        <div className="member-stage" aria-live="polite" aria-atomic="false">
          <section
            id={currentTeam.id}
            className="department"
            aria-labelledby={`${currentTeam.id}-title`}
          >
            <h3 id={`${currentTeam.id}-title`} className="visually-hidden">
              {currentTeam.name}
            </h3>
            <ul className="member-grid">
              {currentTeam.members.map(([src, name]) => (
                <li key={name}>
                  <figure className="member-card">
                    <Image
                      className="member-card-image"
                      src={src}
                      width="250"
                      height="312"
                      alt={`Portrait of ${name}`}
                      loading="lazy"
                    />
                    <figcaption>{name}</figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </section>
  );
}
