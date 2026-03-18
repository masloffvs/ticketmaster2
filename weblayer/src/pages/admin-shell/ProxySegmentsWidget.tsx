import { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";

/* ── Types ───────────────────────────────────────────────────── */

interface CategoryEntry {
  name: string;
  requests: number;
  bytes: number;
  avgMs: number;
  pct: number;
  status: Record<string, number>;
}

interface EdgeMetrics {
  totalRequests: number;
  bytesIn: number;
  bytesOut: number;
  uptimeSeconds: number;
  categories: CategoryEntry[];
}

/* ── Palette ─────────────────────────────────────────────────── */

const SEG_COLORS: Record<string, string> = {
  spa: "#3b82f6",
  static: "#8b5cf6",
  serverlayer_api: "#22c55e",
  topology_api: "#14b8a6",
  worker_api: "#06b6d4",
  manifest_api: "#f59e0b",
  availability_api: "#f97316",
  geometry_api: "#ec4899",
  puppeteer: "#ef4444",
  transparency: "#6b7280",
  metrics: "#a3a3a3",
};

const SEG_LABELS: Record<string, string> = {
  spa: "SPA Pages",
  static: "Static Assets",
  serverlayer_api: "Server API",
  topology_api: "Topology API",
  worker_api: "Worker API",
  manifest_api: "Manifest API",
  availability_api: "Availability API",
  geometry_api: "Geometry API",
  puppeteer: "Puppeteer Render",
  transparency: "Transparency Proxy",
  metrics: "Metrics",
};

const STATUS_COLORS: Record<string, string> = {
  "2xx": "#22c55e",
  "3xx": "#eab308",
  "4xx": "#f97316",
  "5xx": "#ef4444",
};

/* ── Styled ──────────────────────────────────────────────────── */

const Wrap = styled.div`
  padding: 8px 4px;
`;

const TopRow = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 16px;

  @media (max-width: 900px) {
    flex-direction: column;
  }
`;

const DonutCard = styled.div`
  border-radius: 8px;
  background: #111;
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 200px;
`;

const SummaryGrid = styled.div`
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
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
  font-size: 1.5rem;
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

/* ── Stacked bar ─────────────────────────────────────────────── */

const StackedWrap = styled.div`
  margin-bottom: 16px;
`;

const SectionTitle = styled.h3`
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.35);
  margin: 0 0 8px;
`;

const StackedTrack = styled.div`
  height: 22px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
  display: flex;
  overflow: hidden;
`;

const StackedSlice = styled.div<{ $pct: number; $color: string }>`
  height: 100%;
  width: ${(p) => p.$pct}%;
  background: ${(p) => p.$color};
  min-width: ${(p) => (p.$pct > 0 ? 2 : 0)}px;
  transition: width 0.5s ease;
`;

const LegendRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  margin-top: 8px;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.55);
`;

const LegendDot = styled.span<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: ${(p) => p.$color};
  display: inline-block;
`;

/* ── Segment rows ────────────────────────────────────────────── */

const SegList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const SegRow = styled.div`
  border-radius: 8px;
  background: #111;
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 12px 16px;
  display: grid;
  grid-template-columns: 200px 1fr 100px 80px 1fr;
  align-items: center;
  gap: 12px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 8px;
  }
`;

const SegName = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.85);
`;

const SegDot = styled.span<{ $color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 3px;
  background: ${(p) => p.$color};
  display: inline-block;
  flex-shrink: 0;
`;

const SegBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
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
  width: ${(p) => Math.max(p.$pct, 0.4)}%;
  background: ${(p) => p.$color};
  border-radius: 3px;
  transition: width 0.5s ease;
`;

const SegPct = styled.div`
  font-size: 0.88rem;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.75);
  font-variant-numeric: tabular-nums;
  text-align: right;
`;

const SegMeta = styled.div`
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.4);
  font-variant-numeric: tabular-nums;
  text-align: right;
`;

const SegStatusPills = styled.div`
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
`;

const Pill = styled.span<{ $color: string }>`
  font-size: 0.64rem;
  font-weight: 700;
  color: ${(p) => p.$color};
  background: ${(p) => `${p.$color}18`};
  padding: 2px 6px;
  border-radius: 4px;
  font-variant-numeric: tabular-nums;
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

/* ── Helpers ──────────────────────────────────────────────────── */

