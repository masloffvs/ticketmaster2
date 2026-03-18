import type { HTTPResponse, Page } from "puppeteer";
import { BrowserManager } from "../browser/manager.js";
import { Config } from "../core/config.js";
import { Singleton } from "../core/di/index.js";
import { Logger } from "../core/logger.js";

const ALLOWED_ENDPOINTS = ["facets", "quickpicks"] as const;
export type IsmdsEndpoint = (typeof ALLOWED_ENDPOINTS)[number];

export function isValidEndpoint(v: string): v is IsmdsEndpoint {
  return (ALLOWED_ENDPOINTS as readonly string[]).includes(v);
}

@Singleton()
export class IsmdsService {
  private apiPage: Page | null = null;
  private apiPageReady = false;
  private lock: Promise<void> = Promise.resolve();
  // Short-lived cache: one navigation captures all endpoints
  private cache = new Map<
    string,
    { ts: number; status: number; body: string }
  >();
  private static CACHE_TTL = 60_000; // 60s

  constructor(
    private config: Config,
    private log: Logger,
    private browser: BrowserManager,
  ) {}

  async warmApiPage(): Promise<void> {
    await this.ensureApiPage();
  }

  async fetch(
    eventId: string,
    endpoint: IsmdsEndpoint,
  ): Promise<{ status: number; body: string }> {
    // Check short-lived cache first (populated by previous navigation)
    const cacheKey = `${eventId}:${endpoint}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < IsmdsService.CACHE_TTL) {
      this.log.info("ismds cache hit", { eventId, endpoint });
      return { status: cached.status, body: cached.body };
    }

    const prev = this.lock;
    let unlock!: () => void;
    this.lock = new Promise<void>((r) => {
      unlock = r;
    });
    await prev;

    try {
      const page = await this.ensureApiPage();
      const intercepted: Record<string, { status: number; body: string }> = {};

      const responseHandler = (response: HTTPResponse) => {
        const url = response.url();
        if (!url.includes("services.ticketmaster.com/api/ismds/event/")) return;
        if (!url.includes(eventId)) return;

        for (const ep of ALLOWED_ENDPOINTS) {
          if (url.includes(`/${ep}`)) {
            const status = response.status();
            // Only capture 200 responses with body (skip 204, 304, etc.)
            if (status !== 200) return;
            response
              .text()
              .then((body) => {
                if (body && body.length > 2) {
                  intercepted[ep] = { status, body };
                }
              })
              .catch(() => {});
          }
        }
      };

      page.on("response", responseHandler);

      try {
        const eventUrl = `https://www.ticketmaster.com/event/${eventId}`;
        this.log.info("ismds navigating to event page", { eventId, endpoint });

        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            if (attempt === 0) {
              await page.goto(eventUrl, {
                waitUntil: "networkidle2",
                timeout: this.config.pageTimeout,
              });
            } else {
              await page
                .waitForNavigation({
                  waitUntil: "networkidle2",
                  timeout: this.config.pageTimeout,
                })
                .catch(() => {});
              await this.sleep(2000);
            }
            break;
          } catch (err) {
            const msg = (err as Error).message ?? "";
            if (this.isNavBounce(msg)) {
              this.log.debug("ismds nav bounce", { attempt: attempt + 1 });
              continue;
            }
            throw err;
          }
        }

        // Wait extra time for async ISMDS calls to complete
        if (!intercepted[endpoint]) await this.sleep(5000);

        if (intercepted[endpoint]) {
          // Cache ALL intercepted endpoints (not just the requested one)
          const now = Date.now();
          for (const [ep, result] of Object.entries(intercepted)) {
            this.cache.set(`${eventId}:${ep}`, { ts: now, ...result });
          }

          this.log.info("intercepted ismds", {
            eventId,
            endpoint,
            status: intercepted[endpoint].status,
            captured: Object.keys(intercepted),
          });
          return intercepted[endpoint];
        }

        this.log.warn("ismds not intercepted", {
          eventId,
          endpoint,
          captured: Object.keys(intercepted),
        });
        return {
          status: 404,
          body: JSON.stringify({
            error: `ISMDS ${endpoint} response not intercepted from event page`,
            captured: Object.keys(intercepted),
          }),
        };
      } finally {
        page.off("response", responseHandler);
        this.apiPageReady = false;
      }
    } finally {
      unlock();
    }
  }

  private async ensureApiPage(): Promise<Page> {
    if (this.apiPage && !this.apiPage.isClosed() && this.apiPageReady) {
      return this.apiPage;
    }

    if (this.apiPage && !this.apiPage.isClosed()) {
      await this.apiPage.close().catch(() => {});
    }

    this.apiPage = await this.browser.newPage();
    await this.apiPage.setViewport({ width: 1280, height: 900 });

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await this.apiPage.goto("https://www.ticketmaster.com/", {
          waitUntil: "networkidle2",
          timeout: this.config.pageTimeout,
        });
        break;
      } catch (err) {
        const msg = (err as Error).message ?? "";
        if (this.isNavBounce(msg)) {
          this.log.debug("ismds api-page warm-up bounce", {
            attempt: attempt + 1,
          });
          await this.sleep(2000);
          continue;
        }
        throw err;
      }
    }

    this.apiPageReady = true;
    this.log.info("ISMDS API page warmed on ticketmaster.com");
    return this.apiPage;
  }

  private isNavBounce(msg: string): boolean {
    return (
      msg.includes("Execution context was destroyed") ||
      msg.includes("frame was detached") ||
      msg.includes("navigation")
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
