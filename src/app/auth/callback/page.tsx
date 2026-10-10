"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Signing you in…");
  const redirected = useRef(false);

  useEffect(() => {
    function goToAdmin() {
      if (redirected.current) return;
      redirected.current = true;
      router.replace("/admin");
    }

    // Listen for ANY auth event that has a session — Supabase fires
    // INITIAL_SESSION (not SIGNED_IN) after PKCE token extraction
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
      (_event, session) => {
        if (session) goToAdmin();
      }
    );

    // Backup: poll every 500ms for up to 8 seconds
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      const { data } = await supabaseBrowser.auth.getSession();
      if (data.session) {
        clearInterval(interval);
        goToAdmin();
      } else if (attempts >= 16) {
        clearInterval(interval);
        setStatus("Sign-in timed out — redirecting…");
        setTimeout(() => router.replace("/admin/login"), 1000);
      }
    }, 500);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-[#080C14] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#4ADE80] to-[#22C55E] flex items-center justify-center mx-auto mb-4 shadow-[0_0_32px_rgba(74,222,128,0.3)]">
          <Loader2 size={22} className="text-black animate-spin" />
        </div>
        <p className="text-sm text-gray-400">{status}</p>
      </div>
    </div>
  );
}
