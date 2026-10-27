// Pure validation for the /apply form. No framework or network code here, so it
// can be unit-tested with `node --test`.

export const MAX_RESUME_BYTES = 4 * 1024 * 1024; // Vercel caps request bodies at 4.5 MB.

const RESUME_TYPES = {
  pdf: ["application/pdf"],
  doc: ["application/msword"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// form field name -> [database column, max length, required]
const TEXT_FIELDS = {
  preferredFirstName: ["preferred_first_name", 100, true],
  lastName: ["last_name", 100, true],
  email: ["email", 254, true],
  mobileNumber: ["mobile_number", 40, true],
  emergencyContactName: ["emergency_contact_name", 150, true],
  emergencyContactMobileNumber: ["emergency_contact_mobile_number", 40, true],
  major: ["major", 100, true],
  year: ["year", 100, true],
  age: ["age", 100, true],
  country: ["country", 100, true],
  school: ["school", 200, true],
  "food-allergies": ["food_allergies", 500, false],
};

const RESUME_REQUIRED = false;

export function getResumeExtension(file) {
  const name = typeof file?.name === "string" ? file.name : "";
  const ext = name.includes(".") ? name.split(".").pop().toLowerCase() : "";
  return Object.hasOwn(RESUME_TYPES, ext) ? ext : null;
}

/**
 * @param {FormData} formData
 * @returns {{ ok: true, row: object, resume: File } | { ok: false, errors: Record<string, string> }}
 */
export function validateApplication(formData) {
  const errors = {};
  const row = {};

  for (const [field, [column, maxLength, required]] of Object.entries(TEXT_FIELDS)) {
    const value = formData.get(field);
    const text = typeof value === "string" ? value.trim() : "";

    if (!text) {
      if (required) {
        errors[field] = "This field is required.";
      } else {
        row[column] = null;
      }
    } else if (text.length > maxLength) {
      errors[field] = `Must be ${maxLength} characters or fewer.`;
    } else {
      row[column] = text;
    }
  }

  if (row.email) {
    row.email = row.email.toLowerCase();
    if (!EMAIL_PATTERN.test(row.email)) {
      errors.email = "Enter a valid email address.";
    }
  }

  if (formData.get("waiver") !== "on") {
    errors.waiver = "You must accept the waiver to apply.";
  } else {
    row.waiver_accepted = true;
  }

  const experience = formData.get("experience");
  if (experience !== "yes" && experience !== "no") {
    errors.experience = "Please choose yes or no.";
  } else {
    row.prior_hackathon_experience = experience === "yes";
  }

  const resume = formData.get("resume");
  const isFile = typeof resume === "object" && resume !== null && typeof resume.arrayBuffer === "function";
  const ext = isFile ? getResumeExtension(resume) : null;

  if (!isFile || resume.size === 0) {
    if (RESUME_REQUIRED) {
      errors.resume = "Please upload your resume.";
    }
  } else if (!ext) {
    errors.resume = "Resume must be a PDF, DOC, or DOCX file.";
  } else if (resume.size > MAX_RESUME_BYTES) {
    errors.resume = "Resume must be 4 MB or smaller.";
  } else if (resume.type && !RESUME_TYPES[ext].includes(resume.type)) {
    errors.resume = "That file's type doesn't match its extension.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, row, resume: isFile && resume.size > 0 ? resume : null };
}
