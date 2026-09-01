/**
 * Supabase-backed auth. Email/password and Google OAuth both go through the
 * browser Supabase client, which owns session storage and refresh — there is
 * no separate token handling here.
 */
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
};

function requireClient() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    throw new Error(
      "Supabase isn't configured — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
    );
  }
  return supabase;
}

export function toAuthUser(user: { id: string; email?: string; user_metadata?: Record<string, unknown> }): AuthUser {
  const name =
    (typeof user.user_metadata?.["name"] === "string" && user.user_metadata["name"]) ||
    user.email?.split("@")[0] ||
    "Thinker";
  return { id: user.id, email: user.email ?? "", name };
}

export async function signInWithEmail(email: string, password: string): Promise<AuthUser> {
  const supabase = requireClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return toAuthUser(data.user);
}

export type SignUpResult = {
  user: AuthUser;
  /** True if Supabase requires email confirmation before a session exists. */
  needsEmailConfirmation: boolean;
};

export async function signUpWithEmail(
  email: string,
  password: string,
  name: string,
): Promise<SignUpResult> {
  const supabase = requireClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) throw error;
  if (!data.user) throw new Error("Sign-up succeeded but returned no user — check your inbox.");
  return { user: toAuthUser(data.user), needsEmailConfirmation: !data.session };
}

/** Verifies the 6-digit code Supabase emailed after signup, completing sign-up. */
export async function verifyEmailOtp(email: string, token: string): Promise<AuthUser> {
  const supabase = requireClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) throw error;
  if (!data.user) throw new Error("Verification succeeded but returned no user.");
  return toAuthUser(data.user);
}

/** Re-sends the signup verification code (same rate-limited Supabase endpoint). */
export async function resendSignUpOtp(email: string): Promise<void> {
  const supabase = requireClient();
  const { error } = await supabase.auth.resend({ type: "signup", email });
  if (error) throw error;
}

/** Turns a Supabase auth error into a message that's safe and useful to show the user. */
export function describeAuthError(err: unknown): string {
  const code = err && typeof err === "object" && "code" in err ? (err as { code?: string }).code : undefined;
  switch (code) {
    case "otp_expired":
      return "That code is invalid or has expired. Request a new one below.";
    case "over_email_send_rate_limit":
      return "Too many attempts — wait a bit before requesting another code.";
    case "validation_failed":
      return "That email address doesn't look valid.";
    default:
      return err instanceof Error ? err.message : "Something went wrong. Try again.";
  }
}

/**
 * Kicks off Google OAuth. This redirects the browser away from the page —
 * there is no user object to return here. On return, Supabase's client
 * picks up the session automatically from the URL.
 */
export async function signInWithGoogle(): Promise<void> {
  const supabase = requireClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/dashboard` },
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const supabase = requireClient();
  await supabase.auth.signOut();
}

export async function getCurrentAuthUser(): Promise<AuthUser | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ? toAuthUser(data.user) : null;
}

/**
 * Updates the signed-in user's display name in Supabase Auth's user
 * metadata. Triggers a USER_UPDATED auth-state event, so every mounted
 * useAuthUser() (AppShell, dashboard, profile, leaderboard, ...) picks up
 * the new name immediately without any extra wiring.
 */
export async function updateProfileName(name: string): Promise<AuthUser> {
  const supabase = requireClient();
  const { data, error } = await supabase.auth.updateUser({ data: { name } });
  if (error) throw error;
  return toAuthUser(data.user);
}
