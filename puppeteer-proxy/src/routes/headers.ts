import type { IncomingMessage, ServerResponse } from "node:http";
import type { TmDomain } from "../browser/sessions.js";
import { SessionStore } from "../browser/sessions.js";
import { Config } from "../core/config.js";
import { parseQuery } from "../core/utils.js";

export async function headersRoute(
  req: IncomingMessage,
  res: ServerResponse,
  sessions: SessionStore,
  config: Config,
): Promise<boolean> {
  if (!req.url?.startsWith("/headers")) return false;

  const params = parseQuery(req.url);
  const domain = params.domain as TmDomain | undefined;
  const refresh = params.refresh === "1" || params.refresh === "true";

  try {
    if (domain && (domain === "us" || domain === "se")) {
      const session = refresh
        ? await sessions.refresh(domain)
        : await sessions.get(domain);

      const origin =
        domain === "us"
          ? "https://www.ticketmaster.com"
          : "https://www.ticketmaster.se";

      res.writeHead(200, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(
        JSON.stringify({
          domain,
          ready: session.ready,
          warmedAt: session.warmedAt,
          age: Date.now() - session.warmedAt,
          cookieCount: session.cookies.split("; ").filter(Boolean).length,
          headers: {
            Cookie: session.cookies,
            Origin: origin,
            Referer: origin + "/",
            "User-Agent": config.ua,
            Accept: "*/*",
            "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8",
            DNT: "1",
          },
        }),
      );
    } else {
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(JSON.stringify(sessions.summary()));
    }
  } catch (err) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: (err as Error).message }));
  }

  return true;
}
