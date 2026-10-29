"use client";

import { useEffect, useState } from "react";

const competitionStart = new Date("2027-01-16T03:00:00Z");
const units = ["months", "weeks", "days", "hours", "minutes", "seconds"];

function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function getCountdown(now) {
  if (now >= competitionStart) {
    return Object.fromEntries(units.map((unit) => [unit, 0]));
  }

  const countdown = {};
  let cursor = new Date(now);
  countdown.months = 0;

  while (addMonths(cursor, 1) <= competitionStart) {
    cursor = addMonths(cursor, 1);
    countdown.months += 1;
  }

  let remaining = competitionStart - cursor;
  countdown.weeks = Math.floor(remaining / (7 * 24 * 60 * 60 * 1000));
  remaining %= 7 * 24 * 60 * 60 * 1000;
  countdown.days = Math.floor(remaining / (24 * 60 * 60 * 1000));
  remaining %= 24 * 60 * 60 * 1000;
  countdown.hours = Math.floor(remaining / (60 * 60 * 1000));
  remaining %= 60 * 60 * 1000;
  countdown.minutes = Math.floor(remaining / (60 * 1000));
  countdown.seconds = Math.floor((remaining % (60 * 1000)) / 1000);

  return countdown;
}

export function Dashboard() {
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    const updateCountdown = () => setCountdown(getCountdown(new Date()));
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main id="account-main" className="portal-main portal-dashboard">
      <section
        className="portal-countdown"
        aria-labelledby="countdown-heading"
      >
        <div className="portal-countdown-overlay">
          <p className="portal-eyebrow">MakeSB 2027</p>
          <h1 id="countdown-heading">Until we make together</h1>
          <p className="portal-countdown-date">
            January 15, 2027 · 7:00 PM Pacific
          </p>
          <div className="portal-countdown-grid" aria-live="polite">
            {units.map((unit) => (
              <div className="portal-countdown-unit" key={unit}>
                <strong>
                  {countdown ? String(countdown[unit]).padStart(2, "0") : "--"}
                </strong>
                <span>{unit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="portal-dashboard-message" aria-labelledby="message-heading">
        <h2 id="message-heading">Action Items</h2>
        <p>
          As more information is released, we&apos;ll share more details about the hackathon, your schedule, and
          everything you need to get ready right here. Keep checking back here!
          <br /><br />
          Until then, finish the rest of your application! While application due dates have not been completed, it's best to start early.
        </p>
      </section>
    </main>
  );
}
