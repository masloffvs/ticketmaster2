import { useState } from "react";
import styled from "styled-components";
import type { EventData } from "../../store/useEventStore";
import { useTmDataStore } from "../../store/useTmDataStore";

/* ── Layout ──────────────────────────────────────────────────── */

const Panel = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  overflow-y: auto;
`;

/* ── Quantity + Filters row ──────────────────────────────────── */

const TopControls = styled.div`
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-bottom: 1px solid #e0e0e0;

  @media (max-width: 640px) {
    flex-wrap: wrap;
  }
`;

const QuantitySelect = styled.select`
  padding: 0.45rem 2rem 0.45rem 0.65rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.85rem;
  font-family: inherit;
  font-weight: 600;
  background: #fff;
  cursor: pointer;
  appearance: auto;
  flex: 1;
  min-width: 0;
`;

const FiltersBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0.45rem 0.75rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fff;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;

  svg {
    width: 16px;
    height: 16px;
    fill: currentColor;
  }

  &:hover {
    background: #f5f5f5;
  }
`;

/* ── Price range slider ──────────────────────────────────────── */

const PriceRangeRow = styled.div`
  padding: 0.5rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-bottom: 1px solid #e0e0e0;

  @media (max-width: 640px) {
    flex-wrap: wrap;
  }
`;

const PriceInput = styled.input`
  width: 52px;
  padding: 0.3rem 0.4rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.8rem;
  font-family: inherit;
  text-align: center;
  font-weight: 600;

  @media (max-width: 640px) {
    width: 64px;
  }
`;

const PriceSlider = styled.input`
  flex: 1;
  height: 4px;
  appearance: none;
  background: #e0e0e0;
  border-radius: 2px;
  outline: none;

  &::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #fff;
    border: 2px solid #026cdf;
    cursor: pointer;
  }

  @media (max-width: 640px) {
    min-width: 100%;
    order: 3;
  }
`;

/* ── Tabs (LOWEST PRICE / BEST SEATS) ────────────────────────── */

const TabRow = styled.div`
  display: flex;
  border-bottom: 2px solid #e0e0e0;
`;

const Tab = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 0.65rem 0;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  color: ${(p) => (p.$active ? "#333" : "#999")};
  border-bottom: 2px solid ${(p) => (p.$active ? "#333" : "transparent")};
  margin-bottom: -2px;

  &:hover {
    color: #333;
  }

  @media (max-width: 520px) {
    font-size: 0.68rem;
    padding: 0.7rem 0.35rem;
  }
`;

/* ── All-in disclaimer ───────────────────────────────────────── */

const AllInRow = styled.div`
  padding: 0.5rem 1rem;
  font-size: 0.75rem;
  color: #555;
  border-bottom: 1px solid #e0e0e0;
  line-height: 1.5;

  a {
    color: #026cdf;
    text-decoration: underline;
    cursor: pointer;
  }
`;

/* ── PayPal banner ───────────────────────────────────────────── */

const PayPalRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 1rem;
  border-bottom: 1px solid #e0e0e0;

  @media (max-width: 520px) {
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: flex-start;
  }
`;

const PayPalLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: #333;
  min-width: 0;
  flex-wrap: wrap;
`;

const PayPalLogo = styled.span`
  font-weight: 800;
  font-size: 0.9rem;
  color: #003087;
  font-style: italic;
`;

const MoreInfoLink = styled.button`
  background: none;
  border: none;
  color: #026cdf;
  font-weight: 600;
  font-size: 0.82rem;
  cursor: pointer;
  font-family: inherit;

  &:hover {
    text-decoration: underline;
  }
`;

/* ── Ticket list items ───────────────────────────────────────── */

const TicketListWrap = styled.div`
  flex: 1;
`;

const TicketItemBtn = styled.button`
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  align-items: center;
  width: 100%;
  padding: 0.65rem 1rem;
  border: none;
  border-bottom: 1px solid #f0f0f0;
  background: #fff;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  gap: 0.75rem;
  transition: background 0.15s;

  &:hover {
    background: #f5f8ff;
  }

  @media (max-width: 520px) {
    grid-template-columns: 48px minmax(0, 1fr);
    align-items: flex-start;
  }
