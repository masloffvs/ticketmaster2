import styled from "styled-components";
import { useI18n } from "../../i18n/I18nProvider";
import type { EventData, TicketType } from "../../store/useEventStore";
import { useEventStore } from "../../store/useEventStore";
import { useTmDataStore } from "../../store/useTmDataStore";

const Panel = styled.aside`
  width: 100%;
  height: 100%;
  background: var(--color-white);
  display: flex;
  flex-direction: column;
  border-left: 1px solid #e0e0e0;
  overflow-y: auto;
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid #e0e0e0;

  svg {
    width: 20px;
    height: 20px;
    fill: var(--color-black);
  }
`;

const PanelTitle = styled.h2`
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ExpandArrow = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;

  svg {
    width: 20px;
    height: 20px;
    fill: #555;
  }
`;

const SearchHeader = styled.div`
  padding: 1.25rem;
  text-align: center;

  h3 {
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0 0 0.75rem;
  }
`;

const FilterRow = styled.div`
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  flex-wrap: wrap;
`;

const FilterPill = styled.button`
  background: transparent;
  border: 1px solid #d0d0d0;
  border-radius: 999px;
  padding: 0.35rem 1rem;
  font-size: 0.8rem;
  font-family: inherit;
  cursor: pointer;
  color: #555;
  display: flex;
  align-items: center;
  gap: 0.35rem;

  svg {
    width: 14px;
    height: 14px;
    fill: currentColor;
  }

  &:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
  }
`;

const TicketSection = styled.div`
  padding: 1rem 1.25rem;
`;

const TicketRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 0;
`;

const TicketInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const TicketDot = styled.span`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--color-primary);
  flex-shrink: 0;
`;

const TicketLabel = styled.div`
  font-weight: 700;
  font-size: 0.95rem;
`;

const TicketPrice = styled.div`
  font-size: 0.85rem;
  color: #555;
`;

const QuantityControl = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const QtyButton = styled.button<{ $variant?: "add" | "remove" }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid
    ${(p) => (p.$variant === "add" ? "var(--color-primary)" : "#d0d0d0")};
  background: ${(p) =>
    p.$variant === "add" ? "var(--color-primary)" : "transparent"};
  color: ${(p) => (p.$variant === "add" ? "var(--color-white)" : "#d0d0d0")};
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: inherit;

  &:hover:not(:disabled) {
    opacity: 0.85;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const QtyValue = styled.span`
  font-size: 1rem;
  font-weight: 600;
  min-width: 1.5rem;
  text-align: center;
`;

const FeeNote = styled.div`
  font-size: 0.8rem;
  color: #949494;
  padding: 0.25rem 1.25rem;
  border-bottom: 1px solid #e0e0e0;
`;

const AdminFeeNote = styled.div`
  font-size: 0.8rem;
  color: var(--color-primary);
  padding: 0.5rem 1.25rem;
  border-bottom: 1px solid #e0e0e0;
`;

const SummaryRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.25rem;

  svg {
    width: 18px;
    height: 18px;
    fill: #555;
  }
`;

const SummaryLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #555;
`;

const LimitBadge = styled.span`
  font-size: 0.8rem;
  color: #949494;
