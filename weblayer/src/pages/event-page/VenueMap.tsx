import { useMemo, useState } from "react";
import styled from "styled-components";
import { useI18n } from "../../i18n/I18nProvider";
import type { GeoPlace } from "../../store/useTmDataStore";
import { useTmDataStore } from "../../store/useTmDataStore";

const MapContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
`;

const TabBar = styled.div`
  display: flex;
  border-bottom: 2px solid #e0e0e0;
  background: var(--color-white);
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: 0.75rem 1.25rem;
  font-size: 0.9rem;
  font-weight: 600;
  font-family: inherit;
  border: none;
  background: transparent;
  cursor: pointer;
  color: ${(p) => (p.$active ? "var(--color-primary)" : "#555")};
  border-bottom: 3px solid
    ${(p) => (p.$active ? "var(--color-primary)" : "transparent")};
  margin-bottom: -2px;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    color: var(--color-primary);
  }

  svg {
    width: 18px;
    height: 18px;
    fill: currentColor;
  }
`;

const MapViewport = styled.div`
  flex: 1;
  background: #1a1a2e;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 450px;
  overflow: hidden;
`;

const VenueSvg = styled.svg`
  width: 70%;
  max-width: 500px;
  height: auto;
`;

const ZoomControls = styled.div`
  position: absolute;
  right: 1rem;
  top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const ZoomButton = styled.button`
  width: 32px;
  height: 32px;
  border: 1px solid #555;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 1.1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

const LegendBar = styled.div`
  background: var(--color-white);
  padding: 0.5rem 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.8rem;
  border-top: 1px solid #e0e0e0;
`;

const LegendDot = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;

  &::before {
    content: "";
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${(p) => p.$color};
  }
`;

const NoMapMessage = styled.div`
  color: #949494;
  text-align: center;
  padding: 2rem;

  svg {
    width: 48px;
    height: 48px;
    fill: #949494;
    margin-bottom: 0.5rem;
  }
`;

const LoadingMessage = styled.div`
  color: #94949480;
  font-size: 0.95rem;
`;

const RawJsonToggle = styled.button`
  position: absolute;
  left: 1rem;
  bottom: 1rem;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid #555;
  color: #ccc;
  padding: 0.3rem 0.6rem;
  font-size: 0.7rem;
  border-radius: 4px;
  cursor: pointer;
  font-family: monospace;
  &:hover {
    background: rgba(255, 255, 255, 0.25);
  }
`;

const RawJsonOverlay = styled.pre`
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.92);
  color: #0f0;
  font-size: 0.65rem;
  padding: 1rem;
  overflow: auto;
  margin: 0;
  z-index: 10;
  white-space: pre-wrap;
  word-break: break-all;
`;

const SECTION_COLORS = [
  "#024ddf",
  "#e53935",
  "#43a047",
  "#fb8c00",
  "#8e24aa",
  "#00acc1",
  "#d81b60",
  "#6d4c41",
  "#546e7a",
  "#fdd835",
];

type ViewMode = "seatmap" | "bestAvailable";

interface VenueMapProps {
  onViewChange?: (mode: ViewMode) => void;
}

