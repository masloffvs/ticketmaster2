import type { IncomingMessage, ServerResponse } from "node:http";
import { BrowserManager } from "../browser/manager.js";

export function healthRoute(
  req: IncomingMessage,
  res: ServerResponse,
  browser: BrowserManager,
): boolean {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        freeSlots: browser.freeSlots,
        totalSlots: browser.totalSlots,
      }),
    );
    return true;
  }

  if (req.url === "/status") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        slots: browser.slots,
        browserConnected: browser.connected,
      }),
    );
    return true;
  }

  return false;
}
