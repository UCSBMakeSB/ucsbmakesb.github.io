import { Dropdown } from "./dropdown";
import { FileUploadField } from "./file-upload-field";

export const majors = [
  { value: "electrical-engineering", label: "Electrical Engineering" },
  { value: "computer-engineering", label: "Computer Engineering" },
  { value: "computer-science", label: "Computer Science" },
  { value: "mechanical-engineering", label: "Mechanical Engineering" },
  { value: "aerospace-engineering", label: "Aerospace Engineering" },
  { value: "math", label: "Math" },
  { value: "math-cs", label: "Math-CS" },
  { value: "data-science", label: "Data Science" },
  { value: "undeclared", label: "Undeclared" },
  { value: "other", label: "Other" },
];

export const years = [
  { value: "freshman", label: "Freshman" },
  { value: "sophomore", label: "Sophomore" },
  { value: "junior", label: "Junior" },
  { value: "senior", label: "Senior" },
  { value: "5-plus-year", label: "5+ Year" },
  { value: "transfer-1st-year", label: "1st Year Transfer" },
  { value: "transfer-2nd-year", label: "2nd Year Transfer" },
  { value: "transfer-3rd-year", label: "3rd Year Transfer" },
  { value: "graduate", label: "Graduate" },
];

export const ages = [
  { value: "under-18", label: "<18" },
  { value: "18", label: "18" },
  { value: "19", label: "19" },
  { value: "20", label: "20" },
  { value: "21", label: "21" },
  { value: "22", label: "22" },
  { value: "over-22", label: ">22" },
];

export const countries = [
  { value: "united-states", label: "United States of America" },
  { value: "afghanistan", label: "Afghanistan" },
  { value: "albania", label: "Albania" },
  { value: "algeria", label: "Algeria" },
  { value: "argentina", label: "Argentina" },
  { value: "armenia", label: "Armenia" },
  { value: "australia", label: "Australia" },
  { value: "austria", label: "Austria" },
  { value: "azerbaijan", label: "Azerbaijan" },
  { value: "bahrain", label: "Bahrain" },
  { value: "bangladesh", label: "Bangladesh" },
  { value: "belarus", label: "Belarus" },
  { value: "belgium", label: "Belgium" },
  { value: "bolivia", label: "Bolivia" },
  { value: "bosnia-and-herzegovina", label: "Bosnia and Herzegovina" },
  { value: "brazil", label: "Brazil" },
  { value: "bulgaria", label: "Bulgaria" },
  { value: "cambodia", label: "Cambodia" },
  { value: "cameroon", label: "Cameroon" },
  { value: "canada", label: "Canada" },
  { value: "chile", label: "Chile" },
  { value: "china", label: "China" },
  { value: "colombia", label: "Colombia" },
  { value: "costa-rica", label: "Costa Rica" },
  { value: "croatia", label: "Croatia" },
  { value: "cuba", label: "Cuba" },
  { value: "cyprus", label: "Cyprus" },
  { value: "czech-republic", label: "Czech Republic" },
  { value: "denmark", label: "Denmark" },
  { value: "dominican-republic", label: "Dominican Republic" },
  { value: "ecuador", label: "Ecuador" },
  { value: "egypt", label: "Egypt" },
  { value: "el-salvador", label: "El Salvador" },
  { value: "estonia", label: "Estonia" },
  { value: "ethiopia", label: "Ethiopia" },
  { value: "finland", label: "Finland" },
  { value: "france", label: "France" },
  { value: "georgia", label: "Georgia" },
  { value: "germany", label: "Germany" },
  { value: "ghana", label: "Ghana" },
  { value: "greece", label: "Greece" },
  { value: "guatemala", label: "Guatemala" },
  { value: "honduras", label: "Honduras" },
  { value: "hong-kong", label: "Hong Kong" },
  { value: "hungary", label: "Hungary" },
  { value: "iceland", label: "Iceland" },
  { value: "india", label: "India" },
  { value: "indonesia", label: "Indonesia" },
  { value: "iran", label: "Iran" },
  { value: "iraq", label: "Iraq" },
  { value: "ireland", label: "Ireland" },
  { value: "israel", label: "Israel" },
  { value: "italy", label: "Italy" },
  { value: "jamaica", label: "Jamaica" },
  { value: "japan", label: "Japan" },
  { value: "jordan", label: "Jordan" },
  { value: "kazakhstan", label: "Kazakhstan" },
  { value: "kenya", label: "Kenya" },
  { value: "kuwait", label: "Kuwait" },
  { value: "latvia", label: "Latvia" },
  { value: "lebanon", label: "Lebanon" },
  { value: "lithuania", label: "Lithuania" },
  { value: "luxembourg", label: "Luxembourg" },
  { value: "malaysia", label: "Malaysia" },
  { value: "mexico", label: "Mexico" },
  { value: "morocco", label: "Morocco" },
  { value: "nepal", label: "Nepal" },
  { value: "netherlands", label: "Netherlands" },
  { value: "new-zealand", label: "New Zealand" },
  { value: "nicaragua", label: "Nicaragua" },
  { value: "nigeria", label: "Nigeria" },
  { value: "north-korea", label: "North Korea" },
  { value: "norway", label: "Norway" },
  { value: "pakistan", label: "Pakistan" },
  { value: "panama", label: "Panama" },
  { value: "paraguay", label: "Paraguay" },
  { value: "peru", label: "Peru" },
  { value: "philippines", label: "Philippines" },
  { value: "poland", label: "Poland" },
  { value: "portugal", label: "Portugal" },
  { value: "puerto-rico", label: "Puerto Rico" },
  { value: "qatar", label: "Qatar" },
  { value: "romania", label: "Romania" },
  { value: "russia", label: "Russia" },
  { value: "saudi-arabia", label: "Saudi Arabia" },
  { value: "serbia", label: "Serbia" },
  { value: "singapore", label: "Singapore" },
  { value: "slovakia", label: "Slovakia" },
  { value: "slovenia", label: "Slovenia" },
  { value: "south-africa", label: "South Africa" },
  { value: "south-korea", label: "South Korea" },
  { value: "spain", label: "Spain" },
  { value: "sri-lanka", label: "Sri Lanka" },
  { value: "sweden", label: "Sweden" },
  { value: "switzerland", label: "Switzerland" },
  { value: "syria", label: "Syria" },
  { value: "taiwan", label: "Taiwan" },
  { value: "thailand", label: "Thailand" },
  { value: "turkey", label: "Turkey" },
  { value: "ukraine", label: "Ukraine" },
  { value: "united-arab-emirates", label: "United Arab Emirates" },
  { value: "united-kingdom", label: "United Kingdom" },
  { value: "uruguay", label: "Uruguay" },
  { value: "uzbekistan", label: "Uzbekistan" },
  { value: "venezuela", label: "Venezuela" },
  { value: "vietnam", label: "Vietnam" },
  { value: "yemen", label: "Yemen" },
  { value: "zimbabwe", label: "Zimbabwe" },
  { value: "other", label: "Other" },
];

