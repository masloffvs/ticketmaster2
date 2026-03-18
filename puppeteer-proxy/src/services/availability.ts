import type { HTTPResponse, Page } from "puppeteer";
import { BrowserManager } from "../browser/manager.js";
import { Config } from "../core/config.js";
import { Singleton } from "../core/di/index.js";
import { Logger } from "../core/logger.js";

@Singleton()
export class AvailabilityService {
  private apiPage: Page | null = null;
  private apiPageReady = false;
  private lock: Promise<void> = Promise.resolve();

  constructor(
    private config: Config,
    private log: Logger,
    private browser: BrowserManager,
  ) {}

  async warmApiPage(): Promise<void> {
    await this.ensureApiPage();
  }

  async fetch(eventId: string): Promise<{ status: number; body: string }> {
    const prev = this.lock;
    let unlock!: () => void;
    this.lock = new Promise<void>((r) => {
      unlock = r;
    });
    await prev;

    try {
      const page = await this.ensureApiPage();
      let intercepted: { status: number; body: string } | null = null;

      const responseHandler = (response: HTTPResponse) => {
        const url = response.url();
        if (
          url.includes("availability.ticketmaster.se") &&
          url.includes(eventId)
        ) {
          response
            .text()
            .then((body) => {
              intercepted = { status: response.status(), body };
            })
            .catch(() => {});
        }
      };

      page.on("response", responseHandler);

      try {
        const eventUrl = `https://www.ticketmaster.se/event/-/${eventId}`;
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
              this.log.debug("availability nav bounce", {
                attempt: attempt + 1,
              });
              continue;
            }
            throw err;
          }
        }

        if (!intercepted) await this.sleep(3000);

        if (intercepted) {
          this.log.info("intercepted availability", {
            eventId,
            status: (intercepted as { status: number; body: string }).status,
          });
          return intercepted as { status: number; body: string };
        }

        this.log.warn("no intercept, trying browser fetch", { eventId });
        const result = await page.evaluate(async (eid: string) => {
          try {
            // @ts-ignore - fetch in page context
            const r = await fetch(
              `https://availability.ticketmaster.se/api/v2/TM_SE/availability/${eid}?subChannelId=1`,
              { credentials: "include" } as RequestInit,
            );
            return { status: r.status, body: await r.text() };
          } catch (e) {
            return {
              status: 502,
              body: JSON.stringify({ error: (e as Error).message }),
            };
          }
        }, eventId);

        return result;
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
        await this.apiPage.goto("https://www.ticketmaster.se/", {
          waitUntil: "networkidle2",
          timeout: this.config.pageTimeout,
        });
        break;
      } catch (err) {
        const msg = (err as Error).message ?? "";
        if (this.isNavBounce(msg)) {
          this.log.debug("api-page warm-up bounce", { attempt: attempt + 1 });
          await this.sleep(2000);
          continue;
        }
        throw err;
      }
    }

    this.apiPageReady = true;
    this.log.info("API page warmed on ticketmaster.se");
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
