"use client";

import { useEffect, useRef, useState } from "react";

export function ScrollClippedForm({ children }) {
  const formRef = useRef(null);
  const [clipTop, setClipTop] = useState(0);

  useEffect(() => {
    function updateClip() {
      const form = formRef.current;
      const header = document.querySelector(".site-header-fixed");

      if (!form || !header) {
        return;
      }

      const formBounds = form.getBoundingClientRect();
      const headerBottom = header.getBoundingClientRect().bottom;
      const overlap = Math.max(0, headerBottom - formBounds.top);
      const nextClipTop =
        overlap > 0 ? Math.min(formBounds.height, overlap + 64) : 0;

      setClipTop((currentClipTop) =>
        currentClipTop === nextClipTop ? currentClipTop : nextClipTop,
      );
    }

    updateClip();
    window.addEventListener("scroll", updateClip, { passive: true });
    window.addEventListener("resize", updateClip);

    return () => {
      window.removeEventListener("scroll", updateClip);
      window.removeEventListener("resize", updateClip);
    };
  }, []);

  return (
    <div
      ref={formRef}
      className="form-main"
      data-clipped={clipTop > 0 ? "true" : undefined}
      style={{ "--form-clip-top": `${clipTop}px` }}
    >
      {children}
    </div>
  );
}