export const formFields = [
  {
    type: "input",
    id: "preferred-first-name",
    name: "preferredFirstName",
    label: "Preferred first name",
    inputType: "text",
    autoComplete: "given-name",
    requirement: "required",
  },
  {
    type: "input",
    id: "last-name",
    name: "lastName",
    label: "Last name",
    inputType: "text",
    requirement: "required",
    autoComplete: "family-name",
  },
  {
    type: "input",
    id: "email",
    name: "email",
    label: "Email",
    inputType: "email",
    autoComplete: "email",
    requirement: "required",
  },
  {
    type: "input",
    id: "mobile-number",
    name: "mobileNumber",
    label: "Mobile number",
    inputType: "tel",
    autoComplete: "tel",
    requirement: "required",
  },
  {
    type: "input",
    id: "emergency-contact-name",
    name: "emergencyContactName",
    label: "Emergency contact name",
    inputType: "text",
    requirement: "required",
  },
  {
    type: "input",
    id: "emergency-contact-mobile-number",
    name: "emergencyContactMobileNumber",
    label: "Emergency contact mobile number",
    inputType: "tel",
    requirement: "required",
  },
  {
    type: "select",
    id: "major",
    name: "major",
    label: "College major",
    options: majors,
    requirement: "required",
  },
  {
    type: "select",
    id: "year",
    name: "year",
    label: "College year",
    options: years,
    requirement: "required",
  },
  {
    type: "select",
    id: "age",
    name: "age",
    label: "Age",
    options: ages,
    requirement: "required",
  },
  {
    type: "select",
    id: "country",
    name: "country",
    label: "Country of Residence",
    options: countries,
    requirement: "required",
  },
  {
    type: "select",
    id: "school",
    name: "school",
    label: "Institution",
    options: [
      {
        value: "ucsb",
        label: "University of California, Santa Barbara (UCSB)",
      },
    ],
    requirement: "required",
  },
  {
    type: "input",
    id: "food-allergies",
    name: "food-allergies",
    label: "Any Food Allergies or Restrictions?",
    inputType: "text",
    requirement: "optional",
  },
  {
    type: "checkbox",
    id: "waiver",
    name: "waiver",
    label:
      "Do you understand that, you are personally responsible for your own well being, including any injury, as well as that of any possessions you may bring?",
    requirement: "required",
  },
  {
    type: "radio",
    name: "experience",
    legend: "Have you ever been to a hackathon or makeathon before?",
    options: [
      { id: "yexperience", value: "yes", label: "Yes" },
      { id: "nexperience", value: "no", label: "No" },
    ],
    requirement: "required",
  },
  {
    type: "file",
    id: "resume",
    name: "resume",
    label: "Upload your resume! It will be shared with our sponsors!",
    ariaLabelledby: "resume-label",
    accept: ".pdf,.doc,.docx",
    helpText: "PDF, DOC, or DOCX",
    requirement: "recommended",
  },
].map((field) => ({
  ...field,
  section:
    field.type === "checkbox"
      ? "standalone"
      : field.type === "radio" || field.type === "file"
        ? "secondary"
        : "primary",
}));

