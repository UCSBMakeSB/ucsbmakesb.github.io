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

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  SCHOOL_MAX_LENGTH,
  buildSchoolIndex,
  exactSchool,
  fold,
  schoolDisplayName,
  searchSchools,
} from "../lib/schools";

const RESULT_LIMIT = 8;
const SCHOOLS_URL = "/schools.json";
const NOT_LISTED = "My school isn't listed";
const PICK_MESSAGE = `Choose your school from the list, or choose "${NOT_LISTED}".`;

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
  const listId = `${uid}-list`;
  const labelId = `${uid}-label`;
  const hintId = `${uid}-hint`;
  const optionId = (index) => `${uid}-option-${index}`;

  const [index, setIndex] = useState(null); // null until the list has loaded
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState(schoolDisplayName(defaultValue));
  // The committed choice: { value, name } or null while the applicant is typing.
  const [chosen, setChosen] = useState(
    defaultValue
      ? { value: defaultValue, name: schoolDisplayName(defaultValue) }
      : null,
  );
  const [manual, setManual] = useState(false); // typing a name by hand
  const [manualText, setManualText] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const inputRef = useRef(null);
  const manualRef = useRef(null);
  const listRef = useRef(null);

  const results = useMemo(
    () => (index ? searchSchools(index, query, RESULT_LIMIT) : []),
    [index, query],
  );
  // Results, then the always-present "My school isn't listed" row.
  const rows = [
    ...results.map((entry) => ({ kind: "school", entry })),
    { kind: "manual" },
  ];

  function ensureLoaded() {
    if (index || loadError) return;
    loadSchoolIndex().then(setIndex, () => setLoadError(true));
  }

  // The visible input is `required`; it is invalid until a choice is committed.
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.setCustomValidity(required && !chosen ? PICK_MESSAGE : "");
  }, [chosen, required, manual]);

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
    setQuery(entry.name);
    setOpen(false);
    setActive(-1);
  }

  function startManual() {
    setManualText(chosen?.name ?? query.trim());
    setManual(true);
    setOpen(false);
    setActive(-1);
    // Focus after the manual input mounts.
    requestAnimationFrame(() => manualRef.current?.focus());
  }

  function backToSearch() {
    setManual(false);
    setQuery(manualText.trim());
    setChosen(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function activate(row) {
    if (row.kind === "school") choose(row.entry);
    else startManual();
  }

  function onChange(event) {
    ensureLoaded();
    setQuery(event.target.value);
    setChosen(null);
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
    const exact = !chosen && index ? exactSchool(index, query) : null;
    if (exact) choose(exact);
  }

  const fieldClass = portal ? "portal-field" : "application-form-field";
  const inputClass = portal
    ? "portal-field-input school-combobox-input"
    : "application-form-input school-combobox-input";
  const hasQuery = fold(query).length > 0;
  const listVisible = open && !manual;

  let status = "";
  if (listVisible) {
    if (loadError) status = "The school list could not be loaded.";
    else if (!index) status = "Loading schools";
    else if (!hasQuery) status = "Type to search for your school.";
    else if (results.length === 0) status = "No matching schools.";
    else
      status = `${results.length} ${results.length === 1 ? "school" : "schools"} found.`;
  }

  // Visible hint above the options (screen readers get `status` instead).
  const note =
    loadError || !index || !hasQuery || results.length === 0 ? status : "";

  return (
    <div
      className={`${fieldClass} school-combobox`}
      data-portal={portal ? "true" : undefined}
    >
      <label id={labelId} htmlFor={manual ? `${inputId}-manual` : inputId}>
        <span>{label}</span>
      </label>
      {requirementText && (
        <small id={hintId} className="application-field-requirement">
          {requirementText}
        </small>
      )}

      {manual ? (
        <div className="school-combobox-manual">
          <input
            ref={manualRef}
            id={`${inputId}-manual`}
            name={name}
            type="text"
            value={manualText}
            onChange={(event) => setManualText(event.target.value)}
            maxLength={SCHOOL_MAX_LENGTH}
            autoComplete="organization"
            required={required}
            aria-describedby={hintId}
            placeholder="Full name of your school"
            className={inputClass}
          />
          <button
            type="button"
            className="school-combobox-link"
            onClick={backToSearch}
          >
            Search the list instead
          </button>
        </div>
      ) : (
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
            aria-describedby={hintId}
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
          <input type="hidden" name={name} value={chosen?.value ?? ""} />
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
                        : "manual"
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
                      <>
                        <span className="school-combobox-name">
                          {NOT_LISTED}
                        </span>
                        <span className="school-combobox-country">
                          Type the name of your school yourself
                        </span>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      <span className="school-combobox-sr" role="status" aria-live="polite">
        {status}
      </span>
    </div>
  );
}
