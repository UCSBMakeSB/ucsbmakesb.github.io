export function Dropdown({
  id,
  label,
  name = id,
  options,
  placeholder = "...",
  required = false,
  requirementText,
  ...props
}) {
  return (
    <label className="application-form-field" htmlFor={id}>
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
        className="application-form-input application-form-select"
        defaultValue=""
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
  );
}
