import { useEffect, useRef } from "react";
import styled, { keyframes } from "styled-components";
import { useI18n } from "../../i18n/I18nProvider";
import type { EventData } from "../../store/useEventStore";

const slideIn = keyframes`
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
`;

const Overlay = styled.div<{ $open: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: ${(p) => (p.$open ? "block" : "none")};
`;

const Backdrop = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
`;

const Drawer = styled.div`
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 500px;
  max-width: 90vw;
  background: var(--color-white);
  animation: ${slideIn} 0.25s ease-out;
  overflow-y: auto;
  display: flex;
  flex-direction: column;

  @media (max-width: 640px) {
    width: 100vw;
    max-width: 100vw;
  }
`;

const DrawerHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #e0e0e0;
  position: sticky;
  top: 0;
  background: var(--color-white);
  z-index: 1;

  @media (max-width: 640px) {
    padding: 0.9rem 1rem;
  }
`;

const BackButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  color: var(--color-black);

  svg {
    width: 24px;
    height: 24px;
    fill: currentColor;
  }
`;

const DrawerTitle = styled.h2`
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
`;

const DrawerBody = styled.div`
  padding: 1.25rem;
  flex: 1;

  @media (max-width: 640px) {
    padding: 1rem;
  }
`;

const EventTitle = styled.h3`
  font-size: 1.15rem;
  font-weight: 700;
  margin: 0 0 1rem;
`;

const MetaItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  font-size: 0.9rem;

  svg {
    width: 20px;
    height: 20px;
    fill: #555;
    flex-shrink: 0;
    margin-top: 1px;
  }
`;

const MetaLabel = styled.span`
  color: #949494;
  font-size: 0.8rem;
`;

const VenueLink = styled.a`
  color: var(--color-primary);
  text-decoration: underline;
`;

const Section = styled.section`
  margin-top: 1.5rem;

  h4 {
    font-size: 0.95rem;
    font-weight: 700;
    margin: 0 0 0.5rem;
  }

  p {
    font-size: 0.88rem;
    line-height: 1.6;
    margin: 0 0 0.75rem;
    color: #333;
  }
`;

const RelatedArtist = styled.a`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none;
  color: var(--color-primary);
  font-weight: 600;
  font-size: 0.9rem;
  padding: 0.5rem 0;

  img {
    width: 48px;
    height: 48px;
    border-radius: 4px;
    object-fit: cover;
  }
`;

interface EventInfoDrawerProps {
  open: boolean;
  event: EventData;
  onClose: () => void;
}

export const EventInfoDrawer = ({
  open,
  event,
  onClose,
}: EventInfoDrawerProps) => {
  const { t, locale } = useI18n();
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

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
    <Overlay
      $open={open}
      role="dialog"
      aria-modal="true"
      aria-label={t("eventPage.eventInfo")}
    >
      <Backdrop onClick={onClose} />
      <Drawer ref={drawerRef}>
        <DrawerHeader>
          <BackButton
            type="button"
            onClick={onClose}
            aria-label={t("eventPage.back")}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z" />
            </svg>
          </BackButton>
          <DrawerTitle>{t("eventPage.eventInfo")}</DrawerTitle>
        </DrawerHeader>

        <DrawerBody>
          <EventTitle>{event.name}</EventTitle>

          <MetaItem>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z" />
            </svg>
            <div>
              <MetaLabel>{t("eventPage.dateLabel")}</MetaLabel>
              <div>{dateStr}</div>
            </div>
          </MetaItem>

          <MetaItem>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" />
            </svg>
            <div>
              <MetaLabel>{t("eventPage.venueLabel")}</MetaLabel>
              <div>
                <VenueLink href={`/venue/${event.venueSlug}`}>
                  {event.venue}
                </VenueLink>
                , {event.city}
              </div>
            </div>
          </MetaItem>

          <Section>
            <h4>{t("eventPage.eventInfo")}:</h4>
            <p>{event.description}</p>
            <p>
              <strong>{t("eventPage.performers")}:</strong>
              <br />
              {event.performers.join("\n")}
            </p>
            <p>
              {t("eventPage.organizedBy")}:
              <br />
              {event.organizer}
            </p>
            <p>
              {event.ageLimit} {t("eventPage.ageLimitSuffix")}
            </p>
          </Section>

          <Section>
            <h4>{t("eventPage.sellingOrg")}</h4>
            <p>
              Scalateatern Karlstad Västra Torggatan 1, 652 25, Karlstad,
              Sverige
            </p>
          </Section>

          <Section>
            <h4>{t("eventPage.ticketFees")}</h4>
            <p>
              {t("eventPage.priceIncludes")} {event.serviceFee},
              {String(0).padStart(2, "0")} {event.currency}{" "}
              {t("eventPage.inServiceFees")}
            </p>
            <p>{t("eventPage.adminFeeNote")}</p>
          </Section>

          <Section>
            <h4>{t("eventPage.deliveryFees")}</h4>
            <p>
              {t("eventPage.deliveryInfo")}
              <br />
              eBiljett: 0,00 {event.currency}
            </p>
          </Section>

          <Section>
            <h4>{t("eventPage.related")}</h4>
            <RelatedArtist href={`/artist/${event.artistSlug}`}>
              <img src={event.imageUrl} alt={event.artistName} />
              {event.artistName}
            </RelatedArtist>
          </Section>

          <Section>
            <h4>{t("eventPage.ticketLimit")}</h4>
            <p>
              {t("eventPage.ticketLimitDesc", {
                count: String(event.ticketLimit),
              })}
            </p>
          </Section>
        </DrawerBody>
      </Drawer>
    </Overlay>
  );
};
