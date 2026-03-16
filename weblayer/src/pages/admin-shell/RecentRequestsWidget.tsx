import { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";

interface RecentRequest {
  t: number;
  m: string;
  p: string;
  s: number;
  sz: number;
  rt: number;
}

const Wrap = styled.div`
  padding: 8px 4px;
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
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
  max-width: 320px;

  &::placeholder {
    color: rgba(255, 255, 255, 0.28);
  }
`;

const Badge = styled.span`
  font-size: 0.66rem;
  color: rgba(255, 255, 255, 0.35);
  font-variant-numeric: tabular-nums;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.76rem;
`;

const Th = styled.th`
  text-align: left;
  color: rgba(255, 255, 255, 0.3);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 6px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  position: sticky;
  top: 0;
  background: #0a0a0a;

  &:last-child {
    text-align: right;
  }
`;

const Td = styled.td`
  padding: 5px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.6);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;

  &:last-child {
    text-align: right;
  }
`;

const PathCell = styled(Td)`
  white-space: normal;
  word-break: break-all;
  max-width: 400px;
  color: rgba(255, 255, 255, 0.75);
`;

const MethodBadge = styled.span<{ $m: string }>`
  display: inline-block;
  min-width: 36px;
  text-align: center;
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 0.64rem;
  font-weight: 700;
  background: ${(p) => {
    if (p.$m === "GET") return "rgba(34,197,94,0.12)";
    if (p.$m === "POST") return "rgba(59,130,246,0.12)";
    if (p.$m === "PUT" || p.$m === "PATCH") return "rgba(234,179,8,0.12)";
    if (p.$m === "DELETE") return "rgba(239,68,68,0.12)";
    return "rgba(255,255,255,0.06)";
  }};
  color: ${(p) => {
    if (p.$m === "GET") return "#22c55e";
    if (p.$m === "POST") return "#3b82f6";
    if (p.$m === "PUT" || p.$m === "PATCH") return "#eab308";
    if (p.$m === "DELETE") return "#ef4444";
    return "rgba(255,255,255,0.5)";
  }};
`;

const StatusCode = styled.span<{ $s: number }>`
  color: ${(p) => {
    if (p.$s >= 500) return "#ef4444";
    if (p.$s >= 400) return "#f97316";
    if (p.$s >= 300) return "#eab308";
    return "#22c55e";
  }};
`;

const ScrollWrap = styled.div`
  max-height: calc(100vh - 200px);
  overflow-y: auto;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.04);
`;

const StatusDot = styled.span<{ $live: boolean }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${(p) => (p.$live ? "#22c55e" : "#ef4444")};
  display: inline-block;
`;

const StatusRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 10px;
`;

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / 1024 ** i;
  return `${val.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function formatTime(ms: number): string {
  const now = Date.now();
  const diff = now - ms;
  if (diff < 1000) return "just now";
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return new Date(ms).toLocaleTimeString();
}

export const RecentRequestsWidget = () => {
  const [requests, setRequests] = useState<RecentRequest[]>([]);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);

  const fetchRecent = useCallback(async () => {
    try {
      const res = await fetch("/api/proxy-recent");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: RecentRequest[] = await res.json();
      json.sort((a, b) => b.t - a.t);
      setRequests(json);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    fetchRecent();
    intervalRef.current = setInterval(fetchRecent, 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchRecent]);

  const filtered = filter
    ? requests.filter(
        (r) =>
          r.p.toLowerCase().includes(filter.toLowerCase()) ||
          r.m.toLowerCase().includes(filter.toLowerCase()) ||
          String(r.s).includes(filter),
      )
    : requests;

  return (
    <Wrap>
      <Controls>
        <FilterInput
          placeholder="Filter by path, method, or status..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <Badge>
          {filtered.length} / {requests.length} requests
        </Badge>
      </Controls>

      <ScrollWrap>
        <Table>
          <thead>
            <tr>
              <Th>Time</Th>
              <Th>Method</Th>
              <Th>Path</Th>
              <Th>Status</Th>
              <Th>Size</Th>
              <Th>Duration</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={`${r.t}-${i}`}>
                <Td>{formatTime(r.t)}</Td>
                <Td>
                  <MethodBadge $m={r.m}>{r.m}</MethodBadge>
                </Td>
                <PathCell title={r.p}>
                  {r.p.length > 80 ? `${r.p.slice(0, 80)}...` : r.p}
                </PathCell>
                <Td>
                  <StatusCode $s={r.s}>{r.s}</StatusCode>
                </Td>
                <Td>{formatBytes(r.sz)}</Td>
                <Td>{r.rt > 0 ? `${(r.rt * 1000).toFixed(0)}ms` : "—"}</Td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <Td
                  colSpan={6}
                  style={{
                    textAlign: "center",
                    padding: "20px",
                    color: "rgba(255,255,255,0.25)",
                  }}
                >
                  {requests.length === 0
                    ? "No requests recorded yet"
                    : "No matching requests"}
                </Td>
              </tr>
            )}
          </tbody>
        </Table>
      </ScrollWrap>

      <StatusRow>
        <StatusDot $live={!error} />
        {error
          ? "Failed to fetch recent requests"
          : "Live — refreshing every 3s"}
      </StatusRow>
    </Wrap>
  );
};
