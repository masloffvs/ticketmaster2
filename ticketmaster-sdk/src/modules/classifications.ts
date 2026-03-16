import type { HttpClient } from "../client";
import type {
  ClassificationDetail,
  ClassificationSearchParams,
  ClassificationSearchResponse,
} from "../types";

export class ClassificationsModule {
  private readonly path = "/discovery/v2/classifications";

  constructor(private readonly http: HttpClient) {}

  /** Search classifications (segments, genres, sub-genres) */
  async search(
    params: ClassificationSearchParams = {},
  ): Promise<ClassificationSearchResponse> {
    return this.http.get<ClassificationSearchResponse>(
      `${this.path}.json`,
      params as Record<string, unknown>,
    );
  }

  /** Get a single classification by ID */
  async get(id: string, locale?: string): Promise<ClassificationDetail> {
    return this.http.get<ClassificationDetail>(
      `${this.path}/${encodeURIComponent(id)}.json`,
      { locale },
    );
  }
}
