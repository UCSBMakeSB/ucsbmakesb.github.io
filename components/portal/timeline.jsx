"use client";

import { useEffect, useState } from "react";

// Make WEEK and hackathon weekend events in chronological order.
const milestones = [
  {
    date: "2027-01-11T08:00:00Z",
    label: "MON · JAN 11",
    title: "Idea jam & team matching",
    tone: "is-yellow",
  },
  {
    date: "2027-01-12T08:00:00Z",
    label: "TUE · JAN 12",
    title: "Fabrication basics",
    tone: "is-coral",
  },
  {
    date: "2027-01-13T08:00:00Z",
    label: "WED · JAN 13",
    title: "PCB design in KiCad",
    tone: "is-purple",
  },
  {
    date: "2027-01-14T08:00:00Z",
    label: "THU · JAN 14",
    title: "Sensors, motors & power",
    tone: "is-yellow",
  },
  {
    date: "2027-01-16T02:00:00Z",
    label: "FRI · JAN 15",
    title: "Team matching",
    time: "6:00–7:30 PM",
    tone: "is-blue",
  },
  {
    date: "2027-01-16T16:00:00Z",
    label: "01 · SAT · 8:00 AM",
    title: "Check-In",
    tone: "is-coral",
  },
  {
    date: "2027-01-16T17:00:00Z",
    label: "02 · SAT · 9:00 AM",
    title: "Opening Ceremony",
    tone: "is-yellow",
  },
  {
    date: "2027-01-16T18:00:00Z",
    label: "03 · SAT · 10:00 AM",
    title: "Hacking Begins!",
    tone: "is-purple",
  },
  {
    date: "2027-01-16T18:15:00Z",
    label: "04 · SAT · 10:15 AM",
    title: "Guided Hacker Team Matching",
    tone: "is-coral",
  },
  {
    date: "2027-01-18T01:00:00Z",
    label: "05 · SUN · 5:00 PM",
    title: "Hacking Ends",
    tone: "is-blue",
  },
  {
    date: "2027-01-18T01:15:00Z",
    label: "06 · SUN · 5:15 PM",
    title: "Judging Begins",
    tone: "is-yellow",
  },
  {
    date: "2027-01-18T03:00:00Z",
    label: "07 · SUN · 7:00 PM",
    title: "Judging Ends",
    tone: "is-coral",
  },
  {
    date: "2027-01-18T04:00:00Z",
    label: "08 · SUN · 8:00 PM",
    title: "Finalist Judging",
    tone: "is-blue",
  },
  {
    date: "2027-01-18T04:45:00Z",
    label: "09 · SUN · 8:45 PM",
    title: "Finalist Judging Ends",
    tone: "is-yellow",
  },
  {
    date: "2027-01-18T05:00:00Z",
    label: "10 · SUN · 9:00 PM",
    title: "Closing Ceremony",
    tone: "is-purple",
  },
  {
    date: "2027-01-18T06:00:00Z",
    label: "11 · SUN · 10:00 PM",
    title: "The End!",
    tone: "is-coral",
  },
];

const firstMilestone = new Date(milestones[0].date).getTime();
const lastMilestone = new Date(
  milestones[milestones.length - 1].date,
).getTime();

const trackStart = 7;
const trackEnd = 98;

function getMilestonePosition(index) {
  const progress = index / (milestones.length - 1);

  return trackStart + progress * (trackEnd - trackStart);
}

function getTodayPosition(date) {
  const timestamp = date.getTime();

  if (timestamp < firstMilestone) {
    return 1.5;
  }

  if (timestamp > lastMilestone) {
    return 99;
  }

  const nextIndex = milestones.findIndex(
    (milestone) => timestamp <= new Date(milestone.date).getTime(),
  );

  if (nextIndex === 0) {
    return getMilestonePosition(0);
  }

  const previousIndex = nextIndex - 1;
  const previousTime = new Date(
    milestones[previousIndex].date,
  ).getTime();
  const nextTime = new Date(milestones[nextIndex].date).getTime();
  const progressBetweenEvents =
    (timestamp - previousTime) / (nextTime - previousTime);
  const previousPosition = getMilestonePosition(previousIndex);
  const nextPosition = getMilestonePosition(nextIndex);

  return (
    previousPosition +
    progressBetweenEvents * (nextPosition - previousPosition)
  );
}

export function PortalTimeline() {
  const [today, setToday] = useState(null);

  useEffect(() => {
    const updateToday = () => setToday(new Date());

    updateToday();
    const interval = window.setInterval(updateToday, 60 * 1000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <section
      className="portal-timeline-section"
      aria-labelledby="timeline-heading"
    >
      <header className="portal-timeline-heading">
        <p>Milestone roadmap</p>
        <h2 id="timeline-heading">MakeSB Timeline</h2>
      </header>

      <div
        className="portal-timeline-scroll"
        tabIndex={0}
        aria-label="Scrollable MakeSB milestone timeline"
      >
        <div className="portal-timeline-canvas">
          <ol className="portal-timeline-track">
            {today && (
              <li
                className="portal-milestone portal-timeline-today is-above"
                style={{ left: `${getTodayPosition(today)}%` }}
                aria-current="date"
              >
                <span className="portal-milestone-content">
                  <strong>You are here!</strong>
                </span>
              </li>
            )}

            {milestones.map((milestone, index) => (
              <li
                className={`portal-milestone ${
                  index % 2 === 0 ? "is-above" : "is-below"
                } ${milestone.tone}`}
                style={{
                  left: `${getMilestonePosition(index)}%`,
                }}
                key={milestone.date}
              >
                <span className="portal-milestone-content">
                  <span className="portal-milestone-date">
                    {milestone.label}
                  </span>

                  <strong>{milestone.title}</strong>

                  {milestone.time && <small>{milestone.time}</small>}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
