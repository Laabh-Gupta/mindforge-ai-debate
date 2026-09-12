import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import { createTransport } from "nodemailer";
import { getDatabase } from "./database.server";

export function mailConfigured() {
  return !!(process.env["SMTP_HOST"] && process.env["SMTP_FROM"]);
}
export function googleConfigured() {
  return !!(process.env["GOOGLE_CLIENT_ID"] && process.env["GOOGLE_CLIENT_SECRET"]);
}
export function accountOrigin(request: Request) {
  const configured = process.env["APP_ORIGIN"]?.replace(/\/$/, "");
  if (configured) return configured;
  const url = new URL(request.url);
  if (
    process.env["NODE_ENV"] === "production" ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
  ) {
    throw new Error("Set APP_ORIGIN to the public origin before enabling accounts.");
  }
  return url.origin;
}
async function sendAccountEmail(to: string, subject: string, text: string) {
  const port = Number(process.env["SMTP_PORT"] || 587);
  const transport = createTransport({
    host: process.env["SMTP_HOST"],
    port,
    secure: port === 465,
    requireTLS: process.env["SMTP_REQUIRE_TLS"] !== "false",
    ...(process.env["SMTP_USER"]
      ? {
          auth: {
            user: process.env["SMTP_USER"],
            pass: process.env["SMTP_PASSWORD"],
          },
        }
      : {}),
    connectionTimeout: 10000,
    socketTimeout: 15000,
    logger: false,
    debug: false,
  });
  try {
    await transport.sendMail({ from: process.env["SMTP_FROM"], to, subject, text });
  } catch {
    // Never log credentials, recipient addresses or password-reset links.
    console.warn("Account email delivery failed. Check the SMTP configuration.");
  } finally {
    transport.close();
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
    database: getDatabase(),
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
