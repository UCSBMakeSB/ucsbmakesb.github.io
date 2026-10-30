// Fake of @supabase/supabase-js for the routes that talk to Supabase Auth
// directly (password-reset, settings). Only the auth surface they use exists.
import { db, publicUser } from "./db.mjs";

export function createClient() {
  let sessionUser = null;

  return {
    auth: {
      async signInWithPassword({ email, password }) {
        db.calls.push({ type: "signInWithPassword", email });
        const user = [...db.users.values()].find(
          (candidate) => candidate.email === String(email).toLowerCase(),
        );
        if (!user || user.password !== password) {
          return {
            data: { user: null, session: null },
            error: { message: "Invalid login credentials", code: "invalid_credentials", status: 400 },
          };
        }
        sessionUser = user;
        return { data: { user: publicUser(user), session: {} }, error: null };
      },

      async updateUser(attributes, options = {}) {
        if (!sessionUser) {
          return { data: null, error: { message: "Auth session missing!", status: 400 } };
        }
        if (attributes.email) {
          const email = attributes.email.toLowerCase();
          const taken = [...db.users.values()].some(
            (candidate) => candidate.id !== sessionUser.id && candidate.email === email,
          );
          if (taken) {
            return {
              data: null,
              error: {
                message: "A user with this email address has already been registered",
                code: "email_exists",
                status: 422,
              },
            };
          }
          db.emailChanges.push({
            userId: sessionUser.id,
            email,
            redirectTo: options.emailRedirectTo,
          });
        }
        return { data: { user: publicUser(sessionUser) }, error: null };
      },

      async resetPasswordForEmail(email, options = {}) {
        if (db.failures.has("auth.resetPasswordForEmail")) {
          const error = db.failures.get("auth.resetPasswordForEmail");
          db.failures.delete("auth.resetPasswordForEmail");
          return { data: null, error };
        }
        // Real Supabase answers identically whether or not the account exists.
        db.resetRequests.push({ email, redirectTo: options.redirectTo });
        return { data: {}, error: null };
      },
    },
  };
}
