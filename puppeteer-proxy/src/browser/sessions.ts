import { Config } from "../core/config.js";
import { Singleton } from "../core/di/index.js";
import { Logger } from "../core/logger.js";
import { BrowserManager } from "./manager.js";

export interface TmSession {
  cookies: string;
  warmedAt: number;
  ready: boolean;
}

export type TmDomain = "se" | "us";

const ORIGINS: Record<TmDomain, string> = {
  se: "https://www.ticketmaster.se/",
  us: "https://www.ticketmaster.com/",
};

@Singleton()
export class SessionStore {
  private sessions: Record<TmDomain, TmSession> = {
    se: { cookies: "", warmedAt: 0, ready: false },
    us: { cookies: "", warmedAt: 0, ready: false },
  };

  constructor(
    private config: Config,
    private log: Logger,
    private browser: BrowserManager,
  ) {}

  async warm(domain: TmDomain): Promise<TmSession> {
    const url = ORIGINS[domain];
    const page = await this.browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await page.goto(url, {
            waitUntil: "networkidle2",
            timeout: this.config.pageTimeout,
          });
          break;
        } catch (err) {
          const msg = (err as Error).message ?? "";
          if (this.isNavBounce(msg)) {
            this.log.warn(`session:${domain} warm bounce`, {
              attempt: attempt + 1,
            });
            await this.sleep(2000);
            continue;
          }
          throw err;
        }
      }

      const cookies = await page.cookies();
      const cookieStr = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

      this.sessions[domain] = {
        cookies: cookieStr,
        warmedAt: Date.now(),
        ready: true,
      };
      this.log.info(`session:${domain} warmed`, {
        cookieCount: cookies.length,
      });
      return this.sessions[domain];
    } finally {
      await page.close().catch(() => {});
    }
  }

  async get(domain: TmDomain): Promise<TmSession> {
    const s = this.sessions[domain];
    if (s.ready && Date.now() - s.warmedAt < this.config.sessionTtlMs) return s;
    return this.warm(domain);
  }

  async refresh(domain: TmDomain): Promise<TmSession> {
    this.sessions[domain].ready = false;
    return this.warm(domain);
  }

  summary(): Record<
    TmDomain,
    {
      ready: boolean;
      warmedAt: number;
      age: number | null;
      cookieCount: number;
    }
  > {
    const result = {} as ReturnType<SessionStore["summary"]>;
    for (const [k, v] of Object.entries(this.sessions) as [
      TmDomain,
      TmSession,
    ][]) {
      result[k] = {
        ready: v.ready,
        warmedAt: v.warmedAt,
        age: v.warmedAt ? Date.now() - v.warmedAt : null,
        cookieCount: v.cookies
          ? v.cookies.split("; ").filter(Boolean).length
          : 0,
      };
    }
    return result;
  }

  getSessionSync(domain: TmDomain): TmSession {
    return this.sessions[domain];
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
