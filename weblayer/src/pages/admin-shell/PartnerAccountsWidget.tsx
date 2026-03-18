import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";

interface PartnerSummary {
  id: string;
  email: string;
  name: string | null;
  publicKeyFingerprint: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  lastSeenAt: string | null;
}

interface PartnerKeyFile {
  kind: "tm-partner-keypair-v1";
  algorithm: string;
  partnerId: string;
  email: string;
  issuedAt: string;
  publicKeyFingerprint: string;
  publicKeyJwk: JsonWebKey;
  privateKeyJwk: JsonWebKey;
}

interface PartnerCreateResponse {
  partner: PartnerSummary;
  keyFile: PartnerKeyFile;
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
  grid-template-columns: minmax(320px, 420px) minmax(0, 1fr);
  gap: 12px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const Panel = styled.section`
  border-radius: 10px;
  background: #111;
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 16px;
`;

const PanelTitle = styled.h3`
  margin: 0 0 6px;
  font-size: 0.92rem;
  color: rgba(255, 255, 255, 0.9);
`;

const PanelText = styled.p`
  margin: 0 0 14px;
  font-size: 0.74rem;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.6;
`;

const Form = styled.form`
  display: grid;
  gap: 10px;
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

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
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

const Status = styled.span<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: ${(p) => (p.$active ? "#4ade80" : "#fca5a5")};
  font-weight: 700;

  &::before {
    content: "";
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: ${(p) => (p.$active ? "#22c55e" : "#ef4444")};
  }
`;

const Empty = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 160px;
  color: rgba(255, 255, 255, 0.24);
  font-size: 0.8rem;
`;

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function downloadKeyFile(keyFile: PartnerKeyFile) {
  const blob = new Blob([JSON.stringify(keyFile, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `partner-${keyFile.email.replace(/[^a-z0-9]+/gi, "-")}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export const PartnerAccountsWidget = () => {
  const [partners, setPartners] = useState<PartnerSummary[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const sortedPartners = useMemo(
    () =>
      [...partners].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [partners],
  );

  const loadPartners = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/partners");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = (await res.json()) as PartnerSummary[];
      setPartners(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPartners();
  }, []);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      const json = (await res.json()) as PartnerCreateResponse;
      downloadKeyFile(json.keyFile);
      setEmail("");
      setName("");
      setMessage(
        `Created ${json.partner.email}. Keypair file downloaded. Store the private key file on the partner side only.`,
      );
      loadPartners();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const rotateKey = async (partnerId: string) => {
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/partners/${partnerId}/rotate-key`, {
        method: "POST",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as PartnerCreateResponse;
      downloadKeyFile(json.keyFile);
      setMessage(`Issued a new keypair for ${json.partner.email}. Old sessions were revoked.`);
      loadPartners();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const toggleStatus = async (partner: PartnerSummary) => {
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/partners/${partner.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !partner.isActive }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as PartnerSummary;
      setMessage(
        `${json.email} is now ${json.isActive ? "active" : "inactive"}.`,
      );
      loadPartners();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <Wrap>
      <Grid>
        <Panel>
          <PanelTitle>Issue Partner Access</PanelTitle>
          <PanelText>
            Create the partner identity here, then hand over the downloaded keypair
            file to the partner. The server keeps only the public key and verifies
            binary login handshakes from `/partner`.
          </PanelText>

          <Form onSubmit={handleCreate}>
            <Label>
              Email
              <Input
                type="email"
                placeholder="partner@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </Label>
            <Label>
              Display Name
              <Input
                type="text"
                placeholder="Optional label"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </Label>
            <Row>
              <Button type="submit" $accent disabled={saving || !email.trim()}>
                {saving ? "Issuing…" : "Create Partner"}
              </Button>
              <Button type="button" onClick={loadPartners} disabled={loading}>
                Refresh List
              </Button>
            </Row>
            <Notice $error={Boolean(error)}>{error || message}</Notice>
          </Form>
        </Panel>

        <Panel>
          <PanelTitle>Partner Accounts</PanelTitle>
          <PanelText>
            Active accounts can authenticate into `/partner` with email plus keypair
            file. Rotating a keypair revokes old sessions immediately.
          </PanelText>

          <TableWrap>
            {sortedPartners.length === 0 && !loading ? (
              <Empty>No partner accounts yet.</Empty>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th>Partner</th>
                    <th>Fingerprint</th>
                    <th>Status</th>
                    <th>Last Login</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPartners.map((partner) => (
                    <tr key={partner.id}>
                      <Td>
                        <div>{partner.name || "Unnamed Partner"}</div>
                        <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.68rem", marginTop: 3 }}>
                          {partner.email}
                        </div>
                      </Td>
                      <TdMono>{partner.publicKeyFingerprint}</TdMono>
                      <Td>
                        <Status $active={partner.isActive}>
                          {partner.isActive ? "Active" : "Inactive"}
                        </Status>
                      </Td>
                      <Td>{fmt(partner.lastLoginAt)}</Td>
                      <Td>
                        <Row>
                          <Button type="button" onClick={() => rotateKey(partner.id)}>
                            Rotate Key
                          </Button>
                          <Button
                            type="button"
                            $danger={!partner.isActive}
                            onClick={() => toggleStatus(partner)}
                          >
                            {partner.isActive ? "Disable" : "Enable"}
                          </Button>
                        </Row>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </TableWrap>
        </Panel>
      </Grid>
    </Wrap>
  );
};
