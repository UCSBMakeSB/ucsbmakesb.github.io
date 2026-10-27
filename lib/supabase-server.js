import { createClient } from "@supabase/supabase-js";

// Server-only. This uses the secret/service-role key, which bypasses row-level
// security. Never import this file from a "use client" component and never
// prefix these env vars with NEXT_PUBLIC_.
let client;

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable.",
    );
  }

  client ??= createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return client;
}
