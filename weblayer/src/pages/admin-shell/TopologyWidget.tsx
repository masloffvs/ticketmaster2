import { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";

/* ── Types ───────────────────────────────────────────────────── */

interface TopologyEntry {
  eventId: string;
  fetchedAt: string;
  sizeBytes: number;
  source: string;
}

interface TopologyStats {
  count: number;
  totalBytes: number;
}

interface TopologyDetail {
  eventId: string;
  fetchedAt: string;
  sizeBytes: number;
  source: string;
  data: unknown;
}

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

const FetchBtn = styled.button`
  height: 28px;
  border: none;
  outline: none;
  border-radius: 6px;
  background: #1a3a1a;
  color: rgba(100, 255, 100, 0.8);
  padding: 0 14px;
  font: inherit;
  font-size: 0.72rem;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: #1f4f1f;
    color: rgba(100, 255, 100, 1);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

/* ── Table ───────────────────────────────────────────────────── */

const TableWrap = styled.div`
  flex: 1;
  overflow-y: auto;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.04);
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.74rem;

  th,
  td {
    text-align: left;
    padding: 6px 10px;
    white-space: nowrap;
  }

  th {
    position: sticky;
    top: 0;
    background: #111;
    color: rgba(255, 255, 255, 0.4);
    font-size: 0.64rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    z-index: 1;
  }

  tr:hover td {
    background: rgba(255, 255, 255, 0.02);
  }
`;

const Td = styled.td`
  color: rgba(255, 255, 255, 0.72);
  border-bottom: 1px solid rgba(255, 255, 255, 0.025);
`;

const TdMono = styled(Td)`
  font-family: "SF Mono", "Fira Code", Consolas, monospace;
  font-size: 0.68rem;
`;

const TdSource = styled(Td)`
  color: rgba(255, 255, 255, 0.35);
`;

const ViewBtn = styled.button`
  border: none;
  outline: none;
  background: rgba(59, 130, 246, 0.12);
  color: #60a5fa;
  border-radius: 4px;
  padding: 2px 10px;
  font: inherit;
  font-size: 0.66rem;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: rgba(59, 130, 246, 0.2);
  }
`;

/* ── Detail overlay ──────────────────────────────────────────── */

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const DetailPanel = styled.div`
  width: min(960px, 90vw);
  max-height: 85vh;
  background: #0e0e0e;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const DetailHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
`;

const DetailTitle = styled.div`
  font-size: 0.82rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.88);
`;

const DetailMeta = styled.div`
  font-size: 0.66rem;
  color: rgba(255, 255, 255, 0.35);
`;

const DetailClose = styled.button`
  border: none;
  outline: none;
  background: #1a1a1a;
  color: rgba(255, 255, 255, 0.6);
  border-radius: 6px;
  padding: 4px 12px;
  font: inherit;
  font-size: 0.72rem;
  cursor: pointer;

  &:hover {
    background: #222;
    color: rgba(255, 255, 255, 0.85);
  }
`;

const DetailBody = styled.pre`
  flex: 1;
  overflow: auto;
  padding: 14px 18px;
  margin: 0;
  font-family: "SF Mono", "Fira Code", Consolas, monospace;
  font-size: 0.66rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.7);
  white-space: pre-wrap;
  word-break: break-all;
`;

const EmptyState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: rgba(255, 255, 255, 0.2);
  font-size: 0.78rem;
`;

/* ── Helpers ─────────────────────────────────────────────────── */

function fmtBytes(n: number): string {
  if (n >= 1_048_576) return `${(n / 1_048_576).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-GB", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

function fmtAge(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${(ms / 3_600_000).toFixed(1)}h ago`;
  return `${(ms / 86_400_000).toFixed(1)}d ago`;
}

/* ── Component ───────────────────────────────────────────────── */

const API = "/api/worker";

