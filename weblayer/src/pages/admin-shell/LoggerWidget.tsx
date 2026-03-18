import { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";

/* ── Types ───────────────────────────────────────────────────── */

interface LogRow {
  timestamp: string;
  level: string;
  service: string;
  env: string;
  msg: string;
  data: string;
}

interface LogStats {
  totalRows: number;
  byLevel: Record<string, number>;
  byService: Record<string, number>;
  oldestEntry: string | null;
  newestEntry: string | null;
}

interface LogsResult {
  rows: LogRow[];
  total: number;
}

/* ── Palette ─────────────────────────────────────────────────── */

const LEVEL_COLORS: Record<string, string> = {
  trace: "#6b7280",
  debug: "#8b5cf6",
  info: "#3b82f6",
  warn: "#f59e0b",
  error: "#ef4444",
  fatal: "#dc2626",
};

const SERVICE_COLORS: Record<string, string> = {
  "ticketmaster-api": "#22c55e",
  workerslayer: "#f97316",
};

/* ── Styled ──────────────────────────────────────────────────── */

const Wrap = styled.div`
  padding: 8px 4px;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 120px);
`;

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 8px;
  margin-bottom: 12px;
`;

const StatCard = styled.div`
  border-radius: 8px;
  background: #111;
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 10px 14px;
`;

const StatLabel = styled.div`
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.35);
  margin-bottom: 4px;
`;

const StatValue = styled.div`
  font-size: 1.3rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: #f4f4f4;
  font-variant-numeric: tabular-nums;
`;

const StatSub = styled.div`
  font-size: 0.68rem;
  color: rgba(255, 255, 255, 0.25);
  margin-top: 2px;
`;

/* ── Level distribution bar ──────────────────────────────────── */

const LevelBar = styled.div`
  display: flex;
  height: 6px;
  border-radius: 3px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.04);
  margin-bottom: 4px;
`;

const LevelSlice = styled.div<{ $pct: number; $color: string }>`
  height: 100%;
  width: ${(p) => p.$pct}%;
  background: ${(p) => p.$color};
  min-width: ${(p) => (p.$pct > 0 ? 2 : 0)}px;
`;

const LevelLegend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  margin-bottom: 12px;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.68rem;
  color: rgba(255, 255, 255, 0.5);
`;

const LegendDot = styled.span<{ $color: string }>`
  width: 7px;
  height: 7px;
  border-radius: 2px;
  background: ${(p) => p.$color};
`;

/* ── Controls ────────────────────────────────────────────────── */

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
`;

const FilterInput = styled.input`
  height: 28px;
  border: none;
  outline: none;
  border-radius: 6px;
  background: #121212;
  color: rgba(255, 255, 255, 0.88);
  padding: 0 10px;
  font: inherit;
  font-size: 0.76rem;
  flex: 1;
  min-width: 140px;
  max-width: 280px;

  &::placeholder {
    color: rgba(255, 255, 255, 0.28);
  }
`;

const Select = styled.select`
  height: 28px;
  border: none;
  outline: none;
  border-radius: 6px;
  background: #121212;
  color: rgba(255, 255, 255, 0.88);
  padding: 0 8px;
  font: inherit;
  font-size: 0.72rem;
  cursor: pointer;
  min-width: 90px;

  option {
    background: #121212;
    color: rgba(255, 255, 255, 0.88);
  }
`;

const Badge = styled.span`
  font-size: 0.66rem;
  color: rgba(255, 255, 255, 0.35);
  font-variant-numeric: tabular-nums;
  margin-left: auto;
`;

const RefreshBtn = styled.button`
  height: 28px;
  border: none;
  outline: none;
  border-radius: 6px;
  background: #1a1a1a;
  color: rgba(255, 255, 255, 0.6);
  padding: 0 12px;
  font: inherit;
  font-size: 0.72rem;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: #222;
    color: rgba(255, 255, 255, 0.85);
  }
`;

const LiveToggle = styled.button<{ $active: boolean }>`
  height: 28px;
  border: none;
  outline: none;
  border-radius: 6px;
  background: ${(p) => (p.$active ? "rgba(34,197,94,0.15)" : "#1a1a1a")};
  color: ${(p) => (p.$active ? "#22c55e" : "rgba(255,255,255,0.5)")};
  padding: 0 12px;
  font: inherit;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;

  &:hover {
    background: ${(p) => (p.$active ? "rgba(34,197,94,0.22)" : "#222")};
  }
`;

const Dot = styled.span<{ $color: string }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${(p) => p.$color};
`;

/* ── Log table ───────────────────────────────────────────────── */

const TableWrap = styled.div`
  flex: 1;
  overflow-y: auto;
  border-radius: 8px;
  background: #0d0d0d;
  border: 1px solid rgba(255, 255, 255, 0.04);
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.74rem;
`;

