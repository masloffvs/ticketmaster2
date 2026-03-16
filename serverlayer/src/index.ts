import { Config } from "@/core/config";
import { container } from "@/core/di";
import { Logger } from "@/core/logger";
import { shutdownTelemetry, startTelemetry } from "@/core/telemetry";
import { DatabaseProvider } from "@/db";
import { Migrator } from "@/db/migrator";
import { artistRoutes, eventRoutes, healthRoutes } from "@/routes";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { Elysia } from "elysia";
import "reflect-metadata";

// ─── OpenTelemetry (must init before everything) ────────────────
if (Bun.env.OTEL_ENABLED !== "false") {
  startTelemetry();
}

// ─── Bootstrap DI ───────────────────────────────────────────────
const config = container.resolve(Config);
const logger = container.resolve(Logger);
container.registerClass(DatabaseProvider);

// ─── Run migrations ─────────────────────────────────────────────
const migrator = container.resolve(Migrator);
await migrator.run();

// ─── Create App ─────────────────────────────────────────────────
const app = new Elysia()
  .use(cors())
  .use(
    swagger({
      documentation: {
        info: {
          title: "Ticketmaster API",
          version: "0.0.1",
          description:
            "Ticketmaster server layer — Elysia + Drizzle + PostgreSQL",
        },
      },
    }),
  )
  .onRequest(({ request }) => {
    logger.debug("incoming request", {
      method: request.method,
      url: request.url,
    });
  })
  .onError(({ error, request }) => {
    logger.error("request error", {
      method: request.method,
      url: request.url,
      error: error.message,
    });
  })
  .use(healthRoutes)
  .use(eventRoutes)
  .use(artistRoutes)
  .listen(config.port);

logger.info(
  `Ticketmaster API running at http://${app.server?.hostname}:${app.server?.port}`,
);
logger.info(
  `Swagger docs at http://${app.server?.hostname}:${app.server?.port}/swagger`,
);

// ─── Graceful shutdown ──────────────────────────────────────────
process.on("SIGTERM", async () => {
  logger.info("Shutting down...");
  await shutdownTelemetry();
  process.exit(0);
});

export type App = typeof app;