export default function FieldRenderer({ field, portal = false }) {
  const requirement = field.requirement ?? "required";
  const required = requirement === "required";
  const requirementText =
    requirement === "required"
      ? "Required"
      : requirement === "optional"
        ? "Optional"
        : requirement === "recommended"
          ? "Highly Recommended!"
        : "This question is purely for fun, and won't impact your application!";

  function RequirementText() {
    return <small className="application-field-requirement">{requirementText}</small>;
  }

  switch (field.type) {
    case "input":
      return (
        <label
          className={portal ? "portal-field" : "application-form-field"}
          htmlFor={field.id}
        >
          <span>{field.label}</span>
          <RequirementText />
          <input
            id={field.id}
            name={field.name}
            type={field.inputType}
            autoComplete={field.autoComplete}
            defaultValue={field.defaultValue}
            aria-label={field.ariaLabel}
            required={required}
            className={portal ? "portal-field-input" : "application-form-input"}
          />
        </label>
      );
    case "essay":
      return (
        <label
          className={portal ? "portal-field" : "application-form-field"}
          htmlFor={field.id}
        >
          <span>{field.label}</span>
          <RequirementText />
          <textarea
            id={field.id}
            name={field.name}
            defaultValue={field.defaultValue}
            aria-label={field.ariaLabel}
            required={required}
            rows={field.rows ?? 8}
            className={
              portal
                ? "portal-field-input portal-field-textarea"
                : "application-form-input application-form-textarea"
            }
          />
        </label>
      );
    case "select":
      return (
        <Dropdown
          id={field.id}
          label={field.label}
          name={field.name}
          required={required}
          defaultValue={field.defaultValue}
          requirementText={requirementText}
          portal={portal}
          options={field.options}
        />
      );
    case "checkbox":
      return (
        <label
          className={
            portal
              ? "portal-field portal-checkbox"
              : "application-form-field application-checkbox"
          }
          htmlFor={field.id}
        >
          <input
            type="checkbox"
            id={field.id}
            name={field.name}
            required={required}
            defaultChecked={field.defaultValue}
            className={
              portal
                ? "portal-checkbox-input"
                : "application-checkbox-input"
            }
          />
          <span>
          {field.label}
          <RequirementText />
          </span>
        </label>
      );
    case "radio":
      return (
        <fieldset
          className={
            portal
              ? "portal-field portal-radio"
              : "application-form-field application-experience"
          }
        >
          <legend>{field.legend}</legend>
          <RequirementText />
          <div className="application-radio-options">
            {field.options.map((option) => (
              <label
                className={
                  portal
                    ? "portal-radio-option"
                    : "application-radio-option"
                }
                htmlFor={option.id}
                key={option.id}
              >
                <input
                  type="radio"
                  id={option.id}
                  name={field.name}
                  value={option.value}
                  required={required}
                  defaultChecked={field.defaultValue === option.value}
                  className={
                    portal
                      ? "portal-radio-input"
                      : "application-radio-input"
                  }
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      );
    case "file":
      return (
        <div
          className={
            portal
              ? "portal-field portal-file"
              : "application-form-field application-resume"
          }
        >
          <span id={field.labelId ?? `${field.id}-label`}>{field.label}</span>
          <RequirementText />
          <FileUploadField
            id={field.id}
            name={field.name}
            accept={field.accept}
            required={required}
            ariaLabelledby={field.ariaLabelledby}
            existingFileName={field.existingFileName}
          />
          {field.existingFileName && <small>Current file: {field.existingFileName}</small>}
          <small>{field.helpText}</small>
        </div>
      );
    default:
      throw new Error(`Unsupported application field type: ${field.type}`);
  }
}
