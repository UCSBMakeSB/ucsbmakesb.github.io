"use client";

import { useEffect, useRef, useState } from "react";

const LEADING_TEXT = "Meet the students making ";
const HIGHLIGHT_TEXT = "MakeSB happen!";
const FULL_TEXT = `${LEADING_TEXT}${HIGHLIGHT_TEXT}`;
const TYPING_DELAY_MS = 80;

export function TeamSubtitle() {
  const subtitleRef = useRef(null);
  const [visibleCount, setVisibleCount] = useState(0);
  const [cursorVisible, setCursorVisible] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduceMotion) {
      setVisibleCount(FULL_TEXT.length);
      return undefined;
    }

    const subtitle = subtitleRef.current;

    if (!subtitle) {
      return undefined;
    }

    let hasStarted = false;
    let typingTimer = null;

    function startTyping() {
      if (hasStarted) {
        return;
      }

      hasStarted = true;
      setCursorVisible(true);

      let nextCount = 0;
      typingTimer = window.setInterval(() => {
        nextCount += 1;
        setVisibleCount(nextCount);

        if (nextCount >= FULL_TEXT.length) {
          window.clearInterval(typingTimer);
          typingTimer = null;
        }
      }, TYPING_DELAY_MS);
    }

    let observer = null;

    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            startTyping();
            observer.disconnect();
          }
        },
        { threshold: 0.35 },
      );
      observer.observe(subtitle);
    } else {
      startTyping();
    }

    return () => {
      observer?.disconnect();

      if (typingTimer !== null) {
        window.clearInterval(typingTimer);
      }
    };
  }, []);

  const leadingText = LEADING_TEXT.slice(
    0,
    Math.min(visibleCount, LEADING_TEXT.length),
  );
  const highlightedText = HIGHLIGHT_TEXT.slice(
    0,
    Math.max(0, visibleCount - LEADING_TEXT.length),
  );
  const isComplete = visibleCount >= FULL_TEXT.length;

  return (
    <p ref={subtitleRef} className="team-description">
      <span className="visually-hidden">{FULL_TEXT}</span>
      <span className="team-description-reserve" aria-hidden="true">
        {LEADING_TEXT}
        <span className="team-description-highlight">{HIGHLIGHT_TEXT}</span>
      </span>
      <span className="team-description-animated" aria-hidden="true">
        {leadingText}
        {highlightedText && (
          <span
            className={`team-description-highlight${isComplete ? " is-complete" : ""}`}
          >
            {highlightedText}
          </span>
        )}
        {cursorVisible && (
          <span
            className={`team-description-cursor${isComplete ? " is-finishing" : ""}`}
            onAnimationEnd={(event) => {
              if (event.animationName === "team-description-cursor-fade") {
                setCursorVisible(false);
              }
            }}
          />
        )}
      </span>
    </p>
  );
}
