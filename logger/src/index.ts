import pino from "pino";
import { Writable } from "stream";
import {
  ClickHouseTransport,
  type ClickHouseTransportOptions,
} from "./clickhouse-transport";

export type { ClickHouseTransportOptions } from "./clickhouse-transport";

/* ── Config ──────────────────────────────────────────────────── */

export interface LoggerOptions {
  service: string;
  env?: string;
  level?: pino.Level;
  clickhouse?: ClickHouseTransportOptions | false;
  pretty?: boolean; // force pino-pretty (dev)
}

/* ── Factory ─────────────────────────────────────────────────── */

let chTransport: ClickHouseTransport | null = null;

export function createLogger(opts: LoggerOptions): pino.Logger {
  const isDev = (opts.env ?? process.env.NODE_ENV) !== "production";
  const usePretty = opts.pretty ?? isDev;
  const level = opts.level ?? (process.env.LOG_LEVEL as pino.Level) ?? "info";

  const pinoBase = {
    service: opts.service,
    env: opts.env ?? process.env.NODE_ENV ?? "development",
  };

  // ── ClickHouse side-channel ───────────────────────────────
  const useClickHouse = opts.clickhouse !== false && opts.clickhouse;
  if (useClickHouse) {
    chTransport = new ClickHouseTransport(
      opts.clickhouse as ClickHouseTransportOptions,
    );
    chTransport.start();
  }

  // ── Pretty formatter (sync, writes to fd 1) ───────────────
  let prettyStream: Writable | null = null;
  if (usePretty) {
    try {
      const build = require("pino-pretty");
      prettyStream = build({ colorize: true, destination: 1, sync: true });
    } catch {
      // pino-pretty not available
    }
  }

  const dest = new Writable({
    write(chunk: Buffer | string, _encoding, callback) {
      const str = chunk.toString();

      // Feed raw JSON to ClickHouse
      if (chTransport) {
        try {
          chTransport.push(JSON.parse(str));
        } catch {
          // skip non-JSON
        }
      }

      // Write to stdout (pretty or raw)
      if (prettyStream) {
        prettyStream.write(str);
      } else {
        process.stdout.write(str);
      }

      callback();
    },
  });

  return pino({ level, base: pinoBase }, dest);
}

/**
 * Gracefully flush & stop the ClickHouse transport.
 * Call on SIGTERM / shutdown.
 */
export function shutdownLogger(): void {
  if (chTransport) {
    chTransport.stop();
    chTransport = null;
  }
}

/**
 * Build ClickHouse options from standard env vars.
 * Returns `false` if CLICKHOUSE_URL is not set.
 */
export function clickhouseFromEnv(): ClickHouseTransportOptions | false {
  const url = process.env.CLICKHOUSE_URL;
  if (!url) return false;

  return {
    url,
    database: process.env.CLICKHOUSE_DB ?? "logs",
    user: process.env.CLICKHOUSE_USER ?? "default",
    password: process.env.CLICKHOUSE_PASSWORD ?? "",
  };
}
