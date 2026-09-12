import Fastify from "fastify";
import cors from "@fastify/cors";
import { Readable } from "node:stream";
import { initializeDatabase, closeDatabase } from "./lib/database.server";
import { getAuth } from "./lib/auth.server";
import { handleAccounts } from "./lib/account-handler.server";
import { handleChat } from "./lib/chat-handler.server";
import { ensureVisitor, aiAccess, guardAiRequest } from "./lib/request-security.server";
import * as actions from "./lib/session.functions";
import { ZodError } from "zod/v3";

export async function createApp() {
  const origin = process.env["FRONTEND_ORIGIN"];
  if (!origin || new URL(origin).origin !== origin)
    throw new Error("FRONTEND_ORIGIN must be an exact origin without a trailing slash.");
  if (process.env["NODE_ENV"] === "production" && !origin.startsWith("https://"))
    throw new Error("Production requires HTTPS.");
  if ((process.env["SESSION_SECRET"]?.length || 0) < 32) throw new Error("Set SESSION_SECRET.");
  await initializeDatabase();
  await getAuth(new Request(origin));
  const app = Fastify({
    logger: false,
    bodyLimit: 1048576,
    requestTimeout: 90000,
    trustProxy: false,
  });
  await app.register(cors, {
    origin,
    credentials: false,
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Mindforge-Account"],
  });
  app.removeContentTypeParser("application/json");
  app.addContentTypeParser("application/json", { parseAs: "string" }, (_, body, done) =>
    done(null, body),
  );
  let active = 0;
  app.route({
    method: ["GET", "POST", "DELETE"],
    url: "/api/*",
    handler: async (incoming, reply) => {
      reply.header("Cache-Control", "no-store").header("X-Content-Type-Options", "nosniff");
      const path = incoming.url.split("?")[0]!;
      if (path === "/api/health" && incoming.method === "GET") return { status: "ok" };
      const headers = new Headers();
      for (const [key, value] of Object.entries(incoming.headers))
        if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(",") : value);
      const abort = new AbortController();
      reply.raw.on("close", () => {
        if (!reply.raw.writableEnded) abort.abort();
      });
      const request = new Request(origin + incoming.url, {
        method: incoming.method,
        headers,
        ...(!["GET", "HEAD"].includes(incoming.method)
          ? {
              body:
                typeof incoming.body === "string"
                  ? incoming.body
                  : JSON.stringify(incoming.body ?? {}),
            }
          : {}),
        signal: abort.signal,
      });
      let response: Response;
      const ai = path === "/api/session" || path === "/api/chat" || path.startsWith("/api/ai/");
      if (ai) {
        if (incoming.method !== "POST")
          return reply.code(405).send({ message: "Method not allowed." });
        if (Buffer.byteLength(String(incoming.body || "")) > 262144)
          return reply.code(413).send({ message: "Session too large." });
        const denied = await guardAiRequest(request);
        if (denied) response = denied;
        else if (active >= 4)
          response = new Response("Practice is busy. Please retry shortly.", {
            status: 503,
            headers: { "Retry-After": "15" },
          });
        else {
          active++;
          let released = false;
          const release = () => {
            if (!released) {
              active--;
              released = true;
            }
          };
          reply.raw.once("close", release);
          reply.raw.once("finish", release);
          try {
            if (path === "/api/session" || path === "/api/chat")
              response = await handleChat(request, path === "/api/chat");
            else {
              const name = path.slice("/api/ai/".length) as keyof typeof actions;
              if (!Object.hasOwn(actions, name))
                response = new Response("Not found.", { status: 404 });
              else
                response = Response.json(
                  (await actions[name]({ data: await request.json() })) ?? null,
                );
            }
          } catch (error) {
            release();
            response = Response.json(
              {
                message:
                  error instanceof ZodError
                    ? "Invalid practice request."
                    : "The review could not finish. Please try again.",
              },
              { status: error instanceof ZodError ? 400 : 502 },
            );
          }
        }
      } else {
        const visitor = await ensureVisitor(request);
        if (path === "/api/access" && incoming.method === "POST") {
          response =
            request.headers.get("origin") === origin
              ? Response.json(aiAccess(visitor.id))
              : new Response("Origin not allowed.", { status: 403 });
        } else
          response = (await handleAccounts(request)) || new Response("Not found.", { status: 404 });
        if (visitor.cookie) response.headers.append("Set-Cookie", visitor.cookie);
      }
      reply.code(response.status);
      response.headers.forEach((value, key) => {
        if (key !== "set-cookie") reply.header(key, value);
      });
      const cookies = response.headers.getSetCookie();
      if (cookies.length) reply.header("Set-Cookie", cookies);
      return reply.send(
        response.body
          ? Readable.fromWeb(response.body as unknown as import("node:stream/web").ReadableStream)
          : null,
      );
    },
  });
  app.setErrorHandler((error, _, reply) => {
    const status =
      typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 500;
    reply
      .code(status >= 400 && status < 500 ? status : 503)
      .send({ message: "The service is unavailable. Please retry shortly." });
  });
  app.addHook("onClose", closeDatabase);
  return app;
}
if (process.env["MINDFORGE_TEST_IMPORT"] !== "true") {
  const app = await createApp();
  await app.listen({ host: "0.0.0.0", port: Number(process.env["PORT"] || 4000) });
  console.log("MindForge backend ready.");
  for (const signal of ["SIGINT", "SIGTERM"] as const)
    process.once(signal, () => {
      void app.close();
    });
}
