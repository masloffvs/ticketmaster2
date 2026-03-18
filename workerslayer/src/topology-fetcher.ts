import type { Logger } from "pino";
import type { TopologyStore } from "./topology-store";

const TM_MAPS_BASE = "https://mapsapi.tmol.io/maps/geometry/3/event";

export class TopologyFetcher {
  constructor(
    private readonly store: TopologyStore,
    private readonly logger: Logger,
  ) {}

  /**
   * Persist topology on first demand.
   * If already stored in MongoDB — returns immediately (topology never changes).
   * Otherwise fetches from TM Maps API and stores permanently.
   */
  async fetchAndStore(
    eventId: string,
  ): Promise<{ eventId: string; sizeBytes: number; cached: boolean }> {
    // Topology is immutable — if we already have it, skip entirely
    const existing = await this.store.get(eventId);
    if (existing) {
      this.logger.debug(
        { eventId },
        "Topology already persisted, skipping fetch",
      );
      return { eventId, sizeBytes: existing.sizeBytes, cached: true };
    }

    const url = `${TM_MAPS_BASE}/${encodeURIComponent(eventId)}/placeDetailNoKeys?useHostGrids=true&app=PRD2663_EDP_NA&sectionLevel=true&systemId=HOST`;

    this.logger.info({ eventId }, "Fetching topology from TM Maps API");

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TicketmasterProxy/1.0)",
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `TM Maps API returned ${res.status}: ${res.statusText} — ${body.slice(0, 200)}`,
      );
    }

    const data = await res.json();
    const doc = await this.store.upsert(eventId, data);

    return { eventId, sizeBytes: doc.sizeBytes, cached: false };
  }
}
