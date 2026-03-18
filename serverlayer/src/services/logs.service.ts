import { Config } from "@/core/config";
import { Inject, Singleton } from "@/core/di";
import { Logger } from "@/core/logger";

export interface LogRow {
  timestamp: string;
  level: string;
  service: string;
  env: string;
  msg: string;
  data: string;
}

export interface LogsQuery {
  limit?: number;
  offset?: number;
  level?: string;
  service?: string;
  search?: string;
  from?: string;
  to?: string;
}

export interface LogsResult {
  rows: LogRow[];
  total: number;
}

export interface LogStats {
  totalRows: number;
  byLevel: Record<string, number>;
  byService: Record<string, number>;
  oldestEntry: string | null;
  newestEntry: string | null;
}

@Singleton()
export class LogsService {
  constructor(
    @Inject(Config) private config: Config,
    @Inject(Logger) private logger: Logger,
  ) {}

  private async query(sql: string): Promise<string> {
    const { url, database, user, password } = this.config.clickhouse;
    const params = new URLSearchParams({
      database,
      query: sql,
      user,
      password,
      default_format: "JSONEachRow",
    });
    const res = await fetch(`${url}/?${params}`, { method: "POST" });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `ClickHouse query failed ${res.status}: ${text.slice(0, 300)}`,
      );
    }
    return res.text();
  }

  private parseRows<T>(raw: string): T[] {
    return raw
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as T);
  }

  private static readonly VALID_LEVELS = new Set([
    "trace",
    "debug",
    "info",
    "warn",
    "error",
    "fatal",
  ]);

  async getLogs(q: LogsQuery): Promise<LogsResult> {
    const { table } = this.config.clickhouse;
    const limit = Math.min(q.limit ?? 100, 500);
    const offset = Math.max(q.offset ?? 0, 0);

    const whereClauses: string[] = [];
    if (q.level && LogsService.VALID_LEVELS.has(q.level)) {
      whereClauses.push(`level = '${q.level}'`);
    }
    if (q.service) {
      whereClauses.push(`service = '${this.esc(q.service)}'`);
    }
    if (q.search) {
      whereClauses.push(`msg ILIKE '%${this.esc(q.search)}%'`);
    }
    if (q.from) {
      whereClauses.push(`timestamp >= '${this.esc(q.from)}'`);
    }
    if (q.to) {
      whereClauses.push(`timestamp <= '${this.esc(q.to)}'`);
    }

    const where =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Count
    const countRaw = await this.query(
      `SELECT count() as cnt FROM ${table} ${where} FORMAT JSONEachRow`,
    );
    const countRows = this.parseRows<{ cnt: string }>(countRaw);
    const total = Number(countRows[0]?.cnt ?? 0);

    // Rows
    const rowsRaw = await this.query(
      `SELECT timestamp, level, service, env, msg, data FROM ${table} ${where} ORDER BY timestamp DESC LIMIT ${limit} OFFSET ${offset} FORMAT JSONEachRow`,
    );
    const rows = total > 0 ? this.parseRows<LogRow>(rowsRaw) : [];

    return { rows, total };
  }

  async getStats(): Promise<LogStats> {
    const { table } = this.config.clickhouse;

    const raw = await this.query(
      `SELECT
         count() as totalRows,
         min(timestamp) as oldest,
         max(timestamp) as newest
       FROM ${table}
       FORMAT JSONEachRow`,
    );
    const agg = this.parseRows<{
      totalRows: string;
      oldest: string;
      newest: string;
    }>(raw);
    const a = agg[0];

    const levelRaw = await this.query(
      `SELECT level, count() as cnt FROM ${table} GROUP BY level FORMAT JSONEachRow`,
    );
    const levelRows = this.parseRows<{ level: string; cnt: string }>(levelRaw);
    const byLevel: Record<string, number> = {};
    for (const r of levelRows) byLevel[r.level] = Number(r.cnt);

    const serviceRaw = await this.query(
      `SELECT service, count() as cnt FROM ${table} GROUP BY service FORMAT JSONEachRow`,
    );
    const serviceRows = this.parseRows<{ service: string; cnt: string }>(
      serviceRaw,
    );
    const byService: Record<string, number> = {};
    for (const r of serviceRows) byService[r.service] = Number(r.cnt);

    return {
      totalRows: Number(a?.totalRows ?? 0),
      byLevel,
      byService,
      oldestEntry: a?.oldest ?? null,
      newestEntry: a?.newest ?? null,
    };
  }

  async getServices(): Promise<string[]> {
    const { table } = this.config.clickhouse;
    const raw = await this.query(
      `SELECT DISTINCT service FROM ${table} ORDER BY service FORMAT JSONEachRow`,
    );
    return this.parseRows<{ service: string }>(raw).map((r) => r.service);
  }

  /** Escape for ClickHouse string literals */
  private esc(s: string): string {
    return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  }
}
