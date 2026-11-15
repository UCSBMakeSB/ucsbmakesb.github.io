"use client";

import { useEffect, useId, useRef, useState } from "react";

const questions = [
  [
    "When is MakeSB?",
    "January 15 to 17, 2027. It starts Friday evening and ends Sunday afternoon.",
  ],
  [
    "Where is it?",
    "On UCSB’s main campus.",
  ],
  [
    "Is there a cost to participate?",
    "Nothing! We provide sleeping accommodations, food, hardware, and other resources.",
  ],
  [
    "I don't have any experience. Can I still participate?",
    "Of course, and in fact we encourage it! MakeWeek workshops the week before cover CAD, electronics, and hardware prototyping, so come to any that interest you.",
  ],
  [
    "Can students from other schools attend?",
    "Yes! MakeSB welcomes builders from across the Central Coast and beyond, not just UCSB students.",
  ],
  [
    "Do you help with travel?",
    <>
      Yes. We offer flights to Santa Barbara for low-income students, and we
      are working to fly out all participants. Makers from other schools can
      get their travel reimbursed and stay with us through dorm hosting. Email{" "}
      <a href="mailto:team@makesb.org">team@makesb.org</a> and we will help you
      plan your trip.
    </>,
  ],
  [
    "Do I need a team?",
    "No! We'll help you find a team or pair you up with other builders looking for teammates.",
  ],
  [
    "What should I bring?",
    "Just yourself and a laptop! If you'd like extra comfort, bring a sleeping bag or pillow, plus any personal items you need for the weekend.",
  ],
];

export function FaqItem({ question, answer, inline = false }) {
  const [open, setOpen] = useState(false);
  const answerId = useId();

  return (
    <div
      className={`faq-item${open ? " is-open" : ""}${inline ? " is-inline" : ""}`}
    >
      <button
        className="faq-question"
        type="button"
        aria-expanded={open}
        aria-controls={answerId}
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        <span className="faq-question-arrow" aria-hidden="true">
          ▶
        </span>
        <span>{question}</span>
      </button>
      <div
        id={answerId}
        className="faq-answer"
        role="region"
        aria-hidden={!open}
        inert={!open}
      >
        <div
          className={`faq-answer-inner${inline ? " faq-answer-inner-tabbed" : ""}`}
        >
          <p>{answer}</p>
        </div>
      </div>
    </div>
  );
}

export function FaqSection() {
  const mascotRef = useRef(null);

  useEffect(() => {
    const mascot = mascotRef.current;
    if (!mascot) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => mascot.classList.toggle("is-visible", entry.isIntersecting),
      { threshold: 0.25 },
    );
    observer.observe(mascot);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="faqs" className="page-section" aria-labelledby="faqs-title">
      <div className="page-section-inner faq-layout">
        <div className="faq-intro">
          <h2 id="faqs-title">FAQs</h2>
          <div className="faq-mascot" ref={mascotRef}>
            <div className="faq-mascot-stage" aria-hidden="true">
              <svg
                className="faq-mascot-art"
                viewBox="0 0 622 710"
                focusable="false"
              >
                <defs>
                  <clipPath id="faq-smile-face">
                    <rect width="540" height="245" />
                  </clipPath>
                </defs>
                <g className="faq-wing-raised">
                  <g className="faq-fish">
                    <image
                      href="/assets/faq-fish.png"
                      x="405"
                      y="205"
                      width="210"
                      height="103.36"
                      transform="rotate(-20 500 255)"
                    />
                  </g>
                  <image
                    href="/assets/faq-wing-raised.png"
                    x="431"
                    y="245"
                    width="109"
                    height="170"
                  />
                </g>
                <image
                  className="faq-body"
                  href="/assets/faq-body.png"
                  width="513"
                  height="710"
                />
                <image
                  className="faq-smile"
                  href="/assets/faq-smile.png"
                  width="540"
                  height="710"
                  clipPath="url(#faq-smile-face)"
                />
                <g className="faq-wing-side">
                  <image
                    href="/assets/faq-wing-side.png"
                    x="80"
                    y="331"
                    width="284"
                    height="182"
                  />
                </g>
              </svg>
              <span className="faq-mascot-shadow" />
            </div>
          </div>
        </div>
        <div className="faq-questions">
          {questions.map(([question, answer]) => (
            <FaqItem key={question} question={question} answer={answer} />
          ))}
        </div>
      </div>
    </section>
  );
}
