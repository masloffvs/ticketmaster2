import type { HttpClient } from "../client";
import type { SuggestParams, SuggestResponse } from "../types";

export class SuggestModule {
  private readonly path = "/discovery/v2/suggest";

  constructor(private readonly http: HttpClient) {}

  /** Autocomplete search — returns matching events, attractions, venues */
  async find(params: SuggestParams): Promise<SuggestResponse> {
    return this.http.get<SuggestResponse>(
      `${this.path}.json`,
      params as unknown as Record<string, unknown>,
    );
  }
}
