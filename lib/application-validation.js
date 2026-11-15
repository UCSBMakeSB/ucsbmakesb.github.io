// Pure validation for the /apply form. No framework or network code here, so it
// can be unit-tested with `node --test`.

import { isLegacyBucket } from "./schools.js";

export const MAX_RESUME_BYTES = 4 * 1024 * 1024; // Vercel caps request bodies at 4.5 MB.

const RESUME_TYPES = {
  pdf: ["application/pdf"],
  doc: ["application/msword"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Keep in sync with SHORT_ANSWER_MAX_LENGTH in components/field-renderer.jsx.
export const SHORT_ANSWER_MAX_LENGTH = 2000;

export const SCHOOL_BUCKET_MESSAGE = "Enter the name of your school.";

// The initial application asks only for what is needed to decide admission.
// form field name -> [database column, max length, required]
const TEXT_FIELDS = {
  preferredFirstName: ["preferred_first_name", 100, true],
  // Optional: some applicants go by a single name.
  lastName: ["last_name", 100, false],
  email: ["email", 254, true],
  // ASK AFTER ADMISSION: restore in the post-admission portal.
  // (Collected, optionally, in the portal profile: app/api/profile/route.js.)
  // mobileNumber: ["mobile_number", 40, true],
  // emergencyContactName: ["emergency_contact_name", 150, true],
  // emergencyContactMobileNumber: ["emergency_contact_mobile_number", 40, true],
  major: ["major", 100, true],
  year: ["year", 100, true],
  // ASK AFTER ADMISSION: restore in the post-admission portal.
  // age: ["age", 100, true],
  country: ["country", 100, true],
  school: ["school", 200, true],
  // ASK AFTER ADMISSION: restore in the post-admission portal.
  // "food-allergies": ["food_allergies", 500, false],
  applicationQuestion1: ["application_question_1", SHORT_ANSWER_MAX_LENGTH, true],
  applicationQuestion2: ["application_question_2", SHORT_ANSWER_MAX_LENGTH, false],
};

const RESUME_REQUIRED = false;

/**
 * A browser counts a line break in a <textarea> as ONE character for
 * maxLength, then submits it as CR LF (two) in a multipart form. Without this,
 * an answer the browser allowed (2000 characters with a few line breaks) was
 * rejected by the server as too long. Line breaks are stored as "\n".
 */
export function normalizeNewlines(text) {
  return text.replace(/\r\n?/g, "\n");
}

export function getResumeExtension(file) {
  const name = typeof file?.name === "string" ? file.name : "";
  const ext = name.includes(".") ? name.split(".").pop().toLowerCase() : "";
  return Object.hasOwn(RESUME_TYPES, ext) ? ext : null;
}

export function validateResume(file, { required = RESUME_REQUIRED } = {}) {
  const isFile =
    typeof file === "object" &&
    file !== null &&
    typeof file.arrayBuffer === "function";
  const errors = {};

  if (!isFile || file.size === 0) {
    if (required) errors.resume = "Please upload your resume.";
    return { ok: !required, file: null, errors };
  }

  const extension = getResumeExtension(file);
  if (!extension) {
    errors.resume = "Resume must be a PDF, DOC, or DOCX file.";
  } else if (file.size > MAX_RESUME_BYTES) {
    errors.resume = "Resume must be 4 MB or smaller.";
  } else if (file.type && !RESUME_TYPES[extension].includes(file.type)) {
    errors.resume = "That file's type doesn't match its extension.";
  }

  return Object.keys(errors).length > 0
    ? { ok: false, file: null, errors }
    : { ok: true, file, extension, errors: {} };
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
    const text = typeof value === "string" ? normalizeNewlines(value).trim() : "";

    if (!text) {
      if (required) {
        errors[field] = "This field is required.";
      } else {
        row[column] = null;
      }
    } else if ([...text].length > maxLength) {
      // Count characters, not UTF-16 units, so names and answers written in
      // non-Latin scripts or with emoji get the same allowance.
      errors[field] = `Must be ${maxLength} characters or fewer.`;
    } else {
      row[column] = text;
    }
  }

  // "Other" in the picker asks "What school?" and stores the typed name. The
  // old catch-all values carry no school, so they are no longer accepted.
  if (row.school && isLegacyBucket(row.school)) {
    errors.school = SCHOOL_BUCKET_MESSAGE;
    delete row.school;
  }

  if (row.email) {
    row.email = row.email.toLowerCase();
    if (!EMAIL_PATTERN.test(row.email)) {
      errors.email = "Enter a valid email address.";
    }
  }

  // ASK AFTER ADMISSION: restore in the post-admission portal. The liability
  // waiver is about attending, not applying, so it is no longer required here.
  // It is accepted in the portal (PATCH /api/application). A waiver ticked by
  // an older cached copy of the form is still recorded.
  // if (formData.get("waiver") !== "on") {
  //   errors.waiver = "You must accept the waiver to apply.";
  // } else {
  //   row.waiver_accepted = true;
  // }
  if (formData.get("waiver") === "on") {
    row.waiver_accepted = true;
  }

  const experience = formData.get("experience");
  if (experience !== "yes" && experience !== "no") {
    errors.experience = "Please choose yes or no.";
  } else {
    row.prior_hackathon_experience = experience === "yes";
  }

  const resumeResult = validateResume(formData.get("resume"));
  Object.assign(errors, resumeResult.errors);

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, row, resume: resumeResult.file };
}
