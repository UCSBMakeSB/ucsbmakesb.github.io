"use client";

// Searchable school picker for the apply form and the portal profile.
//
// Modeled on two real implementations (read, not recalled):
//  - W3C APG "Editable Combobox With List Autocomplete":
//    content/patterns/combobox/examples/js/combobox-autocomplete.js in
//    w3c/aria-practices. Roles/attributes, arrow/Enter/Escape/Tab behavior,
//    focus staying in the input with aria-activedescendant.
//  - Downshift useCombobox: src/hooks/useCombobox/{index,reducer}.ts in
//    downshift-js/downshift. aria-autocomplete="list", aria-controls on the
//    input, option mousedown preventDefault so the input keeps focus, Home/End
//    left to the text field, and commit-on-blur only for a highlighted option.
//
// Form value: a hidden input named `name` carries what gets stored (see
// lib/schools.js). The visible search input has no name, so it never submits.

import {
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  OTHER_LABEL,
  OTHER_PROMPT,
  SCHOOL_MAX_LENGTH,
  buildSchoolIndex,
  exactSchool,
  fold,
  isLegacyBucket,
  schoolDisplayName,
  searchSchools,
} from "../lib/schools";

const RESULT_LIMIT = 8;
const SCHOOLS_URL = "/schools.json";
const PICK_MESSAGE = `Choose your school from the list, or choose "${OTHER_LABEL}".`;
const OTHER_MESSAGE = "Enter the name of your school.";
// After a failed download of the list, wait this long before trying again, so
// typing while offline does not fire a request per keystroke.
const RETRY_AFTER_MS = 2000;

// One shared fetch per page load, started the first time a picker is used.
let indexPromise = null;
function loadSchoolIndex() {
  indexPromise ??= fetch(SCHOOLS_URL)
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(buildSchoolIndex)
    .catch((error) => {
      indexPromise = null; // allow a retry on the next focus
      throw error;
    });
  return indexPromise;
}

