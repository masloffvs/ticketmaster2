import { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";

interface HostEntry {
  host: string;
  requests: number;
  bytes: number;
}

interface TrafficMetrics {
  requests: number;
  bytesIn: number;
  bytesOut: number;
  uptimeSeconds: number;
  statusClasses: Record<string, number>;
  contentTypes: Record<string, number>;
  hosts: HostEntry[];
}

const Wrap = styled.div`
  padding: 8px 4px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
  margin-bottom: 16px;
`;

const Card = styled.div`
  border-radius: 8px;
  background: #111;
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 14px 16px;
`;

const CardLabel = styled.div`
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 6px;
`;

const CardValue = styled.div`
  font-size: 1.6rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: #f4f4f4;
  font-variant-numeric: tabular-nums;
`;

const CardSub = styled.div`
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.3);
  margin-top: 2px;
`;

const SectionTitle = styled.h3`
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.35);
  margin: 20px 0 8px;
`;

const BarRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.7);
`;

const BarLabel = styled.span`
  min-width: 60px;
  font-variant-numeric: tabular-nums;
`;

const BarTrack = styled.div`
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
`;

const BarFill = styled.div<{ $pct: number; $color: string }>`
  height: 100%;
  width: ${(p) => p.$pct}%;
  background: ${(p) => p.$color};
  border-radius: 3px;
  transition: width 0.4s ease;
`;

const BarValue = styled.span`
  min-width: 50px;
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.45);
`;

const StatusRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 16px;
`;

const Dot = styled.span<{ $live: boolean }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${(p) => (p.$live ? "#22c55e" : "#ef4444")};
  display: inline-block;
`;

const HostTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.78rem;
  margin-top: 4px;
`;

const Th = styled.th`
  text-align: left;
  color: rgba(255, 255, 255, 0.35);
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 4px 8px 6px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);

  &:last-child {
    text-align: right;
  }
`;

const Td = styled.td`
  color: rgba(255, 255, 255, 0.65);
  padding: 5px 8px 5px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  font-variant-numeric: tabular-nums;

  &:last-child {
    text-align: right;
  }
`;

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / 1024 ** i;
  return `${val.toFixed(val < 10 && i > 0 ? 2 : val < 100 && i > 0 ? 1 : 0)} ${units[i]}`;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

const STATUS_COLORS: Record<string, string> = {
  "2xx": "#22c55e",
  "3xx": "#eab308",
  "4xx": "#f97316",
  "5xx": "#ef4444",
};

const CT_COLORS: Record<string, string> = {
  html: "#3b82f6",
  js: "#eab308",
  css: "#a855f7",
  json: "#22c55e",
  image: "#f97316",
  font: "#6b7280",
  other: "#4b5563",
};

export const ProxyTrafficWidget = () => {
  const [data, setData] = useState<TrafficMetrics | null>(null);
  const [error, setError] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch("/api/proxy-metrics");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    intervalRef.current = setInterval(fetchMetrics, 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchMetrics]);

  const totalBytes = data ? data.bytesIn + data.bytesOut : 0;
  const maxStatus = data
    ? Math.max(...Object.values(data.statusClasses), 1)
    : 1;
  const maxCt = data ? Math.max(...Object.values(data.contentTypes), 1) : 1;

  return (
    <Wrap>
      <Grid>
        <Card>
          <CardLabel>Requests</CardLabel>
          <CardValue>{data ? formatNumber(data.requests) : "—"}</CardValue>
          <CardSub>total proxied</CardSub>
        </Card>
        <Card>
          <CardLabel>Traffic Out</CardLabel>
          <CardValue>{data ? formatBytes(data.bytesOut) : "—"}</CardValue>
          <CardSub>response bodies</CardSub>
        </Card>
        <Card>
          <CardLabel>Traffic In</CardLabel>
          <CardValue>{data ? formatBytes(data.bytesIn) : "—"}</CardValue>
          <CardSub>request bodies</CardSub>
        </Card>
        <Card>
          <CardLabel>Total Volume</CardLabel>
          <CardValue>{data ? formatBytes(totalBytes) : "—"}</CardValue>
          <CardSub>in + out</CardSub>
        </Card>
        <Card>
          <CardLabel>Uptime</CardLabel>
          <CardValue>{data ? formatUptime(data.uptimeSeconds) : "—"}</CardValue>
          <CardSub>since proxy start</CardSub>
        </Card>
        <Card>
          <CardLabel>Avg Response</CardLabel>
          <CardValue>
            {data && data.requests > 0
              ? formatBytes(Math.round(data.bytesOut / data.requests))
              : "—"}
          </CardValue>
          <CardSub>bytes / request</CardSub>
        </Card>
      </Grid>

      {data && (
        <>
          <SectionTitle>Status Codes</SectionTitle>
          {(["2xx", "3xx", "4xx", "5xx"] as const).map((cls) => {
            const count = data.statusClasses[cls] || 0;
            return (
              <BarRow key={cls}>
                <BarLabel>{cls}</BarLabel>
                <BarTrack>
                  <BarFill
                    $pct={(count / maxStatus) * 100}
                    $color={STATUS_COLORS[cls]}
                  />
                </BarTrack>
                <BarValue>{formatNumber(count)}</BarValue>
              </BarRow>
            );
          })}

          <SectionTitle>Content Types</SectionTitle>
          {(
            ["html", "js", "css", "json", "image", "font", "other"] as const
          ).map((ct) => {
            const count = data.contentTypes[ct] || 0;
            return (
              <BarRow key={ct}>
                <BarLabel>{ct}</BarLabel>
                <BarTrack>
                  <BarFill
                    $pct={(count / maxCt) * 100}
                    $color={CT_COLORS[ct]}
                  />
                </BarTrack>
                <BarValue>{formatNumber(count)}</BarValue>
              </BarRow>
            );
          })}

          {data.hosts.length > 0 && (
            <>
              <SectionTitle>Upstream Hosts</SectionTitle>
              <HostTable>
                <thead>
                  <tr>
                    <Th>Host</Th>
                    <Th>Requests</Th>
                    <Th>Bytes</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.hosts.slice(0, 15).map((h) => (
                    <tr key={h.host}>
                      <Td>{h.host}</Td>
                      <Td>{formatNumber(h.requests)}</Td>
                      <Td>{formatBytes(h.bytes)}</Td>
                    </tr>
                  ))}
                </tbody>
              </HostTable>
            </>
          )}
        </>
      )}

      <StatusRow>
        <Dot $live={!error && data !== null} />
        {error ? "Proxy metrics unreachable" : "Live — refreshing every 3s"}
      </StatusRow>
    </Wrap>
  );
};
