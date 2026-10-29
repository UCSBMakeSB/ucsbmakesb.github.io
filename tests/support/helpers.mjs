// Shared helpers for the route-level tests. Import this FIRST in every test
// file so the environment variables exist before any route module loads.
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://supabase.test";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= "publishable-test-key";
process.env.SUPABASE_URL ??= "http://supabase.test";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "service-role-test-key";

import { NextRequest } from "next/server";

export const BASE = "http://localhost:3000";
export const DRAFT_COOKIE = "makesb_application_draft";
export const STRONG_PASSWORD = "Correct-Horse-9!";

function cookieHeader(cookies) {
  return Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

function withCookies(headers, cookies) {
  const merged = { ...headers };
  if (Object.keys(cookies).length > 0) merged.cookie = cookieHeader(cookies);
  return merged;
}

export function jsonRequest(
  path,
  { method = "POST", body, raw, cookies = {}, headers = {} } = {},
) {
  const init = { method, headers: withCookies({ "content-type": "application/json", ...headers }, cookies) };
  if (raw !== undefined) init.body = raw;
  else if (body !== undefined) init.body = JSON.stringify(body);
  return new NextRequest(`${BASE}${path}`, init);
}

export function formRequest(path, formData, { method = "POST", cookies = {}, headers = {} } = {}) {
  return new NextRequest(`${BASE}${path}`, {
    method,
    headers: withCookies(headers, cookies),
    body: formData,
  });
}

export function getRequest(path, { cookies = {}, headers = {} } = {}) {
  return new NextRequest(`${BASE}${path}`, {
    method: "GET",
    headers: withCookies(headers, cookies),
  });
}

export function pdf(name = "resume.pdf", size = 1024, type = "application/pdf") {
  return new File([new Uint8Array(size)], name, { type });
}

export function validApplicationForm(overrides = {}) {
  const fields = {
    preferredFirstName: "Gaucho",
    lastName: "Student",
    email: "gaucho@ucsb.edu",
    mobileNumber: "805-555-0100",
    emergencyContactName: "Parent Student",
    emergencyContactMobileNumber: "805-555-0101",
    major: "computer-engineering",
    year: "junior",
    age: "20",
    country: "united-states",
    school: "ucsb",
    "food-allergies": "None",
    waiver: "on",
    experience: "yes",
    resume: pdf(),
    ...overrides,
  };
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) formData.set(key, value);
  }
  return formData;
}

export function isCookieCleared(response, name) {
  const cookie = response.cookies.get(name);
  return Boolean(cookie) && (cookie.value === "" || cookie.maxAge === 0 || new Date(cookie.expires) <= new Date());
}

export function redirectPath(response) {
  const location = response.headers.get("location");
  if (!location) return null;
  const url = new URL(location);
  return `${url.pathname}${url.search}`;
}
