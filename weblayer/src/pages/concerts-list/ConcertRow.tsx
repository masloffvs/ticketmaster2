import styled from "styled-components";
import { Button } from "../../design-system";
import { useI18n } from "../../i18n/I18nProvider";
import type { ConcertEvent } from "../../store/useArtistStore";

const EventRow = styled.li<{ $isPromoted?: boolean }>`
  display: flex;
  align-items: stretch;
  padding: 1.5rem 0;
  border-bottom: 1px solid #e2e8f0;
  background: ${(props) => (props.$isPromoted ? "#eff4fa" : "transparent")};
  margin: ${(props) => (props.$isPromoted ? "0 -1.5rem" : "0")};
  padding-left: ${(props) => (props.$isPromoted ? "1.5rem" : "0")};
  padding-right: ${(props) => (props.$isPromoted ? "1.5rem" : "0")};

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
  }
`;

const DateBox = styled.div`
  min-width: 80px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  padding-right: 1.5rem;

  .month {
    font-size: 0.85rem;
    color: #767676;
    text-transform: uppercase;
    font-weight: 500;
  }

  .day {
    font-size: 1.5rem;
    font-weight: 400;
  }
`;

const EventDetails = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  padding-right: 1.5rem;
`;

const DateDetails = styled.div`
  font-size: 0.85rem;
  color: #767676;
  margin-bottom: 0.3rem;
`;

const LocationVenue = styled.div`
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 0.3rem;
`;

const Subtitle = styled.div`
  font-size: 0.9rem;
  color: #767676;
`;

const PromoBadge = styled.div`
  background: var(--color-black);
  color: white;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.2rem 0.4rem;
  border-radius: 2px;
  display: inline-block;
  margin-bottom: 0.5rem;
`;

const PromoIcon = styled.div`
  width: 60px;
  height: 60px;
  background: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: serif;
  font-style: italic;
  font-size: 2.5rem;
  font-weight: bold;
  border-radius: 4px;
`;

interface ConcertRowProps {
  event: ConcertEvent;
}

export const ConcertRow = ({ event }: ConcertRowProps) => {
  const { t } = useI18n();

  if (event.isPromoted) {
    return (
      <EventRow $isPromoted>
        <div style={{ paddingRight: "1.5rem" }}>
          <PromoIcon aria-hidden="true">t</PromoIcon>
        </div>
        <EventDetails>
          <div>
            <PromoBadge>{t("concertsList.promoted")}</PromoBadge>
          </div>
          <LocationVenue>{t("concertsList.appTitle")}</LocationVenue>
          <Subtitle>{event.subtitle}</Subtitle>
        </EventDetails>
        <div style={{ alignSelf: "center" }}>
          <Button type="button" variant="secondary">
            {t("common.learnMore")}
          </Button>
        </div>
      </EventRow>
    );
  }

  return (
    <EventRow>
      <DateBox aria-label={`${event.month} ${event.day}`}>
        <div className="month">{event.month}</div>
        <div className="day">{event.day}</div>
      </DateBox>
      <EventDetails>
        <DateDetails>{event.dateDetails}</DateDetails>
        <LocationVenue>
          {event.location} • {event.venue}
        </LocationVenue>
        <Subtitle>{event.subtitle}</Subtitle>
      </EventDetails>
      <div style={{ alignSelf: "center" }}>
        <Button type="button">{t("concertsList.findTickets")}</Button>
      </div>
    </EventRow>
  );
};
