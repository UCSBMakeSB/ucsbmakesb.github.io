"use client";

import { useState } from "react";
import { countWords, MAX_QUESTION_WORDS } from "../lib/word-count";

// A long-answer question: the label, the max number of words right after it,
// and a live word counter under the box. The server enforces the same limit.
export function EssayField({
  id,
  name,
  label,
  ariaLabel,
  defaultValue,
  required,
  rows,
  portal,
  requirementText,
  maxWords = MAX_QUESTION_WORDS,
  recommendedWords,
}) {
  const [words, setWords] = useState(() => countWords(defaultValue ?? ""));
  const over = words > maxWords;
  const limit = maxWords.toLocaleString("en-US");

  return (
    <label
      className={portal ? "portal-field" : "application-form-field"}
      htmlFor={id}
    >
      <span>
        {label}{" "}
        {recommendedWords ? (
          <span className="essay-max-words">
            (recommended {recommendedWords.toLocaleString("en-US")} words)
          </span>
        ) : null}
      </span>
      <small className="application-field-requirement">{requirementText}</small>
      <textarea
        id={id}
        name={name}
        defaultValue={defaultValue}
        aria-label={ariaLabel}
        aria-describedby={`${id}-count`}
        aria-invalid={over || undefined}
        required={required}
        rows={rows ?? 8}
        onChange={(event) => setWords(countWords(event.target.value))}
        className={
          portal
            ? "portal-field-input portal-field-textarea"
            : "application-form-input application-form-textarea"
        }
      />
      <small
        id={`${id}-count`}
        className={`essay-word-count${over ? " is-over" : ""}`}
        aria-live="polite"
      >
        {words.toLocaleString("en-US")} / {limit} max words
        {over ? " (too long: shorten it before saving)" : ""}
      </small>
    </label>
  );
}
