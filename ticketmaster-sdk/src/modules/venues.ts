import type { HttpClient } from "../client";
import type { Venue, VenueSearchParams, VenueSearchResponse } from "../types";

export class VenuesModule {
  private readonly path = "/discovery/v2/venues";

  constructor(private readonly http: HttpClient) {}

  /** Search venues by keyword, location, country, etc. */
  async search(params: VenueSearchParams = {}): Promise<VenueSearchResponse> {
    return this.http.get<VenueSearchResponse>(
      `${this.path}.json`,
      params as Record<string, unknown>,
    );
  }

  /** Get a single venue by ID */
  async get(id: string, locale?: string): Promise<Venue> {
    return this.http.get<Venue>(`${this.path}/${encodeURIComponent(id)}.json`, {
      locale,
    });
  }
}
