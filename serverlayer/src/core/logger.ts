import { Singleton } from "@/core/di";
import pino from "pino";

@Singleton()
export class Logger {
  private readonly instance: pino.Logger;

  constructor() {
    const isDev =
      Bun.env.NODE_ENV !== "production" &&
      typeof (globalThis as any).Bun?.embeddedFiles === "undefined";

    this.instance = pino({
      level: Bun.env.LOG_LEVEL ?? "info",
      transport: isDev
        ? { target: "pino-pretty", options: { colorize: true } }
        : undefined,
      base: {
        service: "ticketmaster-api",
        env: Bun.env.NODE_ENV ?? "development",
      },
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
}
