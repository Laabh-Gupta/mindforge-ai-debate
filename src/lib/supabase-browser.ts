import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

/**
 * Lazily creates a singleton browser Supabase client. Returns undefined if
 * VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY aren't set, or if called during
 * SSR (this client is browser-only — auth/session state lives in the tab).
 */
export function getSupabaseBrowserClient(): SupabaseClient | undefined {
  if (typeof window === "undefined") return undefined;
  if (client) return client;

  const url = import.meta.env["VITE_SUPABASE_URL"];
  const anonKey = import.meta.env["VITE_SUPABASE_ANON_KEY"];
  if (!url || !anonKey) return undefined;

  client = createClient(url, anonKey);
  return client;
}

/** Convenience for callers that only need to know who (if anyone) is signed in. */
export async function getCurrentUserId(): Promise<string | undefined> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return undefined;
  const { data } = await supabase.auth.getUser();
  return data.user?.id;
}
