"use client";

import { useEffect, useRef, useState } from "react";

const HIGHLIGHT_TEXT = "MakeSB happen!";
const RESERVED_LEADING_TEXT =
  "Meet the marketing, outreach, and graphics team making ";
const TYPING_DELAY_MS = 45;

export function TeamSubtitle({ leadingText }) {
  const subtitleRef = useRef(null);
  const [hasEnteredViewport, setHasEnteredViewport] = useState(false);
  const [typingState, setTypingState] = useState({ text: "", count: 0 });
  const [cursorVisible, setCursorVisible] = useState(false);
  const fullText = `${leadingText}${HIGHLIGHT_TEXT}`;

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduceMotion) {
      setHasEnteredViewport(true);
      return undefined;
    }

    const subtitle = subtitleRef.current;

    if (!subtitle) {
      return undefined;
    }

    const teamSection = subtitle.closest("#team") ?? subtitle;
    let observer = null;

    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setHasEnteredViewport(true);
            observer.disconnect();
          }
        },
        { threshold: 0.1 },
      );
      observer.observe(teamSection);
    } else {
      setHasEnteredViewport(true);
    }

    return () => observer?.disconnect();
  }, []);

  useEffect(() => {
    if (!hasEnteredViewport) {
      return undefined;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduceMotion) {
      setTypingState({ text: fullText, count: fullText.length });
      setCursorVisible(false);
      return undefined;
    }

    let nextCount = 0;
    setTypingState({ text: fullText, count: 0 });
    setCursorVisible(true);

    const typingTimer = window.setInterval(() => {
      nextCount += 1;
      setTypingState({ text: fullText, count: nextCount });

      if (nextCount >= fullText.length) {
        window.clearInterval(typingTimer);
      }
    }, TYPING_DELAY_MS);

    return () => window.clearInterval(typingTimer);
  }, [fullText, hasEnteredViewport]);

  const visibleCount =
    typingState.text === fullText ? typingState.count : 0;
  const showCursor = typingState.text === fullText && cursorVisible;

  const visibleLeadingText = leadingText.slice(
    0,
    Math.min(visibleCount, leadingText.length),
  );
  const highlightedText = HIGHLIGHT_TEXT.slice(
    0,
    Math.max(0, visibleCount - leadingText.length),
  );
  const isComplete = visibleCount >= fullText.length;

  return (
    <p ref={subtitleRef} className="team-description">
      <span className="visually-hidden">{fullText}</span>
      <span className="team-description-reserve" aria-hidden="true">
        {RESERVED_LEADING_TEXT}
        <span className="team-description-highlight">{HIGHLIGHT_TEXT}</span>
      </span>
      <span className="team-description-reduced" aria-hidden="true">
        {leadingText}
        <span className="team-description-highlight">{HIGHLIGHT_TEXT}</span>
      </span>
      <span className="team-description-animated" aria-hidden="true">
        {visibleLeadingText}
        {highlightedText && (
          <span
            className={`team-description-highlight${isComplete ? " is-complete" : ""}`}
          >
            {highlightedText}
          </span>
        )}
        {showCursor && (
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
