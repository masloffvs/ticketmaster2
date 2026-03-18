import type { Browser, Page } from "puppeteer";
import puppeteerExtra from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { Config } from "../core/config.js";
import { Singleton } from "../core/di/index.js";
import { Logger } from "../core/logger.js";

const puppeteer = (puppeteerExtra as any).default ?? puppeteerExtra;
puppeteer.use(StealthPlugin());

interface PoolSlot {
  page: Page;
  busy: boolean;
}

@Singleton()
export class BrowserManager {
  private browser!: Browser;
  private pool: PoolSlot[] = [];

  constructor(
    private config: Config,
    private log: Logger,
  ) {}

  async launch(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-extensions",
        "--disable-background-networking",
        "--single-process",
      ],
    });

    for (let i = 0; i < this.config.poolSize; i++) {
      const page = await this.browser.newPage();
      await page.setViewport({ width: 1280, height: 900 });
      await page.setUserAgent(this.config.ua);
      this.pool.push({ page, busy: false });
    }

    this.log.info("browser launched", { poolSize: this.config.poolSize });
  }

  get instance(): Browser {
    return this.browser;
  }

  get connected(): boolean {
    return this.browser?.connected ?? false;
  }

  get slots(): { id: number; busy: boolean }[] {
    return this.pool.map((s, i) => ({ id: i, busy: s.busy }));
  }

  get freeSlots(): number {
    return this.pool.filter((s) => !s.busy).length;
  }

  get totalSlots(): number {
    return this.pool.length;
  }

  acquire(): PoolSlot | null {
    const slot = this.pool.find((s) => !s.busy);
    if (!slot) return null;
    slot.busy = true;
    return slot;
  }

  release(slot: PoolSlot): void {
    slot.busy = false;
  }

  async newPage(): Promise<Page> {
    const page = await this.browser.newPage();
    await page.setUserAgent(this.config.ua);
    return page;
  }

  async close(): Promise<void> {
    if (this.browser) await this.browser.close();
  }
}
