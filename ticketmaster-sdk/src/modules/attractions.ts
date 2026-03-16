import type { HttpClient } from "../client";
import type {
  Attraction,
  AttractionSearchParams,
  AttractionSearchResponse,
} from "../types";

export class AttractionsModule {
  private readonly path = "/discovery/v2/attractions";

  constructor(private readonly http: HttpClient) {}

  /** Search attractions (artists, bands, sports teams, etc.) */
  async search(
    params: AttractionSearchParams = {},
  ): Promise<AttractionSearchResponse> {
    return this.http.get<AttractionSearchResponse>(
      `${this.path}.json`,
      params as Record<string, unknown>,
    );
  }

  /** Get a single attraction by ID */
  async get(id: string, locale?: string): Promise<Attraction> {
    return this.http.get<Attraction>(
      `${this.path}/${encodeURIComponent(id)}.json`,
      { locale },
    );
  }
}
