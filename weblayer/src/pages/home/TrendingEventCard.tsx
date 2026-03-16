import styled from "styled-components";
import { useI18n } from "../../i18n/I18nProvider";
import type { HomeEvent } from "./types";

const CardButton = styled.button`
  background: white;
  border-radius: 8px;
  padding: 1.2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
  border: none;
  text-align: left;
  font-family: inherit;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
  }
`;

const EventImagePlaceholder = styled.div`
  background-color: #e2e8f0;
  height: 160px;
  border-radius: 6px;
  margin-bottom: 1.2rem;
`;

const EventTitle = styled.div`
  font-weight: 700;
  font-size: 1.1rem;
  margin-bottom: 0.8rem;
  line-height: 1.3;
`;

const EventMeta = styled.div`
  color: #64748b;
  font-size: 0.9rem;
  margin-bottom: 0.4rem;
`;

const EventPrice = styled.div`
  margin-top: 1.2rem;
  font-weight: 700;
  color: #026cdf;
  font-size: 1.1rem;
`;

interface TrendingEventCardProps {
  event: HomeEvent;
  onSelect: (event: HomeEvent) => void;
}

export const TrendingEventCard = ({ event, onSelect }: TrendingEventCardProps) => {
  const { t } = useI18n();

  return (
    <CardButton
      type="button"
      aria-label={`Open event page for ${event.title}`}
      onClick={() => onSelect(event)}
    >
      <EventImagePlaceholder aria-hidden="true" />
      <EventTitle>{event.title}</EventTitle>
      <EventMeta>
        <span aria-hidden="true">📅</span> {event.date}
      </EventMeta>
      <EventMeta>
        <span aria-hidden="true">📍</span> {event.venue}
      </EventMeta>
      <EventPrice>{t("homePage.fromPrice", { price: event.price })}</EventPrice>
    </CardButton>
  );
};
