/**
 * Placeholder auth service. Swap these implementations for Lovable Cloud
 * (Supabase) auth calls later — components only depend on these signatures.
 */

export type AuthUser = {
  id: string;
  email: string;
  name: string;
};

export async function signInWithEmail(email: string, _password: string): Promise<AuthUser> {
  await new Promise((resolve) => setTimeout(resolve, 800));
  return { id: "demo-user", email, name: email.split("@")[0] ?? "Thinker" };
}

export async function signUpWithEmail(
  email: string,
  _password: string,
  name: string,
): Promise<AuthUser> {
  await new Promise((resolve) => setTimeout(resolve, 800));
  return { id: "demo-user", email, name };
}

export async function signInWithGoogle(): Promise<AuthUser> {
  await new Promise((resolve) => setTimeout(resolve, 800));
  return { id: "demo-user", email: "demo@mindforge.ai", name: "Arjun Mehta" };
}