export function SchoolCombobox({
  id,
  name = id,
  label,
  required = false,
  requirementText,
  defaultValue = "",
  portal = false,
}) {
  const uid = useId();
  const inputId = id;
  const otherId = `${id}-other`;
  const listId = `${uid}-list`;
  const labelId = `${uid}-label`;
  const hintId = `${uid}-hint`;
  const optionId = (index) => `${uid}-option-${index}`;

  const [index, setIndex] = useState(null); // null until the list has loaded
  const [loadError, setLoadError] = useState(false);
  // A row saved with one of the old buckets ("other-cc", "out-of-state", ...)
  // has no school name, so it reopens on "Other" with "What school?" empty.
  const startsOther = isLegacyBucket(defaultValue);
  const [query, setQuery] = useState(
    startsOther ? OTHER_LABEL : schoolDisplayName(defaultValue),
  );
  // The committed list choice: { value, name }, or null while the applicant is
  // typing or has chosen "Other".
  const [chosen, setChosen] = useState(
    defaultValue && !startsOther
      ? { value: defaultValue, name: schoolDisplayName(defaultValue) }
      : null,
  );
  const [other, setOther] = useState(startsOther); // "Other" chosen
  const [otherText, setOtherText] = useState(""); // answer to "What school?"
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const inputRef = useRef(null);
  const otherRef = useRef(null);
  const listRef = useRef(null);
  const loadingRef = useRef(false);
  const failedAtRef = useRef(0);

  // The search runs over about 10,000 rows. Deferring it keeps each keystroke
  // on screen immediately: React shows the typed letter first and works out
  // the matching schools right after, dropping a search that a newer
  // keystroke has already replaced. This is the use React documents for
  // useDeferredValue (react.dev reference, "Deferring re-rendering for a part
  // of the UI"); it is not ported from a particular project's combobox (APG
  // and Downshift, credited above, both filter synchronously).
  const deferredQuery = useDeferredValue(query);
  const searching = deferredQuery !== query;
  const results = useMemo(
    () => (index ? searchSchools(index, deferredQuery, RESULT_LIMIT) : []),
    [index, deferredQuery],
  );
  // Results, then the always-present "Other" row.
  const rows = [
    ...results.map((entry) => ({ kind: "school", entry })),
    { kind: "other" },
  ];

  // Called on focus, click and typing. A failed download is retried the next
  // time (it used to stay failed until the page was reloaded).
  function ensureLoaded() {
    if (index || loadingRef.current) return;
    if (Date.now() - failedAtRef.current < RETRY_AFTER_MS) return;
    loadingRef.current = true;
    setLoadError(false);
    loadSchoolIndex()
      .then(setIndex, () => {
        failedAtRef.current = Date.now();
        setLoadError(true);
      })
      .finally(() => {
        loadingRef.current = false;
      });
  }

  // The visible input is `required`; it is invalid until a choice is committed.
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.setCustomValidity(
      required && !chosen && !other ? PICK_MESSAGE : "",
    );
  }, [chosen, required, other]);

  // "What school?" must hold a name, not just spaces (the server trims it and
  // would answer "required" after the browser had let it through).
  useEffect(() => {
    const input = otherRef.current;
    if (!input) return;
    input.setCustomValidity(
      other && otherText && !otherText.trim() ? OTHER_MESSAGE : "",
    );
  }, [other, otherText]);

  // Keep the highlighted option scrolled into view inside the list.
  useEffect(() => {
    if (!open || active < 0) return;
    const option = document.getElementById(optionId(active));
    const list = listRef.current;
    if (!option || !list) return;
    if (option.offsetTop < list.scrollTop) {
      list.scrollTop = option.offsetTop;
    } else if (
      option.offsetTop + option.offsetHeight >
      list.scrollTop + list.clientHeight
    ) {
      list.scrollTop =
        option.offsetTop + option.offsetHeight - list.clientHeight;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, open]);

  function choose(entry) {
    setChosen({ value: entry.value, name: entry.name });
    setOther(false);
    setQuery(entry.name);
    setOpen(false);
    setActive(-1);
  }

  function chooseOther() {
    setChosen(null);
    setOther(true);
    setQuery(OTHER_LABEL);
    setOpen(false);
    setActive(-1);
    // Focus "What school?" once it mounts.
    requestAnimationFrame(() => otherRef.current?.focus());
  }

  function activate(row) {
    if (row.kind === "school") choose(row.entry);
    else chooseOther();
  }

  function onChange(event) {
    ensureLoaded();
    setQuery(event.target.value);
    setChosen(null);
    setOther(false);
    setOpen(true);
    setActive(-1);
  }

  function onKeyDown(event) {
    if (event.ctrlKey || event.metaKey || event.shiftKey) return;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        ensureLoaded();
        if (!open) {
          setOpen(true);
          if (!event.altKey) setActive(0);
        } else if (!event.altKey) {
          setActive((current) => (current + 1) % rows.length);
        }
        break;
      case "ArrowUp":
        event.preventDefault();
        ensureLoaded();
        if (!open) {
          setOpen(true);
          if (!event.altKey) setActive(rows.length - 1);
        } else if (!event.altKey) {
          setActive((current) =>
            current <= 0 ? rows.length - 1 : current - 1,
          );
        }
        break;
      case "Enter":
        // Never submit the form while the list is open.
        if (open) {
          event.preventDefault();
          if (active >= 0) activate(rows[active]);
          else {
            const exact = index ? exactSchool(index, query) : null;
            if (exact) choose(exact);
            else setOpen(false);
          }
        }
        break;
      case "Escape":
        if (open) {
          event.preventDefault();
          setOpen(false);
          setActive(-1);
        } else if (query) {
          event.preventDefault();
          setQuery("");
          setChosen(null);
          setOther(false);
        }
        break;
      case "Tab":
        // Like APG: Tab accepts the highlighted school, then moves on.
        if (open && active >= 0 && rows[active].kind === "school") {
          choose(rows[active].entry);
        }
        setOpen(false);
        break;
      default:
        break;
    }
  }

  function onBlur() {
    setOpen(false);
    setActive(-1);
    // Typed a full name or a unique acronym ("ucsb") without picking it.
    const exact = !chosen && !other && index ? exactSchool(index, query) : null;
    if (exact) choose(exact);
  }

  const fieldClass = portal ? "portal-field" : "application-form-field";
  const inputClass = portal
    ? "portal-field-input school-combobox-input"
    : "application-form-input school-combobox-input";
  const hasQuery = fold(query).length > 0;
  const listVisible = open;
  // A name typed under "Other" that is exactly a listed school (or its unique
  // acronym, "UCSB") is stored the way picking it from the list would be, so
  // the same school is not saved under two spellings.
  const otherMatch = useMemo(
    () => (other && index ? exactSchool(index, otherText) : null),
    [other, index, otherText],
  );
  // An account saved with an old catch-all ("other-cc") reopens on "Other"
  // with "What school?" empty. Until a name is typed it keeps what it has, so
  // the rest of the profile can be saved without being made to name a school.
  const keepsLegacy = startsOther && other && !otherText.trim();
  // What gets submitted: the typed name for "Other", else the list choice.
  let submitted = chosen?.value ?? "";
  if (other) {
    submitted = keepsLegacy
      ? defaultValue
      : (otherMatch?.value ?? otherText.trim());
  }

  let status = "";
  if (listVisible) {
    if (loadError)
      status = `The school list could not be loaded. Choose "${OTHER_LABEL}" to type your school.`;
    else if (!index) status = "Loading schools";
    else if (!hasQuery) status = "Type to search for your school.";
    // While the deferred search catches up, the rows are for the previous
    // query: say nothing rather than announce a count that is about to change.
    else if (searching) status = "";
    else if (results.length === 0) status = "No matching schools.";
    else
      status = `${results.length} ${results.length === 1 ? "school" : "schools"} found.`;
  }

  // Visible hint above the options (screen readers get `status` instead).
  const note =
    loadError || !index || !hasQuery || (!searching && results.length === 0)
      ? status
      : "";

  return (
    <div
      className={`${fieldClass} school-combobox`}
      data-portal={portal ? "true" : undefined}
    >
      <label id={labelId} htmlFor={inputId}>
        <span>{label}</span>
      </label>
      {requirementText && (
        <small id={hintId} className="application-field-requirement">
          {requirementText}
        </small>
      )}

      <div className="school-combobox-control">
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={listVisible}
            aria-controls={listId}
            aria-activedescendant={
              listVisible && active >= 0 ? optionId(active) : undefined
            }
            aria-describedby={requirementText ? hintId : undefined}
            aria-labelledby={labelId}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="words"
            spellCheck={false}
            required={required}
            maxLength={SCHOOL_MAX_LENGTH}
            placeholder="Start typing your school"
            value={query}
            className={inputClass}
            onChange={onChange}
            onKeyDown={onKeyDown}
            onFocus={ensureLoaded}
            onClick={() => {
              ensureLoaded();
              setOpen(true);
            }}
            onBlur={onBlur}
          />
          <input type="hidden" name={name} value={submitted} />
          <div
            ref={listRef}
            className="school-combobox-popup"
            hidden={!listVisible}
          >
            {note && (
              <p className="school-combobox-note" aria-hidden="true">
                {note}
              </p>
            )}
            <ul
              id={listId}
              role="listbox"
              aria-labelledby={labelId}
              className="school-combobox-list"
            >
              {rows.map((row, position) => {
                const isActive = position === active;
                return (
                  <li
                    key={
                      row.kind === "school"
                        ? `${row.entry.name}|${row.entry.country}`
                        : "other"
                    }
                    id={optionId(position)}
                    role="option"
                    aria-selected={isActive}
                    data-active={isActive ? "true" : undefined}
                    data-kind={row.kind}
                    className="school-combobox-option"
                    // Keep focus in the input while clicking an option.
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseMove={() => setActive(position)}
                    onClick={() => activate(row)}
                  >
                    {row.kind === "school" ? (
                      <>
                        <span className="school-combobox-name">
                          {row.entry.name}
                        </span>
                        {row.entry.country && (
                          <span className="school-combobox-country">
                            {row.entry.country}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="school-combobox-name">{OTHER_LABEL}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

      {other && (
        <div className="school-combobox-other">
          <label htmlFor={otherId}>
            <span>{OTHER_PROMPT}</span>
          </label>
          <input
            ref={otherRef}
            id={otherId}
            type="text"
            value={otherText}
            onChange={(event) => setOtherText(event.target.value)}
            maxLength={SCHOOL_MAX_LENGTH}
            autoComplete="organization"
            required={required && !startsOther}
            placeholder="Full name of your school"
            className={inputClass}
          />
        </div>
      )}

      <span className="school-combobox-sr" role="status" aria-live="polite">
        {status}
      </span>
    </div>
  );
}
