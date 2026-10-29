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
    },
  };
}
