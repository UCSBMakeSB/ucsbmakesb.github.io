// Fake of lib/supabase-server.js. Same exports, backed by the in-memory db.
import { createAdminClient, db, publicUser } from "./db.mjs";

let admin;

export function getSupabaseAdmin() {
  admin ??= createAdminClient();
  return admin;
}

export async function getSupabaseServer() {
  return {
    auth: {
      async getUser() {
        const user = db.users.get(db.currentUserId);
        return { data: { user: publicUser(user) }, error: null };
      },
      async exchangeCodeForSession(code) {
        const entry = db.codes.get(code);
        if (!entry) return { data: null, error: { message: "invalid or expired code" } };
        if (entry.error) return { data: null, error: entry.error };
        db.currentUserId = entry.userId;
        return { data: { session: {} }, error: null };
      },
      // Token-hash email links (/auth/confirm). One-time, like the real thing.
      async verifyOtp({ type, token_hash }) {
        const entry = db.otps.get(token_hash);
        if (!entry || (entry.type && entry.type !== type)) {
          return { data: null, error: { message: "Email link is invalid or has expired", code: "otp_expired" } };
        }
        if (entry.error) return { data: null, error: entry.error };
        db.otps.delete(token_hash);
        const user = db.users.get(entry.userId);
        if (user) user.email_confirmed_at ??= new Date().toISOString();
        db.currentUserId = entry.userId;
        return { data: { session: {} }, error: null };
      },
    },
  };
}
