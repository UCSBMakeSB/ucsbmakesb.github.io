import { formFields } from "../field-renderer";
import { QUESTION_MAX_WORDS } from "../../lib/question-limits";

export const applicationQuestions = [
  {
    type: "essay",
    id: "application-question-1",
    name: "applicationQuestion1",
    maxWords: QUESTION_MAX_WORDS[1],
    label: "Why do you want to come to MakeSB?",
    rows: 8,
    requirement: "required",
  },
  {
    type: "essay",
    id: "application-question-2",
    name: "applicationQuestion2",
    maxWords: QUESTION_MAX_WORDS[2],
    label:
      "Tell us about a project you're proud of. What specific decisions did you make and why?",
    rows: 8,
    requirement: "required",
  },
  {
    type: "essay",
    id: "application-question-3",
    name: "applicationQuestion3",
    maxWords: QUESTION_MAX_WORDS[3],
    label: "What skills do you want to use, and what's your background?",
    rows: 8,
    requirement: "required",
  },
  {
    type: "essay",
    id: "application-question-4",
    name: "applicationQuestion4",
    maxWords: QUESTION_MAX_WORDS[4],
    label: "What kinds of problems are you interested in solving?",
    rows: 4,
    requirement: "required",
  },
  {
    type: "essay",
    id: "application-question-5",
    name: "applicationQuestion5",
    maxWords: QUESTION_MAX_WORDS[5],
    label: "Is there anything else you'd like to share?",
    rows: 4,
    requirement: "recommended",
  },
  {
    type: "essay",
    id: "application-question-6",
    name: "applicationQuestion6",
    maxWords: QUESTION_MAX_WORDS[6],
    label:
      "If you're flying in, please share your travel details (i.e. flight times, etc.).",
    rows: 4,
    requirement: "optional",
  },
  {
    type: "essay",
    id: "application-question-7",
    name: "applicationQuestion7",
    maxWords: QUESTION_MAX_WORDS[7],
    label:
      "Are there any students whose skills, passion, or projects you admire that are potentially applying to MakeSB? Please enter names and emails (max 3, or enter N/A).",
    rows: 4,
    requirement: "optional",
  },
  {
    type: "essay",
    id: "application-question-8",
    name: "applicationQuestion8",
    maxWords: QUESTION_MAX_WORDS[8],
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
    description: "A few additional details to help us plan the event.",
    questions: applicationQuestions.slice(5, 7),
  },
  {
    title: "Fun Questions",
    description: "A chance for us to get to know you better :)",
    questions: applicationQuestions.slice(7),
  },
];

export const applicationSupplements = {
  title: "Supplements",
  description: "Extra materials to support and confirm your application.",
  fields: [
    formFields.find((field) => field.name === "resume"),
    formFields.find((field) => field.name === "waiver"),
  ],
};
