"use client";

import { useState } from "react";

export function Dropdown({
  id,
  label,
  name = id,
  options,
  placeholder = "...",
  required = false,
  requirementText,
  portal = false,
  other,
  defaultValue = "",
  ...props
}) {
  // `other` = { value, name, label, legacyLabels }: picking that option reveals a
  // required text box. A stored value that is not an option (a typed school, or an
  // old catch-all code) opens as "Other" with the readable text filled in.
  const known = options.some((option) => option.value === defaultValue);
  const typedDefault = other && defaultValue && !known;
  const [selected, setSelected] = useState(typedDefault ? other.value : defaultValue);
  const fieldClass = portal ? "portal-field" : "application-form-field";
  const inputClass = portal
    ? "portal-field-input portal-field-select"
    : "application-form-input application-form-select";

  return (
    <>
      <label className={fieldClass} htmlFor={id}>
        <span>{label}</span>
        {requirementText && (
          <small className="application-field-requirement">
            {requirementText}
          </small>
        )}
        <select
          id={id}
          name={name}
          required={required}
          className={inputClass}
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
          {...props}
        >
          <option value="">{placeholder}</option>
          {options.map(({ value, label: optionLabel }) => (
            <option key={value} value={value}>
              {optionLabel}
            </option>
          ))}
        </select>
      </label>
      {other && selected === other.value && (
        <label className={fieldClass} htmlFor={`${id}-other`}>
          <span>{other.label}</span>
          <small className="application-field-requirement">Required</small>
          <input
            id={`${id}-other`}
            name={other.name}
            type="text"
            required
            defaultValue={typedDefault ? (other.legacyLabels?.[defaultValue] ?? defaultValue) : ""}
            className={portal ? "portal-field-input" : "application-form-input"}
          />
        </label>
      )}
    </>
  );
}
