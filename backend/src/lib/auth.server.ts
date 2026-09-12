import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";

import { getPool } from "./database.server";

export function mailConfigured() {
  return !!(process.env["RESEND_API_KEY"] && process.env["MAIL_FROM"]);
}
export function googleConfigured() {
  return !!(process.env["GOOGLE_CLIENT_ID"] && process.env["GOOGLE_CLIENT_SECRET"]);
}
export function accountOrigin(request: Request) {
  const configured = process.env["FRONTEND_ORIGIN"]?.replace(/\/$/, "");
  if (configured) return configured;
  const url = new URL(request.url);
  if (
    process.env["NODE_ENV"] === "production" ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
  ) {
    throw new Error("Set FRONTEND_ORIGIN to the public origin before enabling accounts.");
  }
  return url.origin;
}
async function sendAccountEmail(to: string, subject: string, text: string) {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + process.env["RESEND_API_KEY"],
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: process.env["MAIL_FROM"], to: [to], subject, text }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("Email delivery failed");
  } catch {
    console.warn("Account email delivery failed. Check the email API configuration.");
  }
}

function createAuth(baseURL: string) {
  const secret = process.env["AUTH_SECRET"];
  if (!secret || secret.length < 32)
    throw new Error("AUTH_SECRET must contain at least 32 characters.");
  return betterAuth({
    appName: "MindForge",
    baseURL,
    secret,
    database: getPool(),
    trustedOrigins: [baseURL],
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      requireEmailVerification: false,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 1800,
      ...(mailConfigured()
        ? {
            sendResetPassword: async ({ user, url }: { user: { email: string }; url: string }) => {
              void sendAccountEmail(
                user.email,
                "Reset your MindForge password",
                "Use this link within 30 minutes to set a new password:\n\n" +
                  url +
                  "\n\nIf you did not request this, you can ignore this email.",
              );
            },
          }
        : {}),
    },
    emailVerification: {
      sendOnSignUp: false,
      sendOnSignIn: false,
      autoSignInAfterVerification: false,
      ...(mailConfigured()
        ? {
            sendVerificationEmail: async ({
              user,
              url,
            }: {
              user: { email: string };
              url: string;
            }) => {
              void sendAccountEmail(
                user.email,
                "Verify your MindForge email",
                "Confirm your email address using this link:\n\n" + url,
              );
            },
          }
        : {}),
    },
    socialProviders: googleConfigured()
      ? {
          google: {
            clientId: process.env["GOOGLE_CLIENT_ID"]!,
            clientSecret: process.env["GOOGLE_CLIENT_SECRET"]!,
            prompt: "select_account",
            accessType: "online",
          },
        }
      : {},
    account: {
      encryptOAuthTokens: true,
      accountLinking: { enabled: true, disableImplicitLinking: true, allowDifferentEmails: false },
    },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
    advanced: { cookiePrefix: "mindforge", database: { generateId: "uuid" } },
    // Our account guard uses persistent per-email, signed-visitor and server limits,
    // without trusting spoofable forwarding headers. AI limits are independent.
    rateLimit: { enabled: false },
    logger: { disabled: true },
  });
}
type Auth = ReturnType<typeof createAuth>;
const state = globalThis as typeof globalThis & { __mindforgeAuth?: Map<string, Promise<Auth>> };
export async function getAuth(request: Request): Promise<Auth> {
  const baseURL = accountOrigin(request);
  const cache = (state.__mindforgeAuth ??= new Map());
  let pending = cache.get(baseURL);
  if (!pending) {
    pending = (async () => {
      const auth = createAuth(baseURL);
      const migrations = await getMigrations(auth.options);
      await migrations.runMigrations();
      return auth;
    })();
    cache.set(baseURL, pending);
    pending.catch(() => cache.delete(baseURL));
  }
  return pending;
}
