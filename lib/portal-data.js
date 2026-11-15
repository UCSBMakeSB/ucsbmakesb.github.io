import { redirect } from "next/navigation";
import { revalidateTag, unstable_cache } from "next/cache";
import { cache } from "react";
import { getSupabaseAdmin, getSupabaseServer } from "./supabase-server";

export const PORTAL_IDENTITY_FIELDS =
  "preferred_first_name, last_name";

export const PORTAL_PROFILE_FIELDS = [
  PORTAL_IDENTITY_FIELDS,
  "mobile_number",
  "emergency_contact_name",
  "emergency_contact_mobile_number",
  "major",
  "year",
  "age",
  "country",
  "school",
  "food_allergies",
].join(", ");

export const PORTAL_APPLICATION_FIELDS = [
  "waiver_accepted",
  "prior_hackathon_experience",
  "resume_path",
  ...Array.from(
    { length: 8 },
    (_, index) => `application_question_${index + 1}`,
  ),
].join(", ");

export const PORTAL_ACCOUNT_FIELDS = [
  PORTAL_PROFILE_FIELDS,
  PORTAL_APPLICATION_FIELDS,
].join(", ");

export function applicationToAccount(application, email) {
  return {
    firstName: application.preferred_first_name,
    lastName: application.last_name ?? "",
    email: email ?? application.email,
    mobileNumber: application.mobile_number,
    emergencyContactName: application.emergency_contact_name,
    emergencyContactMobileNumber: application.emergency_contact_mobile_number,
    major: application.major,
    year: application.year,
    age: application.age,
    country: application.country,
    school: application.school,
    "food-allergies": application.food_allergies ?? "",
    waiver: application.waiver_accepted,
    experience: application.prior_hackathon_experience ? "yes" : "no",
    resume: application.resume_path
      ? { name: application.resume_path.split("/").pop() }
      : null,
    ...Object.fromEntries(
      Array.from({ length: 8 }, (_, index) => [
        `applicationQuestion${index + 1}`,
        application[`application_question_${index + 1}`] ?? "",
      ]),
    ),
  };
}

export const getCurrentPortalUser = cache(async () => {
  const supabaseServer = await getSupabaseServer();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  if (!user) redirect("/login?next=/portal");
  return user;
});

async function getCachedPortalApplication(userId, fields) {
  const getApplication = unstable_cache(
    async () => {
      const { data, error } = await getSupabaseAdmin()
        .from("applications")
        .select(fields)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Portal application lookup failed:", error);
        throw new Error("Couldn't load the portal application.");
      }

      return data;
    },
    ["portal-application", userId, fields],
    {
      revalidate: 60,
      tags: [`portal-account:${userId}`],
    },
  );

  return getApplication();
}

export function revalidatePortalAccount(userId) {
  // `expire: 0`, not "max": with "max" the next request is still served the
  // STALE cached row while a refresh runs in the background (see
  // node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidateTag.md).
  // Stale data here means old answers after a save and a reload, and a
  // "no application" answer right after one was linked to the account.
  revalidateTag(`portal-account:${userId}`, { expire: 0 });
}

export async function getPortalAccount(fields) {
  const user = await getCurrentPortalUser();
  const application = await getCachedPortalApplication(user.id, fields);
  // No application on this account yet. Do not send the user to /apply
  // directly: /apply used to send signed-in users back to the portal, which
  // was an endless redirect loop for anyone whose draft was never linked
  // (confirmed on another device, or after the draft expired). The claim
  // route links a pending draft by the account's confirmed email and comes
  // back here, or lands on the /apply form when there is nothing to link.
  if (!application) redirect("/api/apply/claim-draft?next=/portal");

  return applicationToAccount(application, user.email);
}
