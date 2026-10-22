const puzzlePaths = {
  start:
    "M16,0 L184,0 A16,16 0 0 1 200,16 L200,73 A22,22 0 0 1 200,117 L200,174 A16,16 0 0 1 184,190 L16,190 A16,16 0 0 1 0,174 L0,16 A16,16 0 0 1 16,0 Z",
  end: "M16,0 L184,0 A16,16 0 0 1 200,16 L200,174 A16,16 0 0 1 184,190 L16,190 A16,16 0 0 1 0,174 L0,117 A22,22 0 0 0 0,73 L0,16 A16,16 0 0 1 16,0 Z",
  middle:
    "M16,0 L184,0 A16,16 0 0 1 200,16 L200,73 A22,22 0 0 1 200,117 L200,174 A16,16 0 0 1 184,190 L16,190 A16,16 0 0 1 0,174 L0,117 A22,22 0 0 0 0,73 L0,16 A16,16 0 0 1 16,0 Z",
};

const schedule = [
  ["01", "Sat · 8:00 AM", "Check-In", "kickoff"],
  ["02", "Sat · 9:00 AM", "Opening Ceremony", "kickoff"],
  ["03", "Sat · 10:00 AM", "Hacking Begins!", "build"],
  ["04", "Sat · 10:15 AM", "Guided Hacker Team Matching", "build"],
  ["05", "Sun · 5:00 PM", "Hacking Ends", "build"],
  ["06", "Sun · 5:15 PM", "Judging Begins", "judge"],
  ["07", "Sun · 7:00 PM", "Judging Ends", "judge"],
  ["08", "Sun · 8:00 PM", "Finalist Judging", "judge"],
  ["09", "Sun · 8:45 PM", "Finalist Judging Ends", "judge"],
  ["10", "Sun · 9:00 PM", "Closing Ceremony", "wrap"],
  ["11", "Sun · 10:00 PM", "The End!", "wrap"],
];

export function Schedule() {
  return (
    <section
      id="schedule"
      className="page-section"
      aria-labelledby="schedule-title"
    >
      <div className="puzzle-hint-group">
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
          <ol className="puzzle-strip">
            {schedule.map(([number, time, title, phase], index) => (
              <li
                key={number}
                className={`puzzle-piece phase-${phase} ${index === 0 ? "is-start" : ""} ${index === schedule.length - 1 ? "is-end" : ""}`}
              >
                <svg
                  className="piece-face"
                  viewBox={`0 0 ${index === schedule.length - 1 ? 200 : 222} 208`}
                  aria-hidden="true"
                >
                  <path
                    fill="currentColor"
                    d={
                      puzzlePaths[
                        index === 0
                          ? "start"
                          : index === schedule.length - 1
                            ? "end"
                            : "middle"
                      ]
                    }
                  />
                </svg>
                <div className="piece-content">
                  <p className="piece-num">{number}</p>
                  <p className="piece-time">{time}</p>
                  <h3 className="piece-title">{title}</h3>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="page-section-inner">
          <p className="puzzle-hint puzzle-hint-group-child">
            <span aria-hidden="true" className="phgc-arrow">
              →
            </span>{" "}
            Scroll to explore the weekend
          </p>
        </div>
      </div>
    </section>
  );
}
