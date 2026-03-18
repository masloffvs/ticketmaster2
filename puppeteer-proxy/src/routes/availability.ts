import type { IncomingMessage, ServerResponse } from "node:http";
import { parseQuery } from "../core/utils.js";
import { AvailabilityService } from "../services/availability.js";

export async function availabilityRoute(
  req: IncomingMessage,
  res: ServerResponse,
  availability: AvailabilityService,
): Promise<boolean> {
  if (!req.url?.startsWith("/availability")) return false;

  const params = parseQuery(req.url);
  const eventId = params.eventId;

  if (!eventId || !/^\d+$/.test(eventId)) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({ error: "Missing or invalid ?eventId= parameter" }),
    );
    return true;
  }

  try {
    const start = Date.now();
    const result = await availability.fetch(eventId);
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
