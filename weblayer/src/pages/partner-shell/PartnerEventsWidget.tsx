import { useEffect, useState } from "react";
import styled from "styled-components";
import { postBin, type PartnerSession } from "../../partner/binProtocol";

interface EventRow {
  id: string;
  name: string;
  venue: string | null;
  city: string | null;
  country: string | null;
  date: string | null;
}

const Wrap = styled.div`
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: calc(100vh - 120px);
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const Button = styled.button`
  height: 32px;
  border: none;
  border-radius: 8px;
  background: #1a1a1a;
  color: rgba(255, 255, 255, 0.72);
  padding: 0 12px;
  font: inherit;
  font-size: 0.74rem;
  font-weight: 700;
  cursor: pointer;
`;

const TableWrap = styled.div`
  flex: 1;
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
    padding: 8px 10px;
    text-align: left;
  }

  th {
    position: sticky;
    top: 0;
    background: #111;
    color: rgba(255, 255, 255, 0.42);
    font-size: 0.64rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
`;

const Td = styled.td`
  color: rgba(255, 255, 255, 0.76);
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
`;

const Mono = styled(Td)`
  font-family: "SF Mono", Consolas, monospace;
  font-size: 0.68rem;
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
`;

const Modal = styled.div`
  width: min(920px, 92vw);
  max-height: 86vh;
  background: #0e0e0e;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
`;

const ModalBody = styled.pre`
  margin: 0;
  padding: 16px;
  overflow: auto;
  color: rgba(255, 255, 255, 0.74);
  font-size: 0.68rem;
  line-height: 1.6;
`;

export const PartnerEventsWidget = ({ session }: { session: PartnerSession }) => {
  const [rows, setRows] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<unknown>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await postBin<EventRow[]>({
        action: "events.list",
        sessionToken: session.token,
      });
      setRows(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const inspect = async (eventId: string) => {
    const data = await postBin({
      action: "events.get",
      sessionToken: session.token,
      eventId,
    });
    setDetail(data);
  };

  return (
    <Wrap>
      <Row>
        <Button type="button" onClick={load}>
          {loading ? "Loading…" : "Refresh Events"}
        </Button>
      </Row>

      <TableWrap>
        <Table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Venue</th>
              <th>Date</th>
              <th>ID</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <Td>{row.name}</Td>
                <Td>{[row.venue, row.city].filter(Boolean).join(", ") || "—"}</Td>
                <Td>{row.date ? new Date(row.date).toLocaleString("en-GB") : "—"}</Td>
                <Mono>{row.id}</Mono>
                <Td>
                  <Button type="button" onClick={() => inspect(row.id)}>
                    Inspect
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>

      {detail ? (
        <Overlay onClick={() => setDetail(null)}>
          <Modal onClick={(event) => event.stopPropagation()}>
            <ModalHeader>
              <strong>Event payload</strong>
              <Button type="button" onClick={() => setDetail(null)}>
                Close
              </Button>
            </ModalHeader>
            <ModalBody>{JSON.stringify(detail, null, 2)}</ModalBody>
          </Modal>
        </Overlay>
      ) : null}
    </Wrap>
  );
};