`;

const FindButton = styled.button`
  display: block;
  width: calc(100% - 2.5rem);
  margin: 0 1.25rem 1rem;
  padding: 0.85rem;
  background: #048851;
  color: var(--color-white);
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;

  &:hover {
    background: #037743;
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
`;

const ResaleSection = styled.div`
  padding: 1rem 1.25rem;
  border-top: 3px solid #c4007a;
`;

const ResaleTitle = styled.h3`
  font-size: 0.95rem;
  font-weight: 700;
  margin: 0 0 0.25rem;
`;

const ResaleSubtitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 700;
  margin-bottom: 0.5rem;

  svg {
    width: 18px;
    height: 18px;
  }
`;

const ResaleNote = styled.p`
  font-size: 0.8rem;
  color: #555;
  margin: 0;
  line-height: 1.5;
`;

const EmptyState = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #949494;
  padding: 2rem;
  text-align: center;
  gap: 0.5rem;

  svg {
    width: 48px;
    height: 48px;
    fill: #555;
  }
`;

const ManifestSectionBlock = styled.div`
  border-top: 1px solid #e0e0e0;
  padding: 0.75rem 1.25rem;
`;

const ManifestSectionTitle = styled.div`
  font-size: 0.85rem;
  font-weight: 700;
  color: #333;
  margin-bottom: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ManifestBadge = styled.span`
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-primary);
  background: rgba(2, 77, 223, 0.08);
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
`;

const ManifestPriceRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.25rem 0;
  font-size: 0.82rem;
  color: #555;
`;

const ManifestLabel = styled.div`
  font-size: 0.8rem;
  font-weight: 700;
  color: #026cdf;
  padding: 0.75rem 1.25rem 0.25rem;
  border-top: 2px solid #026cdf;
  display: flex;
  align-items: center;
  gap: 0.4rem;
`;

const ManifestLoading = styled.div`
  padding: 1rem 1.25rem;
  font-size: 0.8rem;
  color: #949494;
  text-align: center;
`;

interface TicketsPanelProps {
  event: EventData;
  viewMode: "seatmap" | "bestAvailable";
}

const TicketItem = ({ ticket }: { ticket: TicketType }) => {
  const { selectedTickets, setTicketQuantity } = useEventStore();
  const qty = selectedTickets[ticket.id] || 0;

  return (
    <TicketRow>
      <TicketInfo>
        <TicketDot />
        <div>
          <TicketLabel>{ticket.label}</TicketLabel>
          <TicketPrice>
            {ticket.price.toLocaleString("sv-SE")}, {String(0).padStart(2, "0")}{" "}
            {ticket.currency} per biljett
          </TicketPrice>
        </div>
      </TicketInfo>
      <QuantityControl>
        <QtyButton
          $variant="remove"
          type="button"
          disabled={qty <= 0}
          onClick={() => setTicketQuantity(ticket.id, qty - 1)}
          aria-label="Decrease quantity"
        >
          −
        </QtyButton>
        <QtyValue>{qty}</QtyValue>
        <QtyButton
          $variant="add"
          type="button"
          onClick={() => setTicketQuantity(ticket.id, qty + 1)}
          aria-label="Increase quantity"
        >
          +
        </QtyButton>
      </QuantityControl>
    </TicketRow>
  );
};

export const TicketsPanel = ({ event, viewMode }: TicketsPanelProps) => {
  const { t } = useI18n();
  const totalTickets = useEventStore((s) => s.totalTickets());
  const { manifest, manifestLoading } = useTmDataStore();

  const manifestSection = manifest && manifest.sections.length > 0 && (
    <>
      <ManifestLabel>
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="#026cdf"
          aria-hidden="true"
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
        </svg>
        LIVE MANIFEST ({manifest.sections.length} sections)
      </ManifestLabel>
      {manifest.sections.map((section) => (
        <ManifestSectionBlock key={section.id}>
          <ManifestSectionTitle>
            {section.name || section.id}
            {section.availableCount != null && (
              <ManifestBadge>{section.availableCount} available</ManifestBadge>
            )}
          </ManifestSectionTitle>
          {section.priceLevels.map((pl) => (
            <ManifestPriceRow key={pl.id}>
              <span>{pl.name || `Level ${pl.id}`}</span>
              <span>
                {pl.total.toLocaleString("sv-SE")} {pl.currency}
                {pl.fees > 0 && (
                  <span style={{ color: "#949494", fontSize: "0.75rem" }}>
                    {" "}
                    (ink. {pl.fees.toLocaleString("sv-SE")} avgift)
                  </span>
                )}
              </span>
            </ManifestPriceRow>
          ))}
        </ManifestSectionBlock>
      ))}
    </>
  );

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22 10V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v4c1.1 0 2 .9 2 2s-.9 2-2 2v4c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-4c-1.1 0-2-.9-2-2s.9-2 2-2z" />
          </svg>
          {t("eventPage.tickets")}
        </PanelTitle>
        <ExpandArrow type="button" aria-label="Expand">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
          </svg>
        </ExpandArrow>
      </PanelHeader>

      {viewMode === "bestAvailable" ? (
        <>
          <SearchHeader>
            <h3>{t("eventPage.searchTickets")}</h3>
            <FilterRow>
              <FilterPill type="button">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z" />
                </svg>
              </FilterPill>
              <FilterPill type="button">{t("eventPage.allPrices")}</FilterPill>
              <FilterPill type="button">
                {t("eventPage.allSections")}
              </FilterPill>
            </FilterRow>
          </SearchHeader>

          <TicketSection>
            {event.tickets.map((ticket) => (
              <TicketItem key={ticket.id} ticket={ticket} />
            ))}
          </TicketSection>

          <FeeNote>
            {t("eventPage.priceIncludes")} {event.serviceFee},
            {String(0).padStart(2, "0")} {event.currency}{" "}
            {t("eventPage.inServiceFees")}
          </FeeNote>
          <AdminFeeNote>{t("eventPage.adminFeeNote")}</AdminFeeNote>

          <SummaryRow>
            <SummaryLeft>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22 10V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v4c1.1 0 2 .9 2 2s-.9 2-2 2v4c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-4c-1.1 0-2-.9-2-2s.9-2 2-2z" />
              </svg>
              ×{totalTickets}
            </SummaryLeft>
            <LimitBadge>
              {t("eventPage.ticketLimit")}: {event.ticketLimit}
            </LimitBadge>
          </SummaryRow>

          <FindButton type="button">{t("eventPage.findTickets")}</FindButton>

          {event.hasResale && (
            <ResaleSection>
              <ResaleTitle>{t("eventPage.moreOptions")}</ResaleTitle>
              <ResaleSubtitle>
                <svg viewBox="0 0 24 24" fill="#c4007a" aria-hidden="true">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                {t("eventPage.verifiedResale")}
              </ResaleSubtitle>
              <ResaleNote>{t("eventPage.resaleNote")}</ResaleNote>
            </ResaleSection>
          )}

          {manifestLoading && (
            <ManifestLoading>Loading availability…</ManifestLoading>
          )}
          {manifestSection}
        </>
      ) : (
        <>
          <PanelHeader>
            <FilterRow>
              <FilterPill type="button">{t("eventPage.allOptions")}</FilterPill>
            </FilterRow>
          </PanelHeader>
          <EmptyState>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V9l-6-6zM5 19V5h9v5h5v9H5z" />
            </svg>
            <div>{t("eventPage.selectSeats")}</div>
            <div style={{ fontSize: "0.8rem" }}>
              {t("eventPage.seatsAddedHere")}
            </div>
          </EmptyState>
          {manifestLoading && (
            <ManifestLoading>Loading availability…</ManifestLoading>
          )}
          {manifestSection}
        </>
      )}
    </Panel>
  );
};
