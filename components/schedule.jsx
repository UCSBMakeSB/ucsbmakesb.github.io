const eventPieces = [
  "M0 0 Q30 5 55 0 C60 0 49 16 66 16 C83 16 72 0 77 0 Q102 5 132 0 L132 52 C132 58 146 48 146 66 C146 84 132 74 132 80 L132 132 Q102 127 77 132 C72 132 83 116 66 116 C49 116 60 132 55 132 Q30 127 0 132 L0 80 C0 74 -14 84 -14 66 C-14 48 0 58 0 52 Z",
  "M0 0 Q30 5 55 0 C60 0 49 -16 66 -16 C83 -16 72 0 77 0 Q102 5 132 0 L132 52 C132 58 118 48 118 66 C118 84 132 74 132 80 L132 132 Q102 127 77 132 C72 132 83 148 66 148 C49 148 60 132 55 132 Q30 127 0 132 L0 80 C0 74 14 84 14 66 C14 48 0 58 0 52 Z",
];

const schedule = [
  ["01", "Sat · 8:00 AM", "Check-In", "kickoff"],
  ["02", "Sat · 9:00 AM", "Opening Ceremony", "kickoff"],
  ["03", "Sat · 10:00 AM", "Hacking Begins!", "build"],
  ["04", "Sat · 10:15 AM", "Guided Hacker Team Matching", "build"],
  ["05", "Sat · 12:00 PM", "Lunch", "build"],
  ["06", "Sat · 7:00 PM", "Dinner", "build"],
  ["07", "Sun · 8:00 AM", "Breakfast", "build"],
  ["08", "Sun · 12:00 PM", "Lunch", "build"],
  ["09", "Sun · 5:00 PM", "Hacking Ends", "build"],
  ["10", "Sun · 5:15 PM", "Judging Begins", "judge"],
  ["11", "Sun · 7:00 PM", "Judging Ends", "judge"],
  ["12", "Sun · 7:00 PM", "Dinner", "judge"],
  ["13", "Sun · 8:00 PM", "Finalist Judging", "judge"],
  ["14", "Sun · 8:45 PM", "Finalist Judging Ends", "judge"],
  ["15", "Sun · 9:00 PM", "Closing Ceremony", "wrap"],
  ["16", "Sun · 10:00 PM", "The End!", "wrap"],
];

export function Schedule() {
  return (
    <section
      id="schedule"
      className="page-section"
      aria-labelledby="schedule-title"
    >
      <div>
        <div className="page-section-inner">
          <h2 id="schedule-title">Schedule</h2>
          <ul className="schedule-legend">
            <li>
              <span className="swatch swatch-kickoff" aria-hidden="true" />
              Kickoff
            </li>
            <li>
              <span className="swatch swatch-build" aria-hidden="true" />
              Build
            </li>
            <li>
              <span className="swatch swatch-judge" aria-hidden="true" />
              Judging
            </li>
            <li>
              <span className="swatch swatch-wrap" aria-hidden="true" />
              Wrap-up
            </li>
          </ul>
        </div>
        <div className="puzzle-shell">
          <ol className="puzzle-strip" tabIndex={0} aria-labelledby="schedule-title">
            {schedule.map(([number, time, title, phase], index) => (
              <li key={number} className={`puzzle-piece phase-${phase}`}>
                <svg
                  className="piece-face"
                  viewBox="0 0 132 132"
                  aria-hidden="true"
                >
                  <path fill="currentColor" d={eventPieces[index % 2]} />
                </svg>
                <div className="piece-content">
                  <p className="piece-time">{time}</p>
                  <h3 className="piece-title">{title}</h3>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="page-section-inner">
          <p className="puzzle-hint">
            <span aria-hidden="true">→</span>
            Scroll sideways to see more events
          </p>
        </div>
      </div>
    </section>
  );
}
