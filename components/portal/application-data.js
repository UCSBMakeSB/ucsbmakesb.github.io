import { formFields, postAdmissionFields } from "../field-renderer";

export const applicationQuestions = [
  {
    type: "essay",
    id: "application-question-1",
    name: "applicationQuestion1",
    label: "Why do you want to come to MakeSB?",
    helpText: "A sentence or two is plenty.",
    rows: 4,
    requirement: "required",
  },
  {
    type: "essay",
    id: "application-question-2",
    name: "applicationQuestion2",
    label:
      "Tell us about a project you're proud of. What specific decisions did you make and why?",
    helpText: "A few sentences or a link is fine.",
    rows: 4,
    // Was required. Only question 1 is required now.
    requirement: "optional",
  },
  {
    type: "essay",
    id: "application-question-3",
    name: "applicationQuestion3",
    label: "What skills do you want to use, and what's your background?",
    rows: 4,
    // Was required.
    requirement: "optional",
  },
  {
    type: "essay",
    id: "application-question-4",
    name: "applicationQuestion4",
    label: "What kinds of problems are you interested in solving?",
    rows: 4,
    // Was required.
    requirement: "optional",
  },
  {
    type: "essay",
    id: "application-question-5",
    name: "applicationQuestion5",
    label: "Is there anything else you'd like to share?",
    rows: 4,
    requirement: "optional",
  },
  {
    type: "essay",
    id: "application-question-6",
    name: "applicationQuestion6",
    label:
      "If you're flying in, please share your travel details (i.e. flight times, etc.).",
    rows: 4,
    requirement: "optional",
  },
  {
    type: "essay",
    id: "application-question-7",
    name: "applicationQuestion7",
    label:
      "Are there any students whose skills, passion, or projects you admire that are potentially applying to MakeSB? Please enter names and emails (max 3, or enter N/A).",
    rows: 4,
    requirement: "optional",
  },
  {
    type: "essay",
    id: "application-question-8",
    name: "applicationQuestion8",
    label:
      "What would you say to an LLM grading your app? (we won't use LLMs)",
    rows: 4,
    requirement: "fun",
  },
];

export const applicationGroups = [
  {
    title: "Short Essay Questions",
    description: "Tell us about your interest, experience, and ideas.",
    questions: applicationQuestions.slice(0, 5),
  },
  {
    title: "Details",
    description: "Optional. Helps us reach more builders.",
    questions: applicationQuestions.slice(6, 7),
  },
  {
    title: "Fun Questions",
    description: "A chance for us to get to know you better :)",
    questions: applicationQuestions.slice(7),
  },
];

export const applicationSupplements = {
  title: "Supplements",
  description: "Extra materials to support your application.",
  fields: [formFields.find((field) => field.name === "resume")],
};

// ASK AFTER ADMISSION: travel details (question 6) and the liability waiver
// were part of the application. They are only needed from admitted students,
// so they sit in their own optional section. Once admission decisions exist,
// show this section only to admitted applicants and require the waiver there.
export const postAdmissionSection = {
  title: "If You're Admitted",
  description:
    "Optional for now. We only need these if you're admitted, so feel free to skip them.",
  questions: applicationQuestions.slice(5, 6),
  fields: [postAdmissionFields.find((field) => field.name === "waiver")],
};
