import type { IncomingMessage, ServerResponse } from "node:http";
import http from "node:http";
import { BrowserManager } from "./browser/manager.js";
import { SessionStore } from "./browser/sessions.js";
import { Config } from "./core/config.js";
import { Logger } from "./core/logger.js";
import {
  availabilityRoute,
  headersRoute,
  healthRoute,
  ismdsRoute,
  renderRoute,
} from "./routes/index.js";
import { AvailabilityService } from "./services/availability.js";
import { IsmdsService } from "./services/ismds.js";
import { RendererService } from "./services/renderer.js";

export function createHttpServer(
  config: Config,
  log: Logger,
  browser: BrowserManager,
  sessions: SessionStore,
  renderer: RendererService,
  availability: AvailabilityService,
  ismds: IsmdsService,
): http.Server {
  return http.createServer(
    async (req: IncomingMessage, res: ServerResponse) => {
      try {
        if (healthRoute(req, res, browser)) return;
        if (await headersRoute(req, res, sessions, config)) return;
        if (await renderRoute(req, res, renderer)) return;
        if (await availabilityRoute(req, res, availability)) return;
        if (await ismdsRoute(req, res, ismds)) return;

        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Not found" }));
      } catch (err) {
        log.error("unhandled request error", {
          error: (err as Error).message,
          url: req.url,
        });
        if (!res.headersSent) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Internal server error" }));
        }
      }
    },
  );
}
