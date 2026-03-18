import { useMemo, useState } from "react";
import styled from "styled-components";
import { postBin, type PartnerSession } from "../../partner/binProtocol";

const Wrap = styled.div`
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: calc(100vh - 120px);
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const Input = styled.input`
  height: 34px;
  min-width: 240px;
  border: none;
  border-radius: 8px;
  background: #161616;
  color: rgba(255, 255, 255, 0.9);
  padding: 0 12px;
  font: inherit;
`;

const Button = styled.button`
  height: 34px;
  border: none;
  border-radius: 8px;
  background: #1d4ed8;
  color: #fff;
  padding: 0 14px;
  font: inherit;
  font-size: 0.74rem;
  font-weight: 700;
  cursor: pointer;
`;

const Meta = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
`;

const Card = styled.div`
  border-radius: 10px;
  background: #111;
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 14px;
`;

const Label = styled.div`
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.38);
  margin-bottom: 6px;
`;

const Value = styled.div`
  font-size: 0.88rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
`;

const Body = styled.pre`
  flex: 1;
  margin: 0;
  padding: 14px;
  border-radius: 10px;
  background: #111;
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.74);
  font-size: 0.68rem;
  line-height: 1.6;
  overflow: auto;
`;

function prettySize(bytes: number) {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

export const PartnerTopologyWidget = ({
  session,
}: {
  session: PartnerSession;
}) => {
  const [eventId, setEventId] = useState("");
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<unknown>(null);

  const payloadString = useMemo(
    () => (payload ? JSON.stringify(payload, null, 2) : ""),
    [payload],
  );

  const loadTopology = async () => {
    const id = eventId.trim();
    if (!id) return;
    setLoading(true);
    try {
      const data = await postBin({
        action: "topology.get",
        sessionToken: session.token,
        eventId: id,
      });
      setPayload(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Wrap>
      <Controls>
        <Input
          placeholder="Enter event id"
          value={eventId}
          onChange={(event) => setEventId(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              loadTopology();
            }
          }}
        />
        <Button type="button" onClick={loadTopology}>
          {loading ? "Loading…" : "Load Topology"}
        </Button>
      </Controls>

      <Meta>
        <Card>
          <Label>Event ID</Label>
          <Value>{eventId.trim() || "—"}</Value>
        </Card>
        <Card>
          <Label>Payload Size</Label>
          <Value>{payloadString ? prettySize(payloadString.length) : "—"}</Value>
        </Card>
        <Card>
          <Label>Transport</Label>
          <Value>/api/bin</Value>
        </Card>
      </Meta>

      <Body>{payloadString || "No topology loaded yet."}</Body>
    </Wrap>
  );
};
