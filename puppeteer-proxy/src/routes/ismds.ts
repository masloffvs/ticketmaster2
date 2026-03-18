import type { IncomingMessage, ServerResponse } from "node:http";
import { parseQuery } from "../core/utils.js";
import { IsmdsService, isValidEndpoint } from "../services/ismds.js";

export async function ismdsRoute(
  req: IncomingMessage,
  res: ServerResponse,
  ismds: IsmdsService,
): Promise<boolean> {
  if (!req.url?.startsWith("/ismds")) return false;

  const params = parseQuery(req.url);
  const eventId = params.eventId;
  const endpoint = params.endpoint;

  if (!eventId) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Missing ?eventId= parameter" }));
    return true;
  }

  if (!endpoint || !isValidEndpoint(endpoint)) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({ error: "endpoint must be one of: facets, quickpicks" }),
    );
    return true;
  }

  try {
    const start = Date.now();
    const result = await ismds.fetch(eventId, endpoint);
    const elapsed = Date.now() - start;

    res.writeHead(result.status || 502, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "X-Fetch-Time-Ms": String(elapsed),
    });
    res.end(result.body);
  } catch (err) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: (err as Error).message }));
  }

  return true;
}
