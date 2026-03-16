import type { TicketmasterApiError, TicketmasterConfig } from "./types";

const DEFAULT_BASE_URL = "https://app.ticketmaster.com";

export class TicketmasterError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: TicketmasterApiError | null,
  ) {
    super(message);
    this.name = "TicketmasterError";
  }
}

export class HttpClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: TicketmasterConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  }

  async get<T>(path: string, params: Record<string, unknown> = {}): Promise<T> {
    const url = this.buildUrl(path, params);
    const response = await fetch(url.toString());
    return this.handleResponse<T>(response);
  }

  private buildUrl(path: string, params: Record<string, unknown>): URL {
    const url = new URL(`${this.baseUrl}${path}`);
    url.searchParams.set("apikey", this.apiKey);

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }

    return url;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let body: TicketmasterApiError | null = null;
      try {
        body = (await response.json()) as TicketmasterApiError;
      } catch {
        // response body not parseable
      }

      const message =
        body?.fault?.faultstring ??
        body?.errors?.[0]?.detail ??
        `HTTP ${response.status}: ${response.statusText}`;

      throw new TicketmasterError(message, response.status, body);
    }

    return (await response.json()) as T;
  }
}
