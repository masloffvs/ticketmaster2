import type { Logger } from "pino";
import type { IsmdsEndpoint, IsmdsStore } from "./ismds-store";

const PUPPETEER_BASE = Bun.env.PUPPETEER_URL ?? "http://puppeteer-proxy:3100";

export class IsmdsFetcher {
  constructor(
    private readonly store: IsmdsStore,
    private readonly logger: Logger,
  ) {}

  async fetchAndStore(
    eventId: string,
    endpoint: IsmdsEndpoint,
    force = false,
  ): Promise<{
    eventId: string;
    endpoint: string;
    sizeBytes: number;
    cached: boolean;
  }> {
    if (!force) {
      const existing = await this.store.get(eventId, endpoint);
      if (existing) {
        this.logger.debug(
          { eventId, endpoint },
          "ISMDS already persisted, skipping fetch",
        );
        return {
          eventId,
          endpoint,
          sizeBytes: existing.sizeBytes,
          cached: true,
        };
      }
    }

    const url = `${PUPPETEER_BASE}/ismds?eventId=${encodeURIComponent(eventId)}&endpoint=${endpoint}`;

    this.logger.info(
      { eventId, endpoint },
      "Fetching ISMDS from puppeteer-proxy",
    );

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `Puppeteer ISMDS returned ${res.status}: ${body.slice(0, 200)}`,
      );
    }

    const data = await res.json();
    const doc = await this.store.upsert(eventId, endpoint, data);

    return {
      eventId,
      endpoint,
      sizeBytes: doc.sizeBytes,
      cached: false,
    };
  }

  async fetchBoth(
    eventId: string,
    force = false,
  ): Promise<
    Array<{
      ok: boolean;
      eventId: string;
      endpoint: string;
      sizeBytes?: number;
      cached?: boolean;
      error?: string;
    }>
  > {
    const endpoints: IsmdsEndpoint[] = ["facets", "quickpicks"];
    const results = await Promise.allSettled(
      endpoints.map((ep) => this.fetchAndStore(eventId, ep, force)),
    );
    return results.map((r, i) =>
      r.status === "fulfilled"
        ? { ok: true, ...r.value }
        : {
            ok: false,
            eventId,
            endpoint: endpoints[i],
            error: r.reason?.message ?? String(r.reason),
          },
    );
  }
}
