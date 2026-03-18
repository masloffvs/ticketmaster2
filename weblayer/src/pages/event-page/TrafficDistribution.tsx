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

/* ── Styled ──────────────────────────────────────────────────── */

const Wrap = styled.div`
  padding: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  background: #fff;
`;

const Header = styled.div`
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Title = styled.div`
  font-size: 0.82rem;
  font-weight: 700;
  color: #333;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const LiveDot = styled.span<{ $ok: boolean }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${(p) => (p.$ok ? "#22c55e" : "#ef4444")};
  display: inline-block;
`;

const TotalBadge = styled.span`
  font-size: 0.72rem;
  font-weight: 600;
  color: #026cdf;
  background: rgba(2, 108, 223, 0.08);
  padding: 2px 8px;
  border-radius: 999px;
`;

/* ── Summary cards ───────────────────────────────────────────── */

const SummaryRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0;
  border-bottom: 1px solid #e0e0e0;
`;

const SummaryCell = styled.div`
  padding: 0.6rem 0.75rem;
  text-align: center;
  border-right: 1px solid #e0e0e0;
  &:last-child {
    border-right: none;
  }
`;

const CellValue = styled.div`
  font-size: 1.1rem;
  font-weight: 800;
  color: #333;
  font-variant-numeric: tabular-nums;
`;

const CellLabel = styled.div`
  font-size: 0.65rem;
  font-weight: 600;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

/* ── Distribution bars ───────────────────────────────────────── */

const CategoryList = styled.div`
  flex: 1;
`;

const CatItem = styled.div`
  padding: 0.5rem 1rem;
  border-bottom: 1px solid #f0f0f0;
`;

const CatHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
`;

const CatName = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
  font-weight: 700;
  color: #333;
`;

const CatDot = styled.span<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: ${(p) => p.$color};
  display: inline-block;
`;

const CatPct = styled.span`
  font-size: 0.82rem;
  font-weight: 800;
  color: #333;
  font-variant-numeric: tabular-nums;
`;

const BarTrack = styled.div`
  height: 6px;
  border-radius: 3px;
  background: #f0f0f0;
  overflow: hidden;
  margin-bottom: 4px;
`;

const BarFill = styled.div<{ $pct: number; $color: string }>`
  height: 100%;
  width: ${(p) => Math.max(p.$pct, 0.5)}%;
  background: ${(p) => p.$color};
  border-radius: 3px;
  transition: width 0.5s ease;
`;

const CatMeta = styled.div`
  display: flex;
  gap: 8px;
  font-size: 0.7rem;
  color: #999;
  font-variant-numeric: tabular-nums;
`;

const StatusPills = styled.div`
  display: flex;
  gap: 4px;
  margin-left: auto;
`;

const StatusPill = styled.span<{ $color: string }>`
  font-size: 0.62rem;
  font-weight: 700;
  color: ${(p) => p.$color};
  background: ${(p) => `${p.$color}12`};
  padding: 1px 5px;
  border-radius: 3px;
`;

/* ── Donut center ────────────────────────────────────────────── */

const DonutWrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e0e0e0;
`;

const FooterNote = styled.div`
  padding: 0.5rem 1rem;
  font-size: 0.68rem;
  color: #bbb;
  text-align: center;
