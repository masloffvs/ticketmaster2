import "reflect-metadata";
import { BrowserManager } from "./browser/manager.js";
import { SessionStore } from "./browser/sessions.js";
import { Config } from "./core/config.js";
import { container } from "./core/di/index.js";
import { Logger } from "./core/logger.js";
import { createHttpServer } from "./server.js";
import { AvailabilityService } from "./services/availability.js";
import { IsmdsService } from "./services/ismds.js";
import { RendererService } from "./services/renderer.js";

// ─── Bootstrap DI ───────────────────────────────────────────────
const config = container.resolve(Config);
const log = container.resolve(Logger);
const browser = container.resolve(BrowserManager);
const sessions = container.resolve(SessionStore);
const renderer = container.resolve(RendererService);
const availability = container.resolve(AvailabilityService);
const ismds = container.resolve(IsmdsService);

// ─── Start ──────────────────────────────────────────────────────
async function main() {
  await browser.launch();

  // Pre-warm sessions in background
  availability.warmApiPage().catch((err) =>
    log.error("SE API page warm-up failed", {
      error: (err as Error).message,
    }),
  );
  ismds.warmApiPage().catch((err) =>
    log.error("US ISMDS page warm-up failed", {
      error: (err as Error).message,
    }),
  );
  sessions
    .warm("se")
    .catch((err) =>
      log.error("session:se warm-up failed", { error: (err as Error).message }),
    );
  sessions
    .warm("us")
    .catch((err) =>
      log.error("session:us warm-up failed", { error: (err as Error).message }),
    );

  const server = createHttpServer(
    config,
    log,
    browser,
    sessions,
    renderer,
    availability,
    ismds,
  );

  server.listen(config.port, "0.0.0.0", () => {
    log.info(`listening on :${config.port}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    log.info(`${signal}, shutting down...`);
    server.close();
    await browser.close();
    log.shutdown();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  log.error("fatal error", { error: (err as Error).message });
  process.exit(1);
});