export const TopologyWidget = () => {
  const [entries, setEntries] = useState<TopologyEntry[]>([]);
  const [stats, setStats] = useState<TopologyStats | null>(null);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<TopologyDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [fetchId, setFetchId] = useState("");
  const [fetching, setFetching] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);
  const [live, setLive] = useState(true);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/topology?limit=200`);
      if (!res.ok) return;
      const json: TopologyEntry[] = await res.json();
      setEntries(json);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API}/topology/stats`);
      if (!res.ok) return;
      const json: TopologyStats = await res.json();
      setStats(json);
    } catch {
      // silent
    }
  }, []);

  const loadDetail = async (eventId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`${API}/topology/${encodeURIComponent(eventId)}`);
      if (!res.ok) {
        setDetail(null);
        return;
      }
      const json: TopologyDetail = await res.json();
      setDetail(json);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const triggerFetch = async () => {
    const id = fetchId.trim();
    if (!id) return;
    setFetching(true);
    try {
      const res = await fetch(`${API}/topology/fetch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: id }),
      });
      if (res.ok) {
        setFetchId("");
        fetchList();
        fetchStats();
      }
    } catch {
      // silent
    } finally {
      setFetching(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchList();
    fetchStats();
  }, [fetchList, fetchStats]);

  // Live polling
  useEffect(() => {
    if (live) {
      intervalRef.current = setInterval(() => {
        fetchList();
        fetchStats();
      }, 5000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [live, fetchList, fetchStats]);

  // Close overlay on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDetail(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const filtered = filter
    ? entries.filter((e) =>
        e.eventId.toLowerCase().includes(filter.toLowerCase()),
      )
    : entries;

  return (
    <Wrap>
      {/* ── Stats cards ─────── */}
      <StatsRow>
        <StatCard>
          <StatLabel>Cached topologies</StatLabel>
          <StatValue>{stats ? fmtNum(stats.count) : "—"}</StatValue>
          <StatSub>in MongoDB</StatSub>
        </StatCard>
        <StatCard>
          <StatLabel>Total size</StatLabel>
          <StatValue>{stats ? fmtBytes(stats.totalBytes) : "—"}</StatValue>
          <StatSub>BSON storage</StatSub>
        </StatCard>
        <StatCard>
          <StatLabel>Avg size</StatLabel>
          <StatValue>
            {stats && stats.count > 0
              ? fmtBytes(Math.round(stats.totalBytes / stats.count))
              : "—"}
          </StatValue>
          <StatSub>per topology</StatSub>
        </StatCard>
        <StatCard>
          <StatLabel>Source</StatLabel>
          <StatValue style={{ fontSize: "0.82rem" }}>mapsapi.tmol.io</StatValue>
          <StatSub>TM Maps API</StatSub>
        </StatCard>
      </StatsRow>

      {/* ── Controls ─────── */}
      <Controls>
        <FilterInput
          placeholder="Filter by Event ID…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <FilterInput
          placeholder="Fetch eventId…"
          value={fetchId}
          onChange={(e) => setFetchId(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") triggerFetch();
          }}
          style={{ maxWidth: 220 }}
        />
        <FetchBtn onClick={triggerFetch} disabled={fetching || !fetchId.trim()}>
          {fetching ? "Fetching…" : "Fetch"}
        </FetchBtn>
        <Badge>{loading ? "loading…" : `${filtered.length} entries`}</Badge>
        <RefreshBtn
          onClick={() => {
            setLive((p) => !p);
          }}
          style={{
            background: live ? "rgba(34,197,94,0.12)" : undefined,
            color: live ? "#4ade80" : undefined,
          }}
        >
          {live ? "● Live" : "Live"}
        </RefreshBtn>
        <RefreshBtn
          onClick={() => {
            fetchList();
            fetchStats();
          }}
        >
          ↻ Refresh
        </RefreshBtn>
      </Controls>

      {/* ── Table ─────── */}
      <TableWrap>
        {filtered.length === 0 ? (
          <EmptyState>
            {loading ? "Loading…" : "No topologies cached yet"}
          </EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Event ID</th>
                <th>Fetched</th>
                <th>Age</th>
                <th style={{ textAlign: "right" }}>Size</th>
                <th>Source</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => (
                <tr key={entry.eventId}>
                  <TdMono>{entry.eventId}</TdMono>
                  <Td>{fmtTime(entry.fetchedAt)}</Td>
                  <Td>{fmtAge(entry.fetchedAt)}</Td>
                  <Td style={{ textAlign: "right" }}>
                    {fmtBytes(entry.sizeBytes)}
                  </Td>
                  <TdSource>{entry.source}</TdSource>
                  <Td>
                    <ViewBtn onClick={() => loadDetail(entry.eventId)}>
                      View JSON
                    </ViewBtn>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </TableWrap>

      {/* ── Detail overlay ─────── */}
      {(detail || detailLoading) && (
        <Overlay onClick={() => setDetail(null)}>
          <DetailPanel onClick={(e) => e.stopPropagation()}>
            <DetailHeader>
              <div>
                <DetailTitle>
                  {detailLoading ? "Loading…" : `Topology: ${detail?.eventId}`}
                </DetailTitle>
                {detail && (
                  <DetailMeta>
                    {fmtTime(detail.fetchedAt)} · {fmtBytes(detail.sizeBytes)} ·{" "}
                    {detail.source}
                  </DetailMeta>
                )}
              </div>
              <DetailClose onClick={() => setDetail(null)}>Close</DetailClose>
            </DetailHeader>
            <DetailBody>
              {detailLoading
                ? "Loading topology data…"
                : JSON.stringify(detail?.data, null, 2)}
            </DetailBody>
          </DetailPanel>
        </Overlay>
      )}
    </Wrap>
  );
};
