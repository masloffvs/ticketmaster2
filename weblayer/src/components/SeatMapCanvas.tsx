import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";

// ─── Types from topology API ────────────────────────────────────
export interface TopologySeat {
  id: string;
  seatNum: string;
  x: number;
  y: number;
  priceLevel: string;
  col: number;
  rowIdx: number;
}

export interface TopologyRow {
  id: string;
  name: string;
  placeSize: number;
  totalPlaces: number;
  seats: TopologySeat[];
}

export interface TopologySection {
  id: string;
  name: string;
  rows: TopologyRow[];
}

export interface TopologyComposite {
  id: string;
  name: string;
  sections: TopologySection[];
}

export interface TopologyData {
  width: number;
  height: number;
  composites: TopologyComposite[];
}

// ─── Color palette by section ──────────────────────────────────
const SECTION_COLORS: Record<string, string> = {
  ORCHL: "#2176ff",
  ORCHC: "#2176ff",
  ORCHR: "#2176ff",
  MEZL: "#2176ff",
  MEZC: "#2176ff",
  MEZR: "#2176ff",
};

const DEFAULT_COLOR = "#2176ff";
const HOVER_COLOR = "#ffd700";
const STAGE_COLOR = "#333333";

// ─── Parse topology API response ───────────────────────────────
export function parseTopologyData(raw: unknown): TopologyData | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const pages = data.pages as Array<Record<string, unknown>>;
  if (!pages?.length) return null;

  const page = pages[0];
  const width = Number(page.width ?? 10240);
  const height = Number(page.height ?? 7680);
  const segments = (page.segments ?? []) as Array<Record<string, unknown>>;

  const composites: TopologyComposite[] = [];

  for (const seg of segments) {
    const sections: TopologySection[] = [];
    const subSegs = (seg.segments ?? []) as Array<Record<string, unknown>>;

    for (const secSeg of subSegs) {
      const rows: TopologyRow[] = [];
      const rowSegs = (secSeg.segments ?? []) as Array<Record<string, unknown>>;

      for (const rowSeg of rowSegs) {
        const placesRaw = (rowSeg.placesNoKeys ?? []) as Array<unknown[]>;
        const seats: TopologySeat[] = placesRaw.map((p) => ({
          id: String(p[0]),
          seatNum: String(p[1]),
          x: Number(p[2]),
          y: Number(p[3]),
          priceLevel: String(p[4]),
          col: Number(p[5]),
          rowIdx: Number(p[6]),
        }));

        rows.push({
          id: String(rowSeg.id ?? ""),
          name: String(rowSeg.name ?? ""),
          placeSize: Number(rowSeg.placeSize ?? 85),
          totalPlaces: Number(rowSeg.totalPlaces ?? 0),
          seats,
        });
      }

      sections.push({
        id: String(secSeg.id ?? ""),
        name: String(secSeg.name ?? ""),
        rows,
      });
    }

    composites.push({
      id: String(seg.id ?? ""),
      name: String(seg.name ?? ""),
      sections,
    });
  }

  return { width, height, composites };
}

// ─── Styled Components ─────────────────────────────────────────
const CanvasWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 450px;
  background: #f5f5f5;
  overflow: hidden;
  cursor: grab;
  touch-action: none;

  &:active {
    cursor: grabbing;
  }

  @media (max-width: 960px) {
    min-height: clamp(320px, 58vh, 520px);
  }
`;

const StyledCanvas = styled.canvas`
  display: block;
  width: 100%;
  height: 100%;
`;

const MiniMap = styled.canvas`
  position: absolute;
  top: 12px;
  right: 12px;
  width: 180px;
  height: 135px;
  border: 2px solid #ccc;
  border-radius: 6px;
  background: #f0f0f0;
  pointer-events: none;

  @media (max-width: 960px) {
    display: none;
  }
`;

const ZoomControls = styled.div`
  position: absolute;
  right: 12px;
  top: 160px;
  display: flex;
  flex-direction: column;
  gap: 4px;

  @media (max-width: 960px) {
    top: auto;
    bottom: 12px;
    flex-direction: row;
  }
`;

const ZoomBtn = styled.button`
  width: 36px;
  height: 36px;
  border: 1px solid #ccc;
  background: white;
  border-radius: 4px;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);

  &:hover {
    background: #f0f0f0;
  }