export const VenueMap = ({ onViewChange }: VenueMapProps) => {
  const [view, setView] = useState<ViewMode>("seatmap");
  const [showRawJson, setShowRawJson] = useState(false);
  const { t } = useI18n();
  const { geometry, geometryLoading } = useTmDataStore();

  const handleViewChange = (mode: ViewMode) => {
    setView(mode);
    onViewChange?.(mode);
  };

  // Collect unique colors for legend
  const legendItems = useMemo(() => {
    if (!geometry?.places.length) return [];
    const seen = new Map<string, string>();
    const walk = (places: GeoPlace[]) => {
      for (const p of places) {
        if (p.color && p.name && !seen.has(p.color)) {
          seen.set(p.color, p.name);
        }
        if (p.children) walk(p.children);
      }
    };
    walk(geometry.places);
    return Array.from(seen.entries()).map(([color, name]) => ({ color, name }));
  }, [geometry]);

  // Build SVG path for a place's points
  const pointsToPath = (pts: Array<{ x: number; y: number }>) => {
    if (pts.length === 0) return "";
    return (
      pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + " Z"
    );
  };

  const renderPlaces = (places: GeoPlace[], depth = 0) =>
    places.map((place, idx) => {
      const color = place.color || SECTION_COLORS[idx % SECTION_COLORS.length];
      return (
        <g key={place.id || idx}>
          {place.path && (
            <path
              d={place.path}
              fill={color}
              opacity={0.8}
              stroke="#fff"
              strokeWidth={0.5}
            />
          )}
          {place.points && place.points.length > 0 && (
            <path
              d={pointsToPath(place.points)}
              fill={color}
              opacity={0.8}
              stroke="#fff"
              strokeWidth={0.5}
            />
          )}
          {place.labels?.map((lbl) => (
            <text
              key={`${lbl.x}-${lbl.y}-${lbl.text}`}
              x={lbl.x}
              y={lbl.y}
              textAnchor="middle"
              fill="white"
              fontSize={depth === 0 ? 14 : 10}
              fontWeight="700"
              fontFamily="Averta, sans-serif"
            >
              {lbl.text}
            </text>
          ))}
          {!place.labels?.length && place.name && place.points?.length ? (
            <text
              x={
                place.points.reduce((s, p) => s + p.x, 0) / place.points.length
              }
              y={
                place.points.reduce((s, p) => s + p.y, 0) / place.points.length
              }
              textAnchor="middle"
              fill="white"
              fontSize={depth === 0 ? 12 : 9}
              fontWeight="600"
              fontFamily="Averta, sans-serif"
              dominantBaseline="central"
            >
              {place.name}
            </text>
          ) : null}
          {place.children && renderPlaces(place.children, depth + 1)}
        </g>
      );
    });

  const hasGeometry = geometry && geometry.places.length > 0;

  return (
    <MapContainer>
      <TabBar role="tablist">
        <Tab
          role="tab"
          $active={view === "seatmap"}
          aria-selected={view === "seatmap"}
          onClick={() => handleViewChange("seatmap")}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM8 20H4v-4h4v4zm0-6H4v-4h4v4zm0-6H4V4h4v4zm6 12h-4v-4h4v4zm0-6h-4v-4h4v4zm0-6h-4V4h4v4zm6 12h-4v-4h4v4zm0-6h-4v-4h4v4zm0-6h-4V4h4v4z" />
          </svg>
          {t("eventPage.seatMap")}
        </Tab>
        <Tab
          role="tab"
          $active={view === "bestAvailable"}
          aria-selected={view === "bestAvailable"}
          onClick={() => handleViewChange("bestAvailable")}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z" />
          </svg>
          {t("eventPage.bestAvailable")}
        </Tab>
      </TabBar>

      {view === "seatmap" ? (
        <>
          <MapViewport>
            {geometryLoading ? (
              <LoadingMessage>Loading venue map…</LoadingMessage>
            ) : hasGeometry ? (
              <>
                <VenueSvg
                  viewBox={
                    geometry.viewBox
                      ? `0 0 ${geometry.viewBox.width} ${geometry.viewBox.height}`
                      : "0 0 400 350"
                  }
                  role="img"
                  aria-label={t("eventPage.venueMapLabel")}
                >
                  {renderPlaces(geometry.places)}
                </VenueSvg>
                {showRawJson && (
                  <RawJsonOverlay onClick={() => setShowRawJson(false)}>
                    {JSON.stringify(geometry.raw, null, 2)}
                  </RawJsonOverlay>
                )}
                <RawJsonToggle
                  type="button"
                  onClick={() => setShowRawJson((s) => !s)}
                >
                  {showRawJson ? "HIDE JSON" : "RAW JSON"}
                </RawJsonToggle>
              </>
            ) : (
              <VenueSvg
                viewBox="0 0 400 350"
                role="img"
                aria-label={t("eventPage.venueMapLabel")}
              >
                <rect
                  x="100"
                  y="20"
                  width="200"
                  height="60"
                  rx="4"
                  fill="#888"
                />
                <text
                  x="200"
                  y="58"
                  textAnchor="middle"
                  fill="white"
                  fontSize="20"
                  fontWeight="700"
                  fontFamily="Averta, sans-serif"
                >
                  SCEN
                </text>
                <path
                  d="M60,110 L340,110 L320,320 Q200,340 80,320 Z"
                  fill="#024ddf"
                  rx="8"
                />
                <text
                  x="200"
                  y="240"
                  textAnchor="middle"
                  fill="white"
                  fontSize="24"
                  fontWeight="700"
                  fontFamily="Averta, sans-serif"
                >
                  PARKETT
                </text>
              </VenueSvg>
            )}

            <ZoomControls>
              <ZoomButton type="button" aria-label="Reset zoom">
                ⟲
              </ZoomButton>
              <ZoomButton type="button" aria-label="Zoom in">
                +
              </ZoomButton>
              <ZoomButton type="button" aria-label="Zoom out">
                −
              </ZoomButton>
            </ZoomControls>
          </MapViewport>
          <LegendBar>
            {legendItems.length > 0 ? (
              legendItems.map((item) => (
                <LegendDot key={item.color} $color={item.color}>
                  {item.name}
                </LegendDot>
              ))
            ) : (
              <LegendDot $color="#024ddf">Standard</LegendDot>
            )}
          </LegendBar>
        </>
      ) : (
        <MapViewport>
          <NoMapMessage>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13zM9 13v2H7v-2h2zm4 0v2h-2v-2h2zm4 0v2h-2v-2h2z" />
            </svg>
            <div>{t("eventPage.noMapAvailable")}</div>
          </NoMapMessage>
        </MapViewport>
      )}
    </MapContainer>
  );
};
