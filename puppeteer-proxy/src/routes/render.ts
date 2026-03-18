import type { IncomingMessage, ServerResponse } from "node:http";
import { parseQuery } from "../core/utils.js";
import { RendererService } from "../services/renderer.js";

export async function renderRoute(
  req: IncomingMessage,
  res: ServerResponse,
  renderer: RendererService,
): Promise<boolean> {
  if (!req.url?.startsWith("/render")) return false;

  const params = parseQuery(req.url);
  const targetUrl = params.url;

  if (!targetUrl) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Missing ?url= parameter" }));
    return true;
  }

  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid URL" }));
    return true;
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Only http/https URLs are allowed" }));
    return true;
  }

  const host = parsed.hostname;
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.startsWith("10.") ||
    host.startsWith("172.") ||
    host.startsWith("192.168.") ||
    host === "0.0.0.0" ||
    host.endsWith(".internal")
  ) {
    res.writeHead(403, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal URLs are not allowed" }));
    return true;
  }

  try {
    const start = Date.now();
    const result = await renderer.render(targetUrl, {
      waitForSelector: params.waitFor,
      waitUntil: params.waitUntil,
    });
    const elapsed = Date.now() - start;

    if (params.format === "json") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          url: targetUrl,
          title: result.title,
          html: result.html,
          renderTimeMs: elapsed,
        }),
      );
    } else {
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "X-Render-Time-Ms": String(elapsed),
        "X-Page-Title": encodeURIComponent(result.title),
      });
      res.end(result.html);
    }
  } catch (err) {
    const msg = (err as Error).message ?? "Render failed";
    const status = msg.includes("pool exhausted") ? 503 : 500;
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: msg }));
  }

  return true;
}
