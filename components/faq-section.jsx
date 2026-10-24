"use client";

import { useEffect, useId, useRef, useState } from "react";

const questions = [
  ["Is there a cost to participate in MakeSB?", "Nothing! We provide sleeping accommodations, food, hardware, and other resources. All you have to do is get to Santa Barbara!"],
  ["I don't have any experience. Can I still participate?", "Of course, and in fact we encourage it! We have structured Make Weeks around this! If any of the workshops interest you, attend!"],
  ["Can students from other schools attend?", "Yes! MakeSB welcomes builders from across the Central Coast, not just UCSB students."],
  ["Do I need a team?", "No! We'll help you find a team or pair you up with other builders looking for teammates — you don't need to show up with one already formed."],
  ["What should I bring?", "Just yourself and a laptop! We provide meals, sleeping accommodations, and hardware to build with. If you'd like extra comfort, feel free to bring a sleeping bag or pillow, plus any personal items you need for the weekend."],
  ["Do you provide travel reimbursements?", <>At the moment, no. However, we are working hard to try to get travel reimbursements. If attending MakeSB poses a financial burden, please contact <a href="mailto:patrick_liu@ucsb.edu">patrick_liu@ucsb.edu</a>.</>],
  ["I have a question or idea. Who do I contact?", <>We are always looking for feedback! Please reach us at <a href="mailto:team@makesb.org">team@makesb.org</a>.</>],
];

function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false);
  const answerId = useId();

  return (
    <div className={`faq-item${open ? " is-open" : ""}`}>
      <button
        className="faq-question"
        type="button"
        aria-expanded={open}
        aria-controls={answerId}
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        <span className="faq-question-arrow" aria-hidden="true">▶</span>
        <span>{question}</span>
      </button>
      <div
        id={answerId}
        className="faq-answer"
        role="region"
        aria-hidden={!open}
        inert={!open}
      >
        <div className="faq-answer-inner">
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
    const observer = new IntersectionObserver(([entry]) => mascot.classList.toggle("is-visible", entry.isIntersecting), { threshold: 0.25 });
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
              <svg className="faq-mascot-art" viewBox="0 0 622 710" focusable="false">
                <defs><clipPath id="faq-smile-face"><rect width="540" height="245" /></clipPath></defs>
                <g className="faq-wing-raised">
                  <g className="faq-fish"><image href="/assets/faq-fish.png" x="405" y="205" width="210" height="103.36" transform="rotate(-20 500 255)" /></g>
                  <image href="/assets/faq-wing-raised.png" x="431" y="245" width="109" height="170" />
                </g>
                <image className="faq-body" href="/assets/faq-body.png" width="513" height="710" />
                <image className="faq-smile" href="/assets/faq-smile.png" width="540" height="710" clipPath="url(#faq-smile-face)" />
                <g className="faq-wing-side"><image href="/assets/faq-wing-side.png" x="80" y="331" width="284" height="182" /></g>
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
