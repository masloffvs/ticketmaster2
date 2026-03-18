import { Singleton } from "@/core/di";
import {
  clickhouseFromEnv,
  createLogger,
  shutdownLogger,
} from "@ticketmaster/logger";
import type pino from "pino";

@Singleton()
export class Logger {
  private readonly instance: pino.Logger;

  constructor() {
    this.instance = createLogger({
      service: "ticketmaster-api",
      env: Bun.env.NODE_ENV,
      level: (Bun.env.LOG_LEVEL as pino.Level) ?? "info",
      clickhouse: clickhouseFromEnv(),
      pretty:
        Bun.env.NODE_ENV !== "production" &&
        typeof (globalThis as any).Bun?.embeddedFiles === "undefined",
    });
  }

  info(msg: string, obj?: object) {
    obj ? this.instance.info(obj, msg) : this.instance.info(msg);
  }

  error(msg: string, obj?: object) {
    obj ? this.instance.error(obj, msg) : this.instance.error(msg);
  }

  warn(msg: string, obj?: object) {
    obj ? this.instance.warn(obj, msg) : this.instance.warn(msg);
  }

  debug(msg: string, obj?: object) {
    obj ? this.instance.debug(obj, msg) : this.instance.debug(msg);
  }

  child(bindings: pino.Bindings): pino.Logger {
    return this.instance.child(bindings);
  }

  get raw(): pino.Logger {
    return this.instance;
  }

  shutdown(): void {
    shutdownLogger();
  }
}
