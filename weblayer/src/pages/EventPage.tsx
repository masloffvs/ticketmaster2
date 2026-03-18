import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import styled from "styled-components";
import { SeatMapCanvas } from "../components/SeatMapCanvas";
import {
  SceneTopologyProvider,
  useSceneTopology,
} from "../hooks/useSceneTopology";
import { useI18n } from "../i18n/I18nProvider";
import { useEventStore } from "../store/useEventStore";
import { useTmDataStore } from "../store/useTmDataStore";
import { EventHeader } from "./event-page/EventHeader";
import { EventInfoBar } from "./event-page/EventInfoBar";
import { EventInfoDrawer } from "./event-page/EventInfoDrawer";
import { TicketsPanel } from "./event-page/TicketsPanel";
import { TrafficDistribution } from "./event-page/TrafficDistribution";

/* ── Layout ──────────────────────────────────────────────────── */

const PageContainer = styled.div`
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #fff;
  overflow-x: clip;
`;

const LoadingState = styled.div`
  width: 100%;
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  color: #555;
`;

const MainContent = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
  position: relative;

  @media (max-width: 960px) {
    flex-direction: column;
  }
`;

/* ── More Dates sidebar (left) ──────────────────────────────── */

const MoreDatesSidebar = styled.aside`
  width: 90px;
  min-width: 90px;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  background: #fff;
  overflow-y: auto;

  @media (max-width: 960px) {
    width: 100%;
    min-width: 0;
    border-right: none;
    border-bottom: 1px solid #e0e0e0;
    flex-direction: row;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: thin;
  }
`;

const MoreDatesHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: #333;
  border-bottom: 1px solid #e0e0e0;

  button {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    color: #555;
    padding: 0;
  }

  @media (max-width: 960px) {
    min-width: 118px;
    flex-shrink: 0;
    padding: 0.75rem;
    border-right: 1px solid #e0e0e0;
    border-bottom: none;
    align-items: flex-start;
    flex-direction: column;
    gap: 0.35rem;
  }
`;

