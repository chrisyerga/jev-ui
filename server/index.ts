import { serve } from "@hono/node-server";
import { getConnInfo } from "@hono/node-server/conninfo";
import { serveStatic } from "@hono/node-server/serve-static";
import { APIError, TypeSafeError } from "@typesafe-ai/sdk";
import { Hono } from "hono";
import { RateLimiter } from "./cache.js";
import { api } from "./routes.js";

const isProd = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT ?? (isProd ? 3000 : 8787));
const limiter = new RateLimiter(Number(process.env.RATE_LIMIT_PER_MIN ?? 40), 60_000);

const app = new Hono();

app.get("/healthz", (c) => c.json({ ok: true }));

app.use("/api/*", async (c, next) => {
  const forwarded = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || getConnInfo(c).remote.address || "unknown";
  const retryAfter = limiter.hit(ip);
  if (retryAfter > 0) {
    c.header("Retry-After", String(retryAfter));
    return c.json({ error: `Slow down: demo rate limit reached. Try again in ${retryAfter}s.` }, 429);
  }
  await next();
});

app.route("/api", api);

app.onError((err, c) => {
  console.error(err);
  if (err instanceof APIError) {
    return c.json({ error: `TypeSafe API error ${err.status}: ${err.message}` }, 502);
  }
  if (err instanceof TypeSafeError) return c.json({ error: err.message }, 500);
  if (err instanceof SyntaxError) return c.json({ error: "Invalid JSON body" }, 400);
  return c.json({ error: "Unexpected server error" }, 500);
});

if (isProd) {
  app.use("/assets/*", serveStatic({ root: "./dist" }));
  app.use("*", serveStatic({ root: "./dist" }));
  app.get("*", serveStatic({ path: "./dist/index.html" }));
}

serve({ fetch: app.fetch, port, hostname: isProd ? "0.0.0.0" : "localhost" }, (info) => {
  console.log(`jev-ui server listening on http://${info.address}:${info.port}`);
});
