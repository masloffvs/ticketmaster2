import { useState } from "react";
import styled from "styled-components";
import { useI18n } from "../i18n/I18nProvider";
import { useArtistStore } from "../store/useArtistStore";
import { ConcertFilters } from "./concerts-list/ConcertFilters";
import { ConcertListHeader } from "./concerts-list/ConcertListHeader";
import { ConcertRow } from "./concerts-list/ConcertRow";

const FiltersLabel = styled.h3`
  font-size: 1.1rem;
  font-weight: 700;
  margin-top: 2rem;
  margin-bottom: 1rem;
`;

const EventList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const EmptyState = styled.p`
  color: #767676;
  margin: 1rem 0 0;
`;

export const ConcertsList = () => {
  const { events } = useArtistStore();
  const { t } = useI18n();
  const [locationQuery, setLocationQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");

  const normalizedLocation = locationQuery.trim().toLowerCase();
  const filteredEvents = events.filter((event) => {
    if (event.isPromoted) {
      return true;
    }

    const matchesLocation =
      !normalizedLocation ||
      `${event.location} ${event.venue}`.toLowerCase().includes(normalizedLocation);
    const matchesDate =
      dateFilter !== "weekend" ||
      event.dateDetails.includes("Sat") ||
      event.dateDetails.includes("Sun");

    return matchesLocation && matchesDate;
  });

  const visibleConcertCount = filteredEvents.filter((event) => !event.isPromoted).length;

  return (
    <section aria-labelledby="concerts-list-title">
      <ConcertListHeader resultCount={visibleConcertCount} />

      <ConcertFilters
        dateFilter={dateFilter}
        locationQuery={locationQuery}
        onDateFilterChange={setDateFilter}
        onLocationQueryChange={setLocationQuery}
      />

      <FiltersLabel id="concerts-list-title">
        {t("concertsList.concertsIn", { country: t("common.unitedStates") })}
      </FiltersLabel>

      {filteredEvents.length > 0 ? (
        <EventList aria-live="polite">
          {filteredEvents.map((event) => (
            <ConcertRow key={event.id} event={event} />
          ))}
        </EventList>
      ) : (
        <EmptyState aria-live="polite">No concerts match the current filters.</EmptyState>
      )}
    </section>
  );
};
