import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";

interface EventOption {
  id: string;
  name: string;
  date: string | null;
}

interface PartnerOption {
  id: string;
  email: string;
  name: string | null;
}

interface OrderSummary {
  id: string;
  publicOrderNo: string;
  status: string;
  channel: string;
  buyerEmail: string | null;
  buyerName: string | null;
  currencyCode: string;
  totalMinor: number;
  eventId: string | null;
  externalEventId: string | null;
  partnerId: string | null;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

interface OrderDetail extends OrderSummary {
  items: Array<{
    id: string;
    lineNo: number;
    itemType: string;
    description: string | null;
    section: string | null;
    rowLabel: string | null;
    seatFrom: string | null;
    seatTo: string | null;
    quantity: number;
    currencyCode: string;
    unitPriceMinor: number;
    feesMinor: number;
    taxMinor: number;
    discountMinor: number;
    totalMinor: number;
  }>;
  timeline: Array<{
    id: string;
    eventType: string;
    actorType: string;
    actorId: string | null;
    payload: unknown;
    createdAt: string;
  }>;
  event: { id: string; name: string; date: string | null } | null;
  partner: { id: string; email: string; name: string | null } | null;
}

const Wrap = styled.div`
  padding: 8px 4px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: calc(100vh - 120px);
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: minmax(320px, 400px) minmax(0, 1fr);
  gap: 12px;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
`;

const Panel = styled.section`
  border-radius: 10px;
  background: #111;
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 16px;
  min-height: 0;
`;

const PanelTitle = styled.h3`
  margin: 0 0 6px;
  font-size: 0.92rem;
  color: rgba(255, 255, 255, 0.92);
`;

const PanelText = styled.p`
  margin: 0 0 14px;
  font-size: 0.74rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.52);
`;

const Form = styled.form`
  display: grid;
  gap: 10px;
`;

const Row = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const Label = styled.label`
  display: grid;
  gap: 6px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.45);
`;

const Input = styled.input`
  height: 36px;
  border: none;
  outline: none;
  border-radius: 8px;
  background: #161616;
  color: rgba(255, 255, 255, 0.9);
  padding: 0 12px;
  font: inherit;
  font-size: 0.82rem;
`;

const Select = styled.select`
  height: 36px;
  border: none;
  outline: none;
  border-radius: 8px;
  background: #161616;
  color: rgba(255, 255, 255, 0.9);
  padding: 0 12px;
  font: inherit;
  font-size: 0.82rem;
`;

const Button = styled.button<{ $accent?: boolean; $danger?: boolean }>`
  height: 34px;
  border: none;
  outline: none;
  border-radius: 8px;
  background: ${(p) =>
    p.$danger ? "#3a1616" : p.$accent ? "#1d4ed8" : "#1a1a1a"};
  color: ${(p) =>
    p.$danger
      ? "#fca5a5"
      : p.$accent
        ? "#fff"
        : "rgba(255,255,255,0.7)"};
  padding: 0 14px;
  font: inherit;
  font-size: 0.76rem;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

const Notice = styled.div<{ $error?: boolean }>`
  min-height: 18px;
  font-size: 0.72rem;
  color: ${(p) => (p.$error ? "#fca5a5" : "rgba(255,255,255,0.6)")};
`;

const MetaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
`;

const TableWrap = styled.div`
  flex: 1;
  min-height: 280px;
  overflow: auto;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.04);
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.74rem;

  th,
  td {
    text-align: left;
    padding: 8px 10px;
    vertical-align: top;
  }

  th {
    position: sticky;
    top: 0;
    background: #111;
    color: rgba(255, 255, 255, 0.42);
    font-size: 0.64rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }
`;

const Td = styled.td`
  color: rgba(255, 255, 255, 0.78);
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
`;

const TdMono = styled(Td)`
  font-family: "SF Mono", Consolas, monospace;
  font-size: 0.66rem;
`;

const Status = styled.span`
  display: inline-flex;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.12);
  color: #93c5fd;
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
`;

const DetailWrap = styled.div`
  display: grid;
  gap: 10px;
`;

const DetailCard = styled.div`
  border-radius: 8px;
  background: #0d0d0d;
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 12px;
`;

const DetailTitle = styled.div`
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.44);
  margin-bottom: 8px;
`;

const DetailPre = styled.pre`
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.68rem;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.72);
`;

function money(minor: number, currency: string) {
  return `${currency} ${(minor / 100).toFixed(2)}`;
}

function fmtDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const DEFAULT_STATUSES = [
  "draft",
  "pending_hold",
  "held",
  "pending_payment",
  "paid",
  "failed",
  "cancelled",
  "expired",
];

export const OrderStudioWidget = () => {
  const [events, setEvents] = useState<EventOption[]>([]);
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [channel, setChannel] = useState("admin");
  const [eventId, setEventId] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [section, setSection] = useState("ORCHR");
  const [rowLabel, setRowLabel] = useState("A");
  const [quantity, setQuantity] = useState("2");
  const [unitPriceMinor, setUnitPriceMinor] = useState("9051");
  const [feesMinor, setFeesMinor] = useState("1200");
  const [statusFilter, setStatusFilter] = useState("");

  const totalMinorPreview = useMemo(() => {
    const qty = Number(quantity) || 0;
    const unit = Number(unitPriceMinor) || 0;
    const fees = Number(feesMinor) || 0;
    return qty * unit + fees;
  }, [feesMinor, quantity, unitPriceMinor]);

  const loadBootstrap = async () => {
    try {
      const [eventsRes, partnersRes] = await Promise.all([
        fetch("/api/events"),
        fetch("/api/partners"),
      ]);
      if (eventsRes.ok) {
        setEvents((await eventsRes.json()) as EventOption[]);
      }
      if (partnersRes.ok) {
        setPartners((await partnersRes.json()) as PartnerOption[]);
      }
    } catch {
      // Best-effort bootstrap for shell only.
    }
  };

  const loadOrders = async (nextStatus = statusFilter) => {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams();
      if (nextStatus.trim()) qs.set("status", nextStatus.trim());
      qs.set("limit", "150");
      const res = await fetch(`/api/orders?${qs.toString()}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = (await res.json()) as OrderSummary[];
      setOrders(json);
      if (selectedOrder) {
        const stillExists = json.find((order) => order.id === selectedOrder.id);
        if (!stillExists) {
          setSelectedOrder(null);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const loadOrderDetail = async (orderId: string) => {
    setError("");
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = (await res.json()) as OrderDetail;
      setSelectedOrder(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  useEffect(() => {
    loadBootstrap();
    loadOrders();
  }, []);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        channel,
        eventId: eventId || undefined,
        partnerId: channel === "partner_api" ? partnerId || undefined : undefined,
        buyerEmail: buyerEmail || undefined,
        buyerName: buyerName || undefined,
        items: [
          {
            itemType: "ticket",
            description: "Shell-created ticket line",
            section,
            rowLabel,
            quantity: Number(quantity),
            currencyCode: "USD",
            unitPriceMinor: Number(unitPriceMinor),
            feesMinor: Number(feesMinor),
            totalMinor: totalMinorPreview,
            ticketSnapshot: {
              source: "shell",
              section,
              rowLabel,
              quantity: Number(quantity),
            },
          },
        ],
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      const json = (await res.json()) as OrderDetail;
      setSelectedOrder(json);
      setMessage(`Created ${json.publicOrderNo}.`);
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (status: string) => {
    if (!selectedOrder) return;
    setStatusSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          actorType: "admin",
          note: "Updated from /shell",
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as OrderDetail;
      setSelectedOrder(json);
      setMessage(`${json.publicOrderNo} moved to ${json.status}.`);
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setStatusSaving(false);
    }
  };

  return (
    <Wrap>
      <Grid>
        <Panel>
          <PanelTitle>Create Draft Order</PanelTitle>
          <PanelText>
            Build a shell-side order draft against the new Postgres order domain.
            This creates `orders`, `order_items`, and the first `order_events`
            record in one transaction.
          </PanelText>

          <Form onSubmit={handleCreate}>
            <MetaGrid>
              <Label>
                Channel
                <Select value={channel} onChange={(e) => setChannel(e.target.value)}>
                  <option value="admin">admin</option>
                  <option value="web">web</option>
                  <option value="partner_api">partner_api</option>
                </Select>
              </Label>
              <Label>
                Event
                <Select value={eventId} onChange={(e) => setEventId(e.target.value)}>
                  <option value="">No linked event</option>
                  {events.map((eventOption) => (
                    <option key={eventOption.id} value={eventOption.id}>
                      {eventOption.name}
                    </option>
                  ))}
                </Select>
              </Label>
            </MetaGrid>

            {channel === "partner_api" ? (
              <Label>
                Partner
                <Select value={partnerId} onChange={(e) => setPartnerId(e.target.value)}>
                  <option value="">Select partner</option>
                  {partners.map((partner) => (
                    <option key={partner.id} value={partner.id}>
                      {partner.name || partner.email}
                    </option>
                  ))}
                </Select>
              </Label>
            ) : null}

            <MetaGrid>
              <Label>
                Buyer Email
                <Input
                  type="email"
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  placeholder="buyer@example.com"
                />
              </Label>
              <Label>
                Buyer Name
                <Input
                  type="text"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Optional"
                />
              </Label>
            </MetaGrid>

            <MetaGrid>
              <Label>
                Section
                <Input value={section} onChange={(e) => setSection(e.target.value)} />
              </Label>
              <Label>
                Row
                <Input
                  value={rowLabel}
                  onChange={(e) => setRowLabel(e.target.value)}
                />
              </Label>
            </MetaGrid>

            <MetaGrid>
              <Label>
                Quantity
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </Label>
              <Label>
                Unit Price Minor
                <Input
                  type="number"
                  min="0"
                  value={unitPriceMinor}
                  onChange={(e) => setUnitPriceMinor(e.target.value)}
                />
              </Label>
            </MetaGrid>

            <MetaGrid>
              <Label>
                Fees Minor
                <Input
                  type="number"
                  min="0"
                  value={feesMinor}
                  onChange={(e) => setFeesMinor(e.target.value)}
                />
              </Label>
              <Label>
                Total Preview
                <Input value={money(totalMinorPreview, "USD")} readOnly />
              </Label>
            </MetaGrid>

            <Row>
              <Button type="submit" $accent disabled={saving}>
                {saving ? "Creating…" : "Create Order"}
              </Button>
              <Button type="button" onClick={() => loadOrders()} disabled={loading}>
                Refresh Orders
              </Button>
            </Row>
            <Notice $error={Boolean(error)}>{error || message}</Notice>
          </Form>
        </Panel>

        <Panel style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <PanelTitle>Order Queue</PanelTitle>
            <PanelText>
              Live readout from `/api/orders`. Click any row to inspect details and
              move it through status transitions.
            </PanelText>
            <Row>
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  loadOrders(e.target.value);
                }}
                style={{ minWidth: 180 }}
              >
                <option value="">All statuses</option>
                {DEFAULT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
              <Button type="button" onClick={() => loadOrders()} disabled={loading}>
                {loading ? "Loading…" : "Reload"}
              </Button>
            </Row>
          </div>

          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Status</th>
                  <th>Buyer</th>
                  <th>Total</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => loadOrderDetail(order.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <Td>
                      <div>{order.publicOrderNo}</div>
                      <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.68rem", marginTop: 3 }}>
                        {order.channel}
                      </div>
                    </Td>
                    <Td>
                      <Status>{order.status}</Status>
                    </Td>
                    <Td>
                      <div>{order.buyerName || "Unnamed buyer"}</div>
                      <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.68rem", marginTop: 3 }}>
                        {order.buyerEmail || "—"}
                      </div>
                    </Td>
                    <Td>{money(order.totalMinor, order.currencyCode)}</Td>
                    <Td>{fmtDate(order.updatedAt)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>

          {selectedOrder ? (
            <DetailWrap>
              <DetailCard>
                <DetailTitle>Selected Order</DetailTitle>
                <Row>
                  <Button type="button" onClick={() => loadOrderDetail(selectedOrder.id)}>
                    Refresh Detail
                  </Button>
                  {DEFAULT_STATUSES
                    .filter((status) => status !== selectedOrder.status)
                    .slice(0, 4)
                    .map((status) => (
                      <Button
                        key={status}
                        type="button"
                        onClick={() => updateStatus(status)}
                        disabled={statusSaving}
                      >
                        {status}
                      </Button>
                    ))}
                  <Button
                    type="button"
                    $danger
                    onClick={() => updateStatus("cancelled")}
                    disabled={statusSaving}
                  >
                    Cancel
                  </Button>
                </Row>
              </DetailCard>

              <DetailCard>
                <DetailTitle>Order Snapshot</DetailTitle>
                <DetailPre>
                  {JSON.stringify(
                    {
                      id: selectedOrder.id,
                      publicOrderNo: selectedOrder.publicOrderNo,
                      status: selectedOrder.status,
                      channel: selectedOrder.channel,
                      buyerEmail: selectedOrder.buyerEmail,
                      buyerName: selectedOrder.buyerName,
                      total: money(
                        selectedOrder.totalMinor,
                        selectedOrder.currencyCode,
                      ),
                      event: selectedOrder.event,
                      partner: selectedOrder.partner,
                    },
                    null,
                    2,
                  )}
                </DetailPre>
              </DetailCard>

              <DetailCard>
                <DetailTitle>Items</DetailTitle>
                <DetailPre>{JSON.stringify(selectedOrder.items, null, 2)}</DetailPre>
              </DetailCard>

              <DetailCard>
                <DetailTitle>Timeline</DetailTitle>
                <DetailPre>
                  {JSON.stringify(selectedOrder.timeline, null, 2)}
                </DetailPre>
              </DetailCard>
            </DetailWrap>
          ) : null}
        </Panel>
      </Grid>
    </Wrap>
  );
};
