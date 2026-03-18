import { BrowserManager } from "../browser/manager.js";
import { Config } from "../core/config.js";
import { Singleton } from "../core/di/index.js";
import { Logger } from "../core/logger.js";

@Singleton()
export class RendererService {
  constructor(
    private config: Config,
    private log: Logger,
    private browser: BrowserManager,
  ) {}

  async render(
    targetUrl: string,
    options: { waitForSelector?: string; waitUntil?: string } = {},
  ): Promise<{ html: string; title: string }> {
    const slot = this.browser.acquire();
    if (!slot) throw new Error("No available browser slots — pool exhausted");

    try {
      const { page } = slot;
      const waitUntil = (options.waitUntil ??
        this.config.waitUntil) as "networkidle2";
      const timeout = this.config.pageTimeout;

      let lastError: Error | undefined;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          if (attempt === 0) {
            await page.goto(targetUrl, { waitUntil, timeout });
          } else {
            await page
              .waitForNavigation({ waitUntil, timeout })
              .catch(() => {});
            await this.sleep(2000);
          }
          lastError = undefined;
          break;
        } catch (err) {
          lastError = err as Error;
          if (this.isNavBounce(lastError.message)) {
            this.log.debug("navigation bounce", {
              attempt: attempt + 1,
              url: targetUrl,
            });
            continue;
          }
          throw err;
        }
      }
      if (lastError) throw lastError;

      await this.sleep(1000);

      if (options.waitForSelector) {
        await page.waitForSelector(options.waitForSelector, {
          timeout: Math.min(timeout, 10_000),
        });
      }

      const html = await page.content();
      const title = await page.title();

      await page.goto("about:blank");
      return { html, title };
    } finally {
      this.browser.release(slot);
    }
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
