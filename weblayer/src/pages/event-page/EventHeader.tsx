import styled from "styled-components";
import { useI18n } from "../../i18n/I18nProvider";
import type { EventData } from "../../store/useEventStore";

const HeaderWrapper = styled.header`
  background: var(--color-black);
  color: var(--color-white);
  padding: 0.75rem 1.5rem;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  position: relative;
`;

const Thumbnail = styled.img`
  width: 56px;
  height: 56px;
  border-radius: 4px;
  object-fit: cover;
  flex-shrink: 0;
`;

const HeaderContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const Breadcrumbs = styled.nav`
  font-size: 0.8rem;
  color: #b0b0b0;
  margin-bottom: 0.35rem;

  a {
    color: inherit;
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }

  span {
    margin: 0 0.35rem;
  }
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 0.25rem;
`;

const Title = styled.h1`
  font-size: 1.15rem;
  font-weight: 700;
  margin: 0;
  letter-spacing: 0.02em;
`;

const PillButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 999px;
  color: var(--color-white);
  padding: 0.25rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;

  &:hover {
    border-color: rgba(255, 255, 255, 0.8);
    background: rgba(255, 255, 255, 0.08);
  }

  svg {
    width: 14px;
    height: 14px;
    fill: currentColor;
  }
`;

const MetaRow = styled.div`
  font-size: 0.85rem;
  color: #d6d6d6;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const VenueLink = styled.a`
  color: var(--color-primary);
  text-decoration: underline;
  font-weight: 500;
`;

const AgeBadge = styled.span`
  color: #949494;
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
  align-self: center;
`;

const LangButton = styled.button`
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  color: var(--color-white);
  padding: 0.3rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  display: flex;
  align-items: center;
  gap: 0.35rem;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }
`;

interface EventHeaderProps {
  event: EventData;
  onMoreInfo: () => void;
}

export const EventHeader = ({ event, onMoreInfo }: EventHeaderProps) => {
  const { t, locale } = useI18n();
  const dateStr = new Date(event.date).toLocaleDateString(
    locale === "en" ? "sv-SE" : locale,
    {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );

  return (
    <HeaderWrapper>
      <Thumbnail src={event.imageUrl} alt={event.name} />
      <HeaderContent>
        <Breadcrumbs aria-label="Breadcrumb">
          <a href="/">{t("common.home")}</a>
          <span aria-hidden="true">/</span>
          <a href={`/#${event.category.toLowerCase()}`}>{event.category}</a>
          <span aria-hidden="true">/</span>
          <a href={`/#${event.subcategory.toLowerCase()}`}>
            {event.subcategory}
          </a>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{event.artistName}</span>
        </Breadcrumbs>

        <TitleRow>
          <Title>{event.name}</Title>
          <PillButton type="button" onClick={onMoreInfo}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
            </svg>
            {t("eventPage.moreInfo")}
          </PillButton>
          <PillButton type="button">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            {t("eventPage.accessibilityTickets")}
          </PillButton>
        </TitleRow>

        <MetaRow>
          <span>{dateStr}</span>
          <VenueLink to={`/venue/${event.venueSlug}`}>
            {event.venue}, {event.city}
          </VenueLink>
          <AgeBadge>
            {t("eventPage.ageLimit")}: {event.ageLimit}
          </AgeBadge>
        </MetaRow>
      </HeaderContent>

      <HeaderRight>
        <LangButton type="button">🌍 SE</LangButton>
        <LangButton type="button">SV</LangButton>
      </HeaderRight>
    </HeaderWrapper>
  );
};