const Th = styled.th`
  text-align: left;
  color: rgba(255, 255, 255, 0.3);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 6px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  position: sticky;
  top: 0;
  background: #0d0d0d;
  z-index: 1;
`;

const Td = styled.td`
  padding: 4px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.025);
  color: rgba(255, 255, 255, 0.6);
  font-variant-numeric: tabular-nums;
  vertical-align: top;
`;

const LevelBadge = styled.span<{ $color: string }>`
  display: inline-block;
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${(p) => p.$color};
  background: ${(p) => `${p.$color}18`};
  padding: 1px 6px;
  border-radius: 3px;
`;

const ServiceBadge = styled.span<{ $color: string }>`
  display: inline-block;
  font-size: 0.62rem;
  font-weight: 600;
  color: ${(p) => p.$color};
  background: ${(p) => `${p.$color}12`};
  padding: 1px 6px;
  border-radius: 3px;
`;

const MsgCell = styled.div`
  max-width: 500px;
  word-break: break-word;
  white-space: pre-wrap;
`;

const DataToggle = styled.button`
  border: none;
  background: none;
  color: rgba(255, 255, 255, 0.3);
  font-size: 0.64rem;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  text-decoration-style: dotted;

  &:hover {
    color: rgba(255, 255, 255, 0.6);
  }
`;

const DataPre = styled.pre`
  font-size: 0.68rem;
  color: rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.03);
  border-radius: 4px;
  padding: 6px 8px;
  margin: 4px 0 0;
  max-height: 200px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
`;

/* ── Pagination ──────────────────────────────────────────────── */

const Pagination = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 0 0;
`;

const PageBtn = styled.button<{ $disabled?: boolean }>`
  height: 26px;
  border: none;
  outline: none;
  border-radius: 5px;
  background: ${(p) => (p.$disabled ? "#0d0d0d" : "#1a1a1a")};
  color: ${(p) =>
    p.$disabled ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)"};
  padding: 0 12px;
  font: inherit;
  font-size: 0.72rem;
  cursor: ${(p) => (p.$disabled ? "default" : "pointer")};
  pointer-events: ${(p) => (p.$disabled ? "none" : "auto")};

  &:hover {
    background: ${(p) => (p.$disabled ? "#0d0d0d" : "#222")};
  }
`;

const PageInfo = styled.span`
  font-size: 0.68rem;
  color: rgba(255, 255, 255, 0.35);
  font-variant-numeric: tabular-nums;
`;

const EmptyState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: rgba(255, 255, 255, 0.25);
  font-size: 0.82rem;
`;

/* ── Helpers ─────────────────────────────────────────────────── */

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtTime(iso: string): string {
  try {
    const d = new Date(iso);
    const opts = {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    } as const;
    return d.toLocaleTimeString(
      "en-GB",
      opts as unknown as Intl.DateTimeFormatOptions,
    );
  } catch {
    return iso;
  }
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-GB", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function prettyJson(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    if (Object.keys(parsed).length === 0) return "";
    return JSON.stringify(parsed, null, 2);
  } catch {
    return raw;
  }
}

/* ── Expandable data row ─────────────────────────────────────── */

function DataCell({ data }: { data: string }) {
  const [open, setOpen] = useState(false);
  const pretty = prettyJson(data);
  if (!pretty) return null;

  return (
    <div>
      <DataToggle onClick={() => setOpen((o) => !o)}>
        {open ? "hide" : "data"}
      </DataToggle>
      {open && <DataPre>{pretty}</DataPre>}
    </div>
  );
}

/* ── Component ───────────────────────────────────────────────── */

const PAGE_SIZE = 80;

