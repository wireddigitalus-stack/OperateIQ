import { createClient } from "@supabase/supabase-js";

// Browser client for auth — NEXT_PUBLIC vars are inlined at runtime.
// Placeholders keep the build from crashing during static prerendering.
export const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