function fmtBytes(b: number): string {
  if (b === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(b) / Math.log(1024));
  const v = b / 1024 ** i;
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtUptime(s: number): string {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(" ");
}

/* ── Donut SVG ───────────────────────────────────────────────── */

function SegDonut({ categories }: { categories: CategoryEntry[] }) {
  const total = categories.reduce((s, c) => s + c.requests, 0) || 1;
  const size = 150;
  const cx = size / 2;
  const cy = size / 2;
  const r = 56;
  const stroke = 18;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const arcs = categories.map((cat) => {
    const pct = cat.requests / total;
    const dash = circumference * pct;
    const gap = circumference - dash;
    const rot = offset;
    offset += pct * 360;
    return { cat, dash, gap, rot };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.04)"
        strokeWidth={stroke}
      />
      {arcs.map(({ cat, dash, gap, rot }) => (
        <circle
          key={cat.name}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={SEG_COLORS[cat.name] ?? "#555"}
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${gap}`}
          strokeDashoffset={0}
          transform={`rotate(${rot - 90} ${cx} ${cy})`}
          strokeLinecap="butt"
        />
      ))}
      <text
        x={cx}
        y={cy - 8}
        textAnchor="middle"
        fontSize="20"
        fontWeight="800"
        fill="#f4f4f4"
      >
        {fmtNum(total)}
      </text>
      <text
        x={cx}
        y={cy + 10}
        textAnchor="middle"
        fontSize="9"
        fill="rgba(255,255,255,0.4)"
        fontWeight="700"
        letterSpacing="0.1em"
      >
        REQUESTS
      </text>
    </svg>
  );
}

/* ── Component ───────────────────────────────────────────────── */

export const ProxySegmentsWidget = () => {
  const [data, setData] = useState<EdgeMetrics | null>(null);
  const [ok, setOk] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/edge-metrics");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: EdgeMetrics = await res.json();
      setData(json);
      setOk(true);
    } catch {
      setOk(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  const sorted = data
    ? [...data.categories].sort((a, b) => b.requests - a.requests)
    : [];

  const activeSegments = sorted.filter((c) => c.requests > 0);

  return (
    <Wrap>
      {/* ── Top: donut + summary cards ─────── */}
      <TopRow>
        <DonutCard>
          {data ? (
            <SegDonut categories={activeSegments} />
          ) : (
            <div
              style={{
                width: 150,
                height: 150,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(255,255,255,0.3)",
                fontSize: "0.78rem",
              }}
            >
              Loading…
            </div>
          )}
        </DonutCard>

        <SummaryGrid>
          <Card>
            <CardLabel>Total Requests</CardLabel>
            <CardValue>{data ? fmtNum(data.totalRequests) : "—"}</CardValue>
            <CardSub>across all segments</CardSub>
          </Card>
          <Card>
            <CardLabel>Active Segments</CardLabel>
            <CardValue>{activeSegments.length}</CardValue>
            <CardSub>of {Object.keys(SEG_LABELS).length} configured</CardSub>
          </Card>
          <Card>
            <CardLabel>Traffic Out</CardLabel>
            <CardValue>{data ? fmtBytes(data.bytesOut) : "—"}</CardValue>
            <CardSub>response bodies</CardSub>
          </Card>
          <Card>
            <CardLabel>Traffic In</CardLabel>
            <CardValue>{data ? fmtBytes(data.bytesIn) : "—"}</CardValue>
            <CardSub>request bodies</CardSub>
          </Card>
          <Card>
            <CardLabel>Uptime</CardLabel>
            <CardValue>{data ? fmtUptime(data.uptimeSeconds) : "—"}</CardValue>
            <CardSub>since edge start</CardSub>
          </Card>
          <Card>
            <CardLabel>Avg Latency</CardLabel>
            <CardValue>
              {activeSegments.length > 0
                ? `${Math.round(activeSegments.reduce((s, c) => s + c.avgMs * c.requests, 0) / Math.max(data?.totalRequests ?? 1, 1))}ms`
                : "—"}
            </CardValue>
            <CardSub>weighted average</CardSub>
          </Card>
        </SummaryGrid>
      </TopRow>

      {/* ── Stacked bar overview ─────── */}
      {data && activeSegments.length > 0 && (
        <StackedWrap>
          <SectionTitle>Segment Distribution</SectionTitle>
          <StackedTrack>
            {activeSegments.map((cat) => (
              <StackedSlice
                key={cat.name}
                $pct={cat.pct}
                $color={SEG_COLORS[cat.name] ?? "#555"}
                title={`${SEG_LABELS[cat.name] ?? cat.name}: ${cat.pct.toFixed(1)}%`}
              />
            ))}
          </StackedTrack>
          <LegendRow>
            {activeSegments.map((cat) => (
              <LegendItem key={cat.name}>
                <LegendDot $color={SEG_COLORS[cat.name] ?? "#555"} />
                {SEG_LABELS[cat.name] ?? cat.name} ({cat.pct.toFixed(1)}%)
              </LegendItem>
            ))}
          </LegendRow>
        </StackedWrap>
      )}

      {/* ── Per-segment rows ─────── */}
      {data && (
        <>
          <SectionTitle>Per-Segment Breakdown</SectionTitle>
          <SegList>
            {sorted.map((cat) => {
              const color = SEG_COLORS[cat.name] ?? "#555";
              return (
                <SegRow key={cat.name}>
                  <SegName>
                    <SegDot $color={color} />
                    {SEG_LABELS[cat.name] ?? cat.name}
                  </SegName>

                  <SegBar>
                    <BarTrack>
                      <BarFill $pct={cat.pct} $color={color} />
                    </BarTrack>
                  </SegBar>

                  <SegPct>{cat.pct.toFixed(1)}%</SegPct>

                  <SegMeta>
                    {fmtNum(cat.requests)} req
                    <br />
                    {fmtBytes(cat.bytes)}
                    <br />
                    {Math.round(cat.avgMs)}ms avg
                  </SegMeta>

                  <SegStatusPills>
                    {(["2xx", "3xx", "4xx", "5xx"] as const).map((sc) => {
                      const v = cat.status[sc];
                      if (!v) return null;
                      return (
                        <Pill key={sc} $color={STATUS_COLORS[sc]}>
                          {sc}: {fmtNum(v)}
                        </Pill>
                      );
                    })}
                  </SegStatusPills>
                </SegRow>
              );
            })}
          </SegList>
        </>
      )}

      {/* ── Footer ─────── */}
      <StatusRow>
        <Dot $live={ok} />
        {ok ? "Connected to edge metrics" : "Disconnected"} · refreshes every 3s
      </StatusRow>
    </Wrap>
  );
};
