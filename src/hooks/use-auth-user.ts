import { useEffect, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { getCurrentAuthUser, toAuthUser, type AuthUser } from "@/services/auth";

/**
 * The single live source of the signed-in user's identity. `user` is null
 * whenever no one is signed in (expected right now — auth is bypassed for
 * guest-mode testing) or Supabase isn't configured; callers should fall
 * back to a neutral label like "Guest", never a hardcoded person's name.
 *
 * Subscribes to Supabase's auth-state events, so a name change made via
 * updateProfileName() (or a login/logout elsewhere) is reflected here
 * immediately, in every component that uses this hook, with no extra
 * plumbing.
 */
export function useAuthUser() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    getCurrentAuthUser().then((current) => {
      if (active) {
        setUser(current);
        setLoading(false);
      }
    });

    const supabase = getSupabaseBrowserClient();
    const listener = supabase?.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? toAuthUser(session.user) : null);
    });

    return () => {
      active = false;
      listener?.data.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
