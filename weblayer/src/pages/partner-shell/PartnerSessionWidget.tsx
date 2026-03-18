import styled from "styled-components";
import {
  fingerprintPreview,
  postBin,
  type PartnerSession,
} from "../../partner/binProtocol";

const Wrap = styled.div`
  padding: 16px;
  display: grid;
  gap: 12px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
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
  font-size: 0.9rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.5;
`;

const Row = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const Button = styled.button`
  height: 34px;
  border: none;
  border-radius: 8px;
  background: #1a1a1a;
  color: rgba(255, 255, 255, 0.72);
  padding: 0 14px;
  font: inherit;
  font-size: 0.76rem;
  font-weight: 700;
  cursor: pointer;
`;

const LogoutButton = styled(Button)`
  background: #311717;
  color: #fca5a5;
`;

const Detail = styled.pre`
  margin: 0;
  padding: 14px;
  border-radius: 10px;
  background: #111;
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.72rem;
  line-height: 1.6;
  overflow: auto;
`;

interface PartnerSessionWidgetProps {
  session: PartnerSession;
  onLogout: () => void;
  onSessionChange: (session: PartnerSession) => void;
}

export const PartnerSessionWidget = ({
  onLogout,
  onSessionChange,
  session,
}: PartnerSessionWidgetProps) => {
  const refresh = async () => {
    const data = await postBin<{
      partner: PartnerSession["partner"];
      session: { expiresAt: string };
    }>({
      action: "session.me",
      sessionToken: session.token,
    });

    onSessionChange({
      ...session,
      expiresAt: data.session.expiresAt,
      partner: data.partner,
    });
  };

  return (
    <Wrap>
      <Grid>
        <Card>
          <Label>Partner</Label>
          <Value>{session.partner.name || session.partner.email}</Value>
        </Card>
        <Card>
          <Label>Email</Label>
          <Value>{session.partner.email}</Value>
        </Card>
        <Card>
          <Label>Key Fingerprint</Label>
          <Value>{fingerprintPreview(session.keyFingerprint)}</Value>
        </Card>
        <Card>
          <Label>Session Expires</Label>
          <Value>{new Date(session.expiresAt).toLocaleString("en-GB")}</Value>
        </Card>
      </Grid>

      <Row>
        <Button type="button" onClick={refresh}>
          Refresh Session
        </Button>
        <LogoutButton type="button" onClick={onLogout}>
          Logout
        </LogoutButton>
      </Row>

      <Detail>
        {JSON.stringify(
          {
            partner: session.partner,
            session: {
              expiresAt: session.expiresAt,
            },
          },
          null,
          2,
        )}
      </Detail>
    </Wrap>
  );
};
