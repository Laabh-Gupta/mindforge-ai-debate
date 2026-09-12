import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: () =>
        Response.json({
          status: "ok",
          accountsConfigured:
            (process.env["AUTH_SECRET"]?.length ?? 0) >= 32 &&
            (!!process.env["APP_ORIGIN"] || process.env["NODE_ENV"] !== "production"),
          aiConfigured: !!process.env["GROQ_API_KEY"],
          guestSecurityConfigured:
            (process.env["SESSION_SECRET"]?.length ?? 0) >= 32 ||
            process.env["NODE_ENV"] !== "production",
        }),
    },
  },
});