`;

/* ── Helpers ─────────────────────────────────────────────────── */

const CAT_COLORS: Record<string, string> = {
  spa: "#026cdf",
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

const CAT_LABELS: Record<string, string> = {
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

const STATUS_PILL_COLORS: Record<string, string> = {
  "2xx": "#22c55e",
  "3xx": "#eab308",
  "4xx": "#f97316",
  "5xx": "#ef4444",
};

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
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/* ── Mini donut SVG ──────────────────────────────────────────── */

function MiniDonut({ categories }: { categories: CategoryEntry[] }) {
  const total = categories.reduce((s, c) => s + c.requests, 0) || 1;
  const size = 120;
  const cx = size / 2;
  const cy = size / 2;
  const r = 44;
  const stroke = 14;
  const circumference = 2 * Math.PI * r;

  let rotationOffset = 0;
  const arcs = categories.map((cat) => {
    const pct = cat.requests / total;
    const dashLen = circumference * pct;
    const gap = circumference - dashLen;
    const rotation = rotationOffset;
    rotationOffset += pct * 360;
    return { cat, dashLen, gap, rotation };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#f0f0f0"
        strokeWidth={stroke}
      />
      {arcs.map(({ cat, dashLen, gap, rotation }) => (
        <circle
          key={cat.name}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={CAT_COLORS[cat.name] ?? "#999"}
          strokeWidth={stroke}
          strokeDasharray={`${dashLen} ${gap}`}
          strokeDashoffset={0}
          transform={`rotate(${rotation - 90} ${cx} ${cy})`}
          strokeLinecap="butt"
        />
      ))}
      <text
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        fontSize="16"
        fontWeight="800"
        fill="#333"
      >
        {fmtNum(total)}
      </text>
      <text
        x={cx}
        y={cy + 10}
        textAnchor="middle"
        fontSize="9"
        fill="#999"
        fontWeight="600"
      >
        REQUESTS
      </text>
    </svg>
  );
}

/* ── Component ──────────────────────────────────────────────── */

export const TrafficDistribution = () => {
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

  return (
    <Wrap>
      <Header>
        <Title>
          <LiveDot $ok={ok} />
          Traffic Distribution
        </Title>
        {data && <TotalBadge>{fmtNum(data.totalRequests)} total</TotalBadge>}
      </Header>

      {data && (
        <>
          <SummaryRow>
            <SummaryCell>
              <CellValue>{fmtBytes(data.bytesOut)}</CellValue>
              <CellLabel>Out</CellLabel>
            </SummaryCell>
            <SummaryCell>
              <CellValue>{fmtBytes(data.bytesIn)}</CellValue>
              <CellLabel>In</CellLabel>
            </SummaryCell>
            <SummaryCell>
              <CellValue>{fmtUptime(data.uptimeSeconds)}</CellValue>
              <CellLabel>Uptime</CellLabel>
            </SummaryCell>
          </SummaryRow>

          <DonutWrap>
            <MiniDonut categories={data.categories} />
          </DonutWrap>

          <CategoryList>
            {data.categories.map((cat) => (
              <CatItem key={cat.name}>
                <CatHeader>
                  <CatName>
                    <CatDot $color={CAT_COLORS[cat.name] ?? "#999"} />
                    {CAT_LABELS[cat.name] ?? cat.name}
                  </CatName>
                  <CatPct>{cat.pct.toFixed(1)}%</CatPct>
                </CatHeader>
                <BarTrack>
                  <BarFill
                    $pct={cat.pct}
                    $color={CAT_COLORS[cat.name] ?? "#999"}
                  />
                </BarTrack>
                <CatMeta>
                  <span>{fmtNum(cat.requests)} req</span>
                  <span>{fmtBytes(cat.bytes)}</span>
                  <span>~{cat.avgMs}ms</span>
                  <StatusPills>
                    {(["2xx", "3xx", "4xx", "5xx"] as const).map((cls) => {
                      const count = cat.status[cls] ?? 0;
                      if (count === 0) return null;
                      return (
                        <StatusPill key={cls} $color={STATUS_PILL_COLORS[cls]}>
                          {cls}:{count}
                        </StatusPill>
                      );
                    })}
                  </StatusPills>
                </CatMeta>
              </CatItem>
            ))}
          </CategoryList>
        </>
      )}

      {!data && (
        <div
          style={{
            padding: "2rem",
            textAlign: "center",
            color: "#999",
            fontSize: "0.85rem",
          }}
        >
          Connecting to edge metrics...
        </div>
      )}

      <FooterNote>Auto-refreshing every 3s from edge nginx</FooterNote>
    </Wrap>
  );
};
