import { authClient } from "@/lib/auth-client";
export type AuthUser = { id: string; email: string; name: string; emailVerified: boolean };
export function toAuthUser(user: {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
}): AuthUser {
  return { id: user.id, email: user.email, name: user.name, emailVerified: user.emailVerified };
}
export function describeAuthError(error: unknown) {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string")
    return error.message;
  return "Something went wrong. Please try again.";
}
export async function signInWithEmail(email: string, password: string) {
  const result = await authClient.signIn.email({ email: email.trim(), password });
  if (result.error) throw new Error(describeAuthError(result.error));
  return toAuthUser(result.data.user);
}
export async function signUpWithEmail(email: string, password: string, name: string) {
  const result = await authClient.signUp.email({
    email: email.trim(),
    password,
    name: name.trim().slice(0, 60),
  });
  if (result.error) throw new Error(describeAuthError(result.error));
  return toAuthUser(result.data.user);
}
export async function signInWithGoogle(link = false) {
  const config = await fetch("/api/auth/config").then((r) => r.json());
  if (!config.google)
    throw new Error("Google sign-in isn't available yet. Please use email and password.");
  const result = link
    ? await authClient.linkSocial({
        provider: "google",
        callbackURL: "/profile",
        errorCallbackURL: "/login",
      })
    : await authClient.signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
        errorCallbackURL: "/login",
      });
  if (result.error) throw new Error(describeAuthError(result.error));
}
export async function signOut() {
  const result = await authClient.signOut();
  if (result.error) throw new Error(describeAuthError(result.error));
}
export async function updateProfileName(name: string) {
  const result = await authClient.updateUser({ name: name.trim().slice(0, 60) });
  if (result.error) throw new Error(describeAuthError(result.error));
}
export async function requestPasswordReset(email: string) {
  const result = await authClient.requestPasswordReset({
    email: email.trim(),
    redirectTo: "/reset-password",
  });
  if (result.error) throw new Error(describeAuthError(result.error));
}
export async function resetPassword(password: string, token: string) {
  const result = await authClient.resetPassword({ newPassword: password, token });
  if (result.error) throw new Error(describeAuthError(result.error));
}
