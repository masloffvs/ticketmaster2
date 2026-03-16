import type { HttpClient } from "../client";
import type { Event, EventSearchParams, EventSearchResponse } from "../types";

export class EventsModule {
  private readonly path = "/discovery/v2/events";

  constructor(private readonly http: HttpClient) {}

  /** Search events by keyword, location, dates, classification, etc. */
  async search(params: EventSearchParams = {}): Promise<EventSearchResponse> {
    return this.http.get<EventSearchResponse>(
      `${this.path}.json`,
      params as Record<string, unknown>,
    );
  }

  /** Get a single event by its ID */
  async get(id: string, locale?: string): Promise<Event> {
    return this.http.get<Event>(`${this.path}/${encodeURIComponent(id)}.json`, {
      locale,
    });
  }

  /** Get all event images */
  async images(id: string, locale?: string) {
    return this.http.get<{ images: Event["images"] }>(
      `${this.path}/${encodeURIComponent(id)}/images.json`,
      { locale },
    );
  }
}