export const LoggerWidget = () => {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("");
  const [service, setService] = useState("");
  const [services, setServices] = useState<string[]>([]);
  const [live, setLive] = useState(true);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(page * PAGE_SIZE));
      if (level) params.set("level", level);
      if (service) params.set("service", service);
      if (search) params.set("search", search);

      const res = await fetch(`/api/logs?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: LogsResult = await res.json();
      setLogs(json.rows);
      setTotal(json.total);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [page, level, service, search]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/logs/stats");
      if (!res.ok) return;
      const json: LogStats = await res.json();
      setStats(json);
    } catch {
      // silent
    }
  }, []);

  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch("/api/logs/services");
      if (!res.ok) return;
      const json: string[] = await res.json();
      setServices(json);
    } catch {
      // silent
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchLogs();
    fetchStats();
    fetchServices();
  }, [fetchLogs, fetchStats, fetchServices]);

  // Live polling
  useEffect(() => {
    if (live) {
      intervalRef.current = setInterval(() => {
        fetchLogs();
        fetchStats();
      }, 3000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [live, fetchLogs, fetchStats]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Level distribution bar
  const levelTotal = stats
    ? Object.values(stats.byLevel).reduce((s, v) => s + v, 0)
    : 0;
  const levelEntries = stats
    ? Object.entries(stats.byLevel).sort(
        (a, b) =>
          (["trace", "debug", "info", "warn", "error", "fatal"].indexOf(a[0]) ??
            99) -
          (["trace", "debug", "info", "warn", "error", "fatal"].indexOf(b[0]) ??
            99),
      )
    : [];

  return (
    <Wrap>
      {/* ── Stats cards ─────── */}
      <StatsRow>
        <StatCard>
          <StatLabel>Total Logs</StatLabel>
          <StatValue>{stats ? fmtNum(stats.totalRows) : "—"}</StatValue>
          <StatSub>in ClickHouse</StatSub>
        </StatCard>
        <StatCard>
          <StatLabel>Services</StatLabel>
          <StatValue>
            {stats ? Object.keys(stats.byService).length : "—"}
          </StatValue>
          <StatSub>emitting logs</StatSub>
        </StatCard>
        <StatCard>
          <StatLabel>Oldest</StatLabel>
          <StatValue style={{ fontSize: "0.88rem" }}>
            {fmtDate(stats?.oldestEntry ?? null)}
          </StatValue>
          <StatSub>first entry</StatSub>
        </StatCard>
        <StatCard>
          <StatLabel>Newest</StatLabel>
          <StatValue style={{ fontSize: "0.88rem" }}>
            {fmtDate(stats?.newestEntry ?? null)}
          </StatValue>
          <StatSub>last entry</StatSub>
        </StatCard>
      </StatsRow>

      {/* ── Level distribution ─────── */}
      {levelTotal > 0 && (
        <>
          <LevelBar>
            {levelEntries.map(([lvl, cnt]) => (
              <LevelSlice
                key={lvl}
                $pct={(cnt / levelTotal) * 100}
                $color={LEVEL_COLORS[lvl] ?? "#555"}
                title={`${lvl}: ${fmtNum(cnt)}`}
              />
            ))}
          </LevelBar>
          <LevelLegend>
            {levelEntries.map(([lvl, cnt]) => (
              <LegendItem key={lvl}>
                <LegendDot $color={LEVEL_COLORS[lvl] ?? "#555"} />
                {lvl} ({fmtNum(cnt)})
              </LegendItem>
            ))}
          </LevelLegend>
        </>
      )}

      {/* ── Controls ─────── */}
      <Controls>
        <FilterInput
          placeholder="Search messages…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
        />
        <Select
          value={level}
          onChange={(e) => {
            setLevel(e.target.value);
            setPage(0);
          }}
        >
          <option value="">All levels</option>
          {["trace", "debug", "info", "warn", "error", "fatal"].map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </Select>
        <Select
          value={service}
          onChange={(e) => {
            setService(e.target.value);
            setPage(0);
          }}
        >
          <option value="">All services</option>
          {services.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <LiveToggle $active={live} onClick={() => setLive((v) => !v)}>
          <Dot $color={live ? "#22c55e" : "#6b7280"} />
          {live ? "Live" : "Paused"}
        </LiveToggle>
        <RefreshBtn onClick={fetchLogs}>Refresh</RefreshBtn>
        <Badge>{loading ? "loading…" : `${fmtNum(total)} results`}</Badge>
      </Controls>

      {/* ── Log table ─────── */}
      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th style={{ width: 80 }}>Time</Th>
              <Th style={{ width: 60 }}>Level</Th>
              <Th style={{ width: 110 }}>Service</Th>
              <Th>Message</Th>
              <Th style={{ width: 50 }}>Data</Th>
            </tr>
          </thead>
          <tbody>
            {logs.map((row, i) => (
              <tr key={`${row.timestamp}-${i}`}>
                <Td
                  style={{
                    fontSize: "0.68rem",
                    color: "rgba(255,255,255,0.35)",
                  }}
                >
                  {fmtTime(row.timestamp)}
                </Td>
                <Td>
                  <LevelBadge $color={LEVEL_COLORS[row.level] ?? "#6b7280"}>
                    {row.level}
                  </LevelBadge>
                </Td>
                <Td>
                  <ServiceBadge
                    $color={SERVICE_COLORS[row.service] ?? "#6b7280"}
                  >
                    {row.service}
                  </ServiceBadge>
                </Td>
                <Td>
                  <MsgCell>{row.msg}</MsgCell>
                </Td>
                <Td>
                  <DataCell data={row.data} />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
        {logs.length === 0 && !loading && (
          <EmptyState>No logs found</EmptyState>
        )}
      </TableWrap>

      {/* ── Pagination ─────── */}
      {totalPages > 1 && (
        <Pagination>
          <PageBtn $disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            ← Prev
          </PageBtn>
          <PageInfo>
            {page + 1} / {totalPages}
          </PageInfo>
          <PageBtn
            $disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </PageBtn>
        </Pagination>
      )}
    </Wrap>
  );
};