`;

const Tooltip = styled.div<{ $x: number; $y: number; $visible: boolean }>`
  position: absolute;
  left: ${(p) => p.$x}px;
  top: ${(p) => p.$y}px;
  background: rgba(0, 0, 0, 0.85);
  color: white;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 12px;
  pointer-events: none;
  transform: translate(-50%, -100%) translateY(-8px);
  white-space: nowrap;
  opacity: ${(p) => (p.$visible ? 1 : 0)};
  transition: opacity 0.15s;
  z-index: 10;

  @media (hover: none) {
    display: none;
  }
`;

// ─── Component ─────────────────────────────────────────────────
interface SeatMapCanvasProps {
  topology: TopologyData | null;
  loading?: boolean;
  onSectionClick?: (sectionName: string) => void;
  highlightedSection?: string | null;
}

export const SeatMapCanvas = ({
  topology,
  loading,
  onSectionClick,
  highlightedSection,
}: SeatMapCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const miniMapRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // View transform
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const touchMovedRef = useRef(false);

  // Hover state
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [tooltipText, setTooltipText] = useState("");

  // Pre-compute all seat positions as flat array for fast lookup
  const flatSeats = useMemo(() => {
    if (!topology) return [];
    const result: Array<{
      x: number;
      y: number;
      r: number;
      section: string;
      composite: string;
      row: string;
      seatNum: string;
    }> = [];

    for (const comp of topology.composites) {
      for (const section of comp.sections) {
        for (const row of section.rows) {
          const radius = row.placeSize * 0.45;
          for (const seat of row.seats) {
            result.push({
              x: seat.x,
              y: seat.y,
              r: radius,
              section: section.name,
              composite: comp.name,
              row: row.name,
              seatNum: seat.seatNum,
            });
          }
        }
      }
    }
    return result;
  }, [topology]);

  // Section centers for labels
  const sectionCenters = useMemo(() => {
    if (!topology) return new Map<string, { cx: number; cy: number }>();
    const centers = new Map<
      string,
      { cx: number; cy: number; count: number; sumX: number; sumY: number }
    >();

    for (const comp of topology.composites) {
      for (const section of comp.sections) {
        let sumX = 0;
        let sumY = 0;
        let count = 0;
        for (const row of section.rows) {
          for (const seat of row.seats) {
            sumX += seat.x;
            sumY += seat.y;
            count++;
          }
        }
        if (count > 0) {
          centers.set(section.name, {
            cx: sumX / count,
            cy: sumY / count,
            count,
            sumX,
            sumY,
          });
        }
      }
    }

    return new Map(
      Array.from(centers.entries()).map(([k, v]) => [
        k,
        { cx: v.sumX / v.count, cy: v.sumY / v.count },
      ]),
    );
  }, [topology]);

  // Compute initial fit transform
  const computeFitTransform = useCallback(() => {
    if (!topology || !wrapperRef.current) return { x: 0, y: 0, s: 1 };
    const rect = wrapperRef.current.getBoundingClientRect();
    const padX = 60;
    const padY = 60;
    const sx = (rect.width - padX * 2) / topology.width;
    const sy = (rect.height - padY * 2) / topology.height;
    const s = Math.min(sx, sy);
    const x = (rect.width - topology.width * s) / 2;
    const y = (rect.height - topology.height * s) / 2;
    return { x, y, s };
  }, [topology]);

  // Reset view to fit
  const resetView = useCallback(() => {
    const fit = computeFitTransform();
    setOffset({ x: fit.x, y: fit.y });
    setScale(fit.s);
  }, [computeFitTransform]);

  // Initial fit
  useEffect(() => {
    if (topology) resetView();
  }, [topology, resetView]);

  // Draw main canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !topology) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Background
    ctx.fillStyle = "#f5f5f5";
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    // Draw stage area (approximate - at the left side based on topology)
    const stageX = 500;
    const stageY = 1800;
    const stageW = 1400;
    const stageH = 3800;
    ctx.fillStyle = STAGE_COLOR;
    ctx.fillRect(stageX, stageY, stageW, stageH);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 300px Averta, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.save();
    ctx.translate(stageX + stageW / 2, stageY + stageH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("STAGE", 0, 0);
    ctx.restore();

    // Draw seats
    for (const seat of flatSeats) {
      const isHighlighted =
        highlightedSection === seat.section || hoveredSection === seat.section;
      const isOtherHighlighted =
        (highlightedSection || hoveredSection) && !isHighlighted;

      ctx.beginPath();
      ctx.arc(seat.x, seat.y, seat.r, 0, Math.PI * 2);

      if (isHighlighted) {
        ctx.fillStyle = HOVER_COLOR;
        ctx.globalAlpha = 1;
      } else if (isOtherHighlighted) {
        ctx.fillStyle = SECTION_COLORS[seat.section] ?? DEFAULT_COLOR;
        ctx.globalAlpha = 0.3;
      } else {
        ctx.fillStyle = SECTION_COLORS[seat.section] ?? DEFAULT_COLOR;
        ctx.globalAlpha = 0.85;
      }

      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Draw section labels
    ctx.fillStyle = "#fff";
    ctx.font = "bold 200px Averta, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const compositeLabels = new Map<string, { cx: number; cy: number }>();
    for (const comp of topology.composites) {
      let sx = 0;
      let sy = 0;
      let cnt = 0;
      for (const sec of comp.sections) {
        const c = sectionCenters.get(sec.name);
        if (c) {
          sx += c.cx;
          sy += c.cy;
          cnt++;
        }
      }
      if (cnt > 0) {
        compositeLabels.set(comp.name, { cx: sx / cnt, cy: sy / cnt });
      }
    }

    for (const [name, center] of compositeLabels) {
      const lines = name.split(" ");
      const lineHeight = 240;
      const startY = center.cy - ((lines.length - 1) * lineHeight) / 2;
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], center.cx, startY + i * lineHeight);
      }
    }

    ctx.restore();
  }, [
    topology,
    flatSeats,
    offset,
    scale,
    hoveredSection,
    highlightedSection,
    sectionCenters,
  ]);

  // Draw minimap
  const drawMiniMap = useCallback(() => {
    const mini = miniMapRef.current;
    const canvas = canvasRef.current;
    if (!mini || !canvas || !topology) return;

    const dpr = window.devicePixelRatio || 1;
    const mw = 180;
    const mh = 135;
    mini.width = mw * dpr;
    mini.height = mh * dpr;

    const ctx = mini.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, mw, mh);
    ctx.fillStyle = "#f0f0f0";
    ctx.fillRect(0, 0, mw, mh);

    const sx = mw / topology.width;
    const sy = mh / topology.height;
    const ms = Math.min(sx, sy) * 0.9;
    const mx = (mw - topology.width * ms) / 2;
    const my = (mh - topology.height * ms) / 2;

    ctx.save();
    ctx.translate(mx, my);
    ctx.scale(ms, ms);

    // Draw seats as tiny dots
    for (const seat of flatSeats) {
      ctx.fillStyle = SECTION_COLORS[seat.section] ?? DEFAULT_COLOR;
      ctx.fillRect(seat.x - 20, seat.y - 20, 40, 40);
    }

    // Draw stage
    ctx.fillStyle = STAGE_COLOR;
    ctx.fillRect(500, 1800, 1400, 3800);

    ctx.restore();

    // Draw viewport rectangle
    const canvasRect = canvas.getBoundingClientRect();
    const vx = (-offset.x / scale) * ms + mx;
    const vy = (-offset.y / scale) * ms + my;
    const vw = (canvasRect.width / scale) * ms;
    const vh = (canvasRect.height / scale) * ms;

    ctx.strokeStyle = "#ff0000";
    ctx.lineWidth = 2;
    ctx.strokeRect(vx, vy, vw, vh);
  }, [topology, flatSeats, offset, scale]);

  // Animation frame render
  useEffect(() => {
    let raf: number;
    const render = () => {
      draw();
      drawMiniMap();
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [draw, drawMiniMap]);

  // Mouse handlers
  const worldFromScreen = useCallback(
    (sx: number, sy: number) => ({
      x: (sx - offset.x) / scale,
      y: (sy - offset.y) / scale,
    }),
    [offset, scale],
  );

  const findSectionAt = useCallback(
    (sx: number, sy: number): string | null => {
      const w = worldFromScreen(sx, sy);
      // Find nearest seat section within threshold
      let minDist = Number.POSITIVE_INFINITY;
      let found: string | null = null;

      for (const seat of flatSeats) {
        const dx = w.x - seat.x;
        const dy = w.y - seat.y;
        const dist = dx * dx + dy * dy;
        const threshold = (seat.r * 2) ** 2;
        if (dist < threshold && dist < minDist) {
          minDist = dist;
          found = seat.section;
        }
      }

      return found;
    },
    [flatSeats, worldFromScreen],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      setDragOffset(offset);
    },
    [offset],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (!rect) return;

      if (dragging) {
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        setOffset({ x: dragOffset.x + dx, y: dragOffset.y + dy });
        return;
      }

      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const section = findSectionAt(mx, my);

      if (section) {
        setHoveredSection(section);
        setTooltipPos({ x: mx, y: my });

        // Find composite name for this section
        if (topology) {
          for (const comp of topology.composites) {
            for (const sec of comp.sections) {
              if (sec.name === section) {
                setTooltipText(`${comp.name} — ${sec.name}`);
              }
            }
          }
        }
      } else {
        setHoveredSection(null);
      }
    },
    [dragging, dragStart, dragOffset, findSectionAt, topology],
  );

  const handleMouseUp = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
  }, [dragging]);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      touchMovedRef.current = false;
      setDragging(true);
      setDragStart({ x: touch.clientX, y: touch.clientY });
      setDragOffset(offset);
    },
    [offset],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      e.preventDefault();
      const dx = touch.clientX - dragStart.x;
      const dy = touch.clientY - dragStart.y;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        touchMovedRef.current = true;
      }
      setOffset({ x: dragOffset.x + dx, y: dragOffset.y + dy });
    },
    [dragOffset, dragStart],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      setDragging(false);
      setHoveredSection(null);

      if (touchMovedRef.current) return;

      const touch = e.changedTouches[0];
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (!touch || !rect) return;

      const mx = touch.clientX - rect.left;
      const my = touch.clientY - rect.top;
      const section = findSectionAt(mx, my);
      if (section) {
        onSectionClick?.(section);
      }
    },
    [findSectionAt, onSectionClick],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const section = findSectionAt(mx, my);
      if (section) onSectionClick?.(section);
    },
    [findSectionAt, onSectionClick],
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const newScale = Math.min(Math.max(scale * factor, 0.02), 2);

      setOffset({
        x: mx - (mx - offset.x) * (newScale / scale),
        y: my - (my - offset.y) * (newScale / scale),
      });
      setScale(newScale);
    },
    [scale, offset],
  );

  const zoomIn = useCallback(() => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const factor = 1.3;
    const newScale = Math.min(scale * factor, 2);
    setOffset({
      x: cx - (cx - offset.x) * (newScale / scale),
      y: cy - (cy - offset.y) * (newScale / scale),
    });
    setScale(newScale);
  }, [scale, offset]);

  const zoomOut = useCallback(() => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const factor = 1 / 1.3;
    const newScale = Math.max(scale * factor, 0.02);
    setOffset({
      x: cx - (cx - offset.x) * (newScale / scale),
      y: cy - (cy - offset.y) * (newScale / scale),
    });
    setScale(newScale);
  }, [scale, offset]);

  if (loading) {
    return (
      <CanvasWrapper ref={wrapperRef}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            color: "#999",
          }}
        >
          Loading venue map…
        </div>
      </CanvasWrapper>
    );
  }

  if (!topology) {
    return (
      <CanvasWrapper ref={wrapperRef}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            color: "#999",
          }}
        >
          No venue data available
        </div>
      </CanvasWrapper>
    );
  }

  return (
    <CanvasWrapper
      ref={wrapperRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleMouseUp}
      onWheel={handleWheel}
    >
      <StyledCanvas ref={canvasRef} />
      <MiniMap ref={miniMapRef} />
      <ZoomControls>
        <ZoomBtn onClick={resetView} aria-label="Reset zoom" title="Reset">
          ⟲
        </ZoomBtn>
        <ZoomBtn onClick={zoomIn} aria-label="Zoom in" title="Zoom in">
          +
        </ZoomBtn>
        <ZoomBtn onClick={zoomOut} aria-label="Zoom out" title="Zoom out">
          −
        </ZoomBtn>
      </ZoomControls>
      <Tooltip $x={tooltipPos.x} $y={tooltipPos.y} $visible={!!hoveredSection}>
        {tooltipText}
      </Tooltip>
    </CanvasWrapper>
  );
};
