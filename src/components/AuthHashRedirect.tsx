"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Catches OAuth tokens (#access_token=... or #error=...) if Supabase redirects
 * back to the root URL or any page other than /auth/callback, forwarding the user
 * seamlessly to /auth/callback to finish the login handshake.
 */
export default function AuthHashRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hash = window.location.hash;
    const pathname = window.location.pathname;

    // Only forward if there's an OAuth access token or error in the hash and we are not already on /auth/callback
    if (hash && pathname !== "/auth/callback") {
      if (
        hash.includes("access_token=") ||
        hash.includes("error_description=") ||
        hash.includes("error=")
      ) {
        router.replace(`/auth/callback${hash}`);
      }
    }
  }, [router]);

  return null;
}
