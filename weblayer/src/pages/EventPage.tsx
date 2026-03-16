import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import styled from "styled-components";
import { useI18n } from "../i18n/I18nProvider";
import { useEventStore } from "../store/useEventStore";
import { useTmDataStore } from "../store/useTmDataStore";
import { EventHeader } from "./event-page/EventHeader";
import { EventInfoBar } from "./event-page/EventInfoBar";
import { EventInfoDrawer } from "./event-page/EventInfoDrawer";
import { TicketsPanel } from "./event-page/TicketsPanel";
import { VenueMap } from "./event-page/VenueMap";

const PageContainer = styled.div`
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
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
`;

const LeftPanel = styled.div`
  flex: 2;
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

const RightPanel = styled.div`
  flex: 1;
  min-width: 340px;
  max-width: 420px;
`;

const SpaBanner = styled.div`
  background: #026cdf;
  color: #fff;
  text-align: center;
  padding: 10px 0;
  font-weight: 700;
  font-size: 1rem;
  letter-spacing: 1px;
`;

export const EventPage = () => {
  const { eventId } = useParams();
  const { t } = useI18n();
  const { event, isLoading, error, fetchEvent } = useEventStore();
  const { fetchAll: fetchTmData, reset: resetTmData } = useTmDataStore();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"seatmap" | "bestAvailable">(
    "seatmap",
  );

  useEffect(() => {
    if (eventId) {
      fetchEvent(eventId);
      fetchTmData(eventId);
    }
    return () => resetTmData();
  }, [eventId, fetchEvent, fetchTmData, resetTmData]);

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
      <SpaBanner>YOU ARE IN SPA!</SpaBanner>
      <EventHeader event={event} onMoreInfo={() => setDrawerOpen(true)} />

      <EventInfoBar
        label="Viktig info"
        text={event.description}
        onExpand={() => setDrawerOpen(true)}
      />

      <MainContent>
        <LeftPanel>
          <VenueMap onViewChange={setViewMode} />
        </LeftPanel>
        <RightPanel>
          <TicketsPanel event={event} viewMode={viewMode} />
        </RightPanel>
      </MainContent>

      <EventInfoDrawer
        open={drawerOpen}
        event={event}
        onClose={() => setDrawerOpen(false)}
      />
    </PageContainer>
  );
};
