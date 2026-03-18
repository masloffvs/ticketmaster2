import { useEffect, useState } from "react";
import styled from "styled-components";
import { postBin, type PartnerSession } from "../../partner/binProtocol";

interface PartnerDomainRecord {
  id: string;
  partnerId: string;
  domain: string;
  createdAt: string;
  updatedAt: string;
}

const Wrap = styled.div`
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: calc(100vh - 120px);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`;

const Title = styled.div`
  font-size: 0.92rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.92);
`;

const Text = styled.div`
  font-size: 0.74rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.52);
`;

const Button = styled.button<{ $accent?: boolean; $danger?: boolean }>`
  height: 34px;
  border: none;
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

const Empty = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1px dashed rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.28);
  font-size: 0.8rem;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
`;

const Card = styled.div`
  border-radius: 10px;
  background: #111;
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 14px;
  display: grid;
  gap: 10px;
`;

const DomainValue = styled.div`
  font-size: 0.9rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.92);
  overflow-wrap: anywhere;
`;

const Meta = styled.div`
  font-size: 0.68rem;
  color: rgba(255, 255, 255, 0.42);
  line-height: 1.5;
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
  width: min(440px, calc(100vw - 24px));
  border-radius: 12px;
  background: #0d0d0d;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
  padding: 18px;
  display: grid;
  gap: 12px;
`;

const ModalTitle = styled.div`
  font-size: 0.92rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.92);
`;

const Input = styled.input`
  height: 38px;
  border: none;
  border-radius: 8px;
  background: #161616;
  color: rgba(255, 255, 255, 0.92);
  padding: 0 12px;
  font: inherit;
`;

function fmt(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const PartnerDomainsWidget = ({
  session,
}: {
  session: PartnerSession;
}) => {
  const [rows, setRows] = useState<PartnerDomainRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [domainInput, setDomainInput] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await postBin<PartnerDomainRecord[]>({
        action: "domains.list",
        sessionToken: session.token,
      });
      setRows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addDomain = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const data = await postBin<PartnerDomainRecord[]>({
        action: "domains.add",
        sessionToken: session.token,
        domain: domainInput,
      });
      setRows(data);
      setDomainInput("");
      setModalOpen(false);
      setMessage("Domain assigned. New matching orders will attach automatically.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const removeDomain = async (domainId: string) => {
    setError("");
    setMessage("");
    try {
      const data = await postBin<PartnerDomainRecord[]>({
        action: "domains.remove",
        sessionToken: session.token,
        domainId,
      });
      setRows(data);
      setMessage("Domain removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <Wrap>
      <Header>
        <div>
          <Title>Owned Domains</Title>
          <Text>
            Add company domains here. New orders with matching buyer email domains
            will be auto-assigned to your partner account. Unclaimed domains stay
            in `general`.
          </Text>
        </div>
        <Button type="button" $accent onClick={() => setModalOpen(true)}>
          Add Domain
        </Button>
      </Header>

      <Row>
        <Button type="button" onClick={load} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </Row>

      <Notice $error={Boolean(error)}>{error || message}</Notice>

      {rows.length === 0 ? (
        <Empty>No domains assigned yet.</Empty>
      ) : (
        <Grid>
          {rows.map((row) => (
            <Card key={row.id}>
              <DomainValue>{row.domain}</DomainValue>
              <Meta>Assigned {fmt(row.createdAt)}</Meta>
              <Button type="button" $danger onClick={() => removeDomain(row.id)}>
                Remove
              </Button>
            </Card>
          ))}
        </Grid>
      )}

      {modalOpen ? (
        <Overlay onClick={() => setModalOpen(false)}>
          <Modal onClick={(event) => event.stopPropagation()}>
            <ModalTitle>Add Domain</ModalTitle>
            <Text>
              Enter a domain like `brand.com` or `tickets.brand.com`. Verification
              is skipped for now.
            </Text>
            <form onSubmit={addDomain} style={{ display: "grid", gap: 12 }}>
              <Input
                autoFocus
                placeholder="brand.com"
                value={domainInput}
                onChange={(event) => setDomainInput(event.target.value)}
                required
              />
              <Row>
                <Button type="submit" $accent disabled={saving}>
                  {saving ? "Saving…" : "Assign Domain"}
                </Button>
                <Button type="button" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
              </Row>
            </form>
          </Modal>
        </Overlay>
      ) : null}
    </Wrap>
  );
};

const Row = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;