`;

const SeatViewThumb = styled.div`
  grid-column: 1;
  width: 48px;
  height: 48px;
  border-radius: 4px;
  background: #e8e8e8;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 28px;
    height: 28px;
    fill: #999;
  }

  @media (max-width: 520px) {
    grid-row: 1 / span 2;
  }
`;

const TicketInfoWrap = styled.div`
  grid-column: 2;
  flex: 1;
  min-width: 0;
`;

const TicketSectionLabel = styled.div`
  font-size: 0.85rem;
  font-weight: 700;
  color: #333;
  overflow-wrap: anywhere;
`;

const TicketTypeLabel = styled.div`
  font-size: 0.78rem;
  color: #777;
  overflow-wrap: anywhere;
`;

const TicketPriceLabel = styled.div`
  grid-column: 3;
  font-size: 0.9rem;
  font-weight: 700;
  color: #333;
  white-space: nowrap;
  justify-self: end;

  @media (max-width: 520px) {
    grid-column: 2;
    grid-row: 2;
    justify-self: start;
    margin-top: -0.15rem;
  }
`;

/* ── Mock ticket data ────────────────────────────────────────── */

const MOCK_TICKETS = [
  {
    id: "1",
    section: "MEZL",
    row: "H",
    type: "Standard Admission",
    price: 61.04,
  },
  {
    id: "2",
    section: "MEZL",
    row: "J",
    type: "Standard Admission",
    price: 61.04,
  },
  {
    id: "3",
    section: "MEZR",
    row: "H",
    type: "Standard Admission",
    price: 61.04,
  },
  {
    id: "4",
    section: "MEZR",
    row: "J",
    type: "Standard Admission",
    price: 61.04,
  },
  {
    id: "5",
    section: "MEZR",
    row: "E",
    type: "Standard Admission",
    price: 77.98,
  },
  {
    id: "6",
    section: "MEZR",
    row: "F",
    type: "Standard Admission",
    price: 77.98,
  },
  {
    id: "7",
    section: "MEZR",
    row: "G",
    type: "Standard Admission",
    price: 77.98,
  },
  {
    id: "8",
    section: "MEZL",
    row: "E",
    type: "Standard Admission",
    price: 77.98,
  },
  {
    id: "9",
    section: "MEZL",
    row: "F",
    type: "Standard Admission",
    price: 77.98,
  },
  {
    id: "10",
    section: "MEZL",
    row: "G",
    type: "Standard Admission",
    price: 77.98,
  },
  {
    id: "11",
    section: "MEZC",
    row: "G",
    type: "Standard Admission",
    price: 77.98,
  },
  {
    id: "12",
    section: "MEZC",
    row: "H",
    type: "Standard Admission",
    price: 77.98,
  },
  {
    id: "13",
    section: "ORCHC",
    row: "Q",
    type: "Standard Admission",
    price: 90.51,
  },
  {
    id: "14",
    section: "ORCHC",
    row: "R",
    type: "Standard Admission",
    price: 90.51,
  },
  {
    id: "15",
    section: "ORCHC",
    row: "S",
    type: "Standard Admission",
    price: 90.51,
  },
  {
    id: "16",
    section: "ORCHR",
    row: "Q",
    type: "Standard Admission",
    price: 90.51,
  },
  {
    id: "17",
    section: "ORCHR",
    row: "R",
    type: "Standard Admission",
    price: 90.51,
  },
  {
    id: "18",
    section: "ORCHR",
    row: "S",
    type: "Standard Admission",
    price: 90.51,
  },
  {
    id: "19",
    section: "ORCHL",
    row: "Q",
    type: "Standard Admission",
    price: 90.51,
  },
  {
    id: "20",
    section: "ORCHL",
    row: "R",
    type: "Standard Admission",
    price: 90.51,
  },
];

/* ── Component ──────────────────────────────────────────────── */

interface TicketsPanelProps {
  event: EventData;
  viewMode: "seatmap" | "bestAvailable";
}

export const TicketsPanel = (_props: TicketsPanelProps) => {
  const [quantity, setQuantity] = useState(2);
  const [activeTab, setActiveTab] = useState<"lowest" | "best">("lowest");
  const [maxPrice, setMaxPrice] = useState(243);
  const { manifest, manifestLoading } = useTmDataStore();

  const minPrice = 65;

  // Build ticket list from manifest sections if available, else mock
  const tickets = manifest?.sections?.length
    ? manifest.sections.flatMap((sec) =>
        sec.priceLevels.map((pl, i) => ({
          id: `${sec.id}-${pl.id}`,
          section: sec.name || sec.id,
          row: String.fromCharCode(65 + i),
          type: pl.name || "Standard Admission",
          price: pl.total,
        })),
      )
    : MOCK_TICKETS;

  const sortedTickets =
    activeTab === "lowest"
      ? [...tickets].sort((a, b) => a.price - b.price)
      : [...tickets].sort((a, b) => b.price - a.price);

  const filteredTickets = sortedTickets.filter(
    (t) => t.price >= minPrice && t.price <= maxPrice,
  );

  return (
    <Panel>
      {/* Quantity + Filters */}
      <TopControls>
        <QuantitySelect
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          aria-label="Ticket quantity"
        >
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? "Ticket" : "Tickets"}
            </option>
          ))}
        </QuantitySelect>
        <FiltersBtn type="button">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z" />
          </svg>
          Filters
        </FiltersBtn>
      </TopControls>

      {/* Price slider */}
      <PriceRangeRow>
        <PriceInput
          value={`$${minPrice}`}
          readOnly
          aria-label="Minimum price"
        />
        <PriceSlider
          type="range"
          min={65}
          max={243}
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          aria-label="Maximum ticket price"
        />
        <PriceInput
          value={`$${maxPrice}+`}
          readOnly
          aria-label="Maximum price"
        />
      </PriceRangeRow>

      {/* Tabs */}
      <TabRow>
        <Tab
          $active={activeTab === "lowest"}
          onClick={() => setActiveTab("lowest")}
          type="button"
        >
          LOWEST PRICE
        </Tab>
        <Tab
          $active={activeTab === "best"}
          onClick={() => setActiveTab("best")}
          type="button"
        >
          BEST SEATS
        </Tab>
      </TabRow>

      {/* All-in note */}
      <AllInRow>
        We&apos;re <strong>All In</strong>:{" "}
        <a href="/pricing-info">Prices include fees</a> (before taxes).
      </AllInRow>

      {/* PayPal */}
      <PayPalRow>
        <PayPalLeft>
          <PayPalLogo>PayPal</PayPalLogo>
          Buy Now, Pay Later
        </PayPalLeft>
        <MoreInfoLink type="button">More Info</MoreInfoLink>
      </PayPalRow>

      {/* Ticket list */}
      <TicketListWrap role="list" aria-label="Available tickets">
        {manifestLoading && (
          <div
            style={{
              padding: "1rem",
              textAlign: "center",
              color: "#999",
              fontSize: "0.85rem",
            }}
          >
            Loading availability…
          </div>
        )}
        {filteredTickets.map((ticket) => (
          <TicketItemBtn key={ticket.id} role="listitem" type="button">
            <SeatViewThumb>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 18h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2zm0-10h16v8H4V8z" />
              </svg>
            </SeatViewThumb>
            <TicketInfoWrap>
              <TicketSectionLabel>
                Sec {ticket.section} &bull; Row {ticket.row}
              </TicketSectionLabel>
              <TicketTypeLabel>{ticket.type}</TicketTypeLabel>
            </TicketInfoWrap>
            <TicketPriceLabel>${ticket.price.toFixed(2)}</TicketPriceLabel>
          </TicketItemBtn>
        ))}
      </TicketListWrap>
    </Panel>
  );
};