const DateSlot = styled.button<{ $active?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.6rem 0.25rem;
  border: none;
  border-bottom: 1px solid #e0e0e0;
  background: ${(p) => (p.$active ? "#fff" : "#fff")};
  cursor: pointer;
  font-family: inherit;

  &:hover {
    background: #f5f5f5;
  }

  @media (max-width: 960px) {
    min-width: 88px;
    flex-shrink: 0;
    justify-content: center;
    border-right: 1px solid #e0e0e0;
    border-bottom: none;
  }
`;

const DateLabel = styled.span<{ $active?: boolean }>`
  font-size: 0.78rem;
  font-weight: 700;
  color: ${(p) => (p.$active ? "#026cdf" : "#333")};
`;

const DateDay = styled.span`
  font-size: 0.65rem;
  color: #777;
`;

const TimeChip = styled.span<{ $active?: boolean }>`
  display: inline-block;
  margin-top: 4px;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  background: ${(p) => (p.$active ? "#026cdf" : "transparent")};
  color: ${(p) => (p.$active ? "#fff" : "#333")};
  border: 1px solid ${(p) => (p.$active ? "#026cdf" : "#ccc")};
`;

const CalendarBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0.5rem;
  border: none;
  background: #026cdf;
  color: #fff;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  margin-top: auto;

  svg {
    width: 16px;
    height: 16px;
    fill: currentColor;
  }

  &:hover {
    background: #0156b8;
  }

  @media (max-width: 960px) {
    margin-top: 0;
    min-width: 118px;
    flex-shrink: 0;
    justify-content: center;
  }
`;

/* ── Map area (center) ──────────────────────────────────────── */

const MapArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  position: relative;

  @media (max-width: 960px) {
    min-height: clamp(320px, 58vh, 520px);
  }
`;

/* ── Legend bar ──────────────────────────────────────────────── */

const LegendBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0.4rem 1rem;
  background: #fff;
  border-top: 1px solid #e0e0e0;
  font-size: 0.75rem;
  color: #555;

  @media (max-width: 960px) {
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
  }
`;

const LegendToggle = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 0.75rem;
  cursor: pointer;
  font-family: inherit;

  svg {
    width: 12px;
    height: 12px;
    fill: currentColor;
  }

  &:hover {
    background: #f5f5f5;
  }
`;

/* ── Right panel ────────────────────────────────────────────── */

const RightPanel = styled.div`
  width: 360px;
  min-width: 340px;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  border-left: 1px solid #e0e0e0;
  overflow: hidden;

  @media (max-width: 960px) {
    width: 100%;
    min-width: 0;
    max-width: none;
    border-left: none;
    border-top: 1px solid #e0e0e0;
  }
`;

const RightPanelTabs = styled.div`
  display: flex;
  border-bottom: 2px solid #e0e0e0;
  flex-shrink: 0;
`;

const RPTab = styled.button<{ $active: boolean }>`
  flex: 1;
  min-width: 0;
  padding: 0.6rem 0;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  color: ${(p) => (p.$active ? "#333" : "#999")};
  border-bottom: 2px solid ${(p) => (p.$active ? "#026cdf" : "transparent")};
  margin-bottom: -2px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;

  &:hover {
    color: #333;
  }

  @media (max-width: 560px) {
    font-size: 0.68rem;
    gap: 0.35rem;
    padding: 0.75rem 0.4rem;
  }
`;

const RPBody = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
`;

/* ── Footer ─────────────────────────────────────────────────── */

const Footer = styled.footer`
  padding: 0.5rem 1rem;
  font-size: 0.7rem;
  color: #999;
  text-align: center;
  border-top: 1px solid #e0e0e0;

  a {
    color: #555;
    text-decoration: underline;
    margin: 0 0.25rem;
  }

  @media (max-width: 640px) {
    padding: 0.75rem;
    line-height: 1.5;
  }
`;

/* ── Component ──────────────────────────────────────────────── */

export const EventPage = () => {
  const { eventId } = useParams();

  if (!eventId) return null;

  return (
    <SceneTopologyProvider eventId={eventId}>
      <EventPageInner eventId={eventId} />
    </SceneTopologyProvider>
  );
};

const EventPageInner = ({ eventId }: { eventId: string }) => {
  const { t } = useI18n();
  const { event, isLoading, error, fetchEvent } = useEventStore();
  const { fetchManifest, fetchGeometry, reset: resetTmData } = useTmDataStore();
  const { topologyData, loading: topologyLoading } = useSceneTopology();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [highlightedSection, setHighlightedSection] = useState<string | null>(
    null,
  );
  const [rightTab, setRightTab] = useState<"tickets" | "traffic">("tickets");

  useEffect(() => {
    fetchEvent(eventId);
    fetchManifest(eventId);
    fetchGeometry(eventId);
    return () => resetTmData();
  }, [eventId, fetchEvent, fetchManifest, fetchGeometry, resetTmData]);

  if (isLoading || !event) {
    return (
      <LoadingState aria-live="polite">{t("eventPage.loading")}</LoadingState>
    );
  }

  if (error) {
    return <LoadingState>{t("eventPage.error")}</LoadingState>;
  }

  return (
    <PageContainer>
      <EventHeader event={event} onMoreInfo={() => setDrawerOpen(true)} />

      <EventInfoBar
        label="Important Info"
        text={event.description}
        onExpand={() => setDrawerOpen(true)}
      />

      <MainContent>
        {/* ── More Dates sidebar ── */}
        <MoreDatesSidebar>
          <MoreDatesHeader>
            More Dates
            <button type="button" aria-label="Collapse dates">
              ‹
            </button>
          </MoreDatesHeader>
          <DateSlot $active type="button">
            <DateLabel $active>Mar 26</DateLabel>
            <DateDay>Thu</DateDay>
            <TimeChip $active>8:00pm</TimeChip>
          </DateSlot>
          <DateSlot type="button">
            <DateLabel>Mar 27</DateLabel>
            <DateDay>Fri</DateDay>
            <TimeChip>8:00pm</TimeChip>
          </DateSlot>
          <DateSlot type="button">
            <DateLabel>Mar 28</DateLabel>
            <DateDay>Sat</DateDay>
            <TimeChip>8:00pm</TimeChip>
          </DateSlot>
          <CalendarBtn type="button">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7v-5z" />
            </svg>
            Calendar
          </CalendarBtn>
        </MoreDatesSidebar>

        {/* ── Seat Map (Canvas) ── */}
        <MapArea>
          <SeatMapCanvas
            topology={topologyData}
            loading={topologyLoading}
            onSectionClick={(section) => setHighlightedSection(section)}
            highlightedSection={highlightedSection}
          />
          <LegendBar>
            <LegendToggle type="button">
              Legend
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
              </svg>
            </LegendToggle>
          </LegendBar>
        </MapArea>

        {/* ── Right Panel (Tabbed) ── */}
        <RightPanel>
          <RightPanelTabs>
            <RPTab
              $active={rightTab === "tickets"}
              onClick={() => setRightTab("tickets")}
              type="button"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M22 10V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v4c1.1 0 2 .9 2 2s-.9 2-2 2v4c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-4c-1.1 0-2-.9-2-2s.9-2 2-2z" />
              </svg>
              TICKETS
            </RPTab>
            <RPTab
              $active={rightTab === "traffic"}
              onClick={() => setRightTab("traffic")}
              type="button"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M3.5 18.5l6-6 4 4L22 6.92 20.59 5.5l-7.09 8.07-4-4L2 17l1.5 1.5z" />
              </svg>
              TRAFFIC
            </RPTab>
          </RightPanelTabs>
          <RPBody>
            {rightTab === "tickets" ? (
              <TicketsPanel event={event} viewMode="seatmap" />
            ) : (
              <TrafficDistribution />
            )}
          </RPBody>
        </RightPanel>
      </MainContent>

      <Footer>
        By continuing past this page, you agree to our{" "}
        <a href="/terms">terms of use</a>. |{" "}
        <a href="/cookies">Manage my cookies</a> | &copy; Ticketmaster 2026.
      </Footer>

      <EventInfoDrawer
        open={drawerOpen}
        event={event}
        onClose={() => setDrawerOpen(false)}
      />
    </PageContainer>
  );
};
