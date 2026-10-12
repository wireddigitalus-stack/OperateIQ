"use client";
import { supabaseBrowser } from "@/lib/supabase-browser";

/** Full sign-out: server cookies (org, impersonation, crew, token mirror) + Supabase session + local caches. */
export async function signOutEverywhere(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch { /* continue */ }
  try {
    await supabaseBrowser.auth.signOut();
  } catch { /* continue */ }
  try {
    for (const k of ["oiq_demo_auth", "oiq_commenter", "oiq_live_leads"]) {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    }
  } catch { /* storage unavailable */ }
}
