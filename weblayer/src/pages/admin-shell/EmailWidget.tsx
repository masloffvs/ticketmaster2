import { useEffect, useState } from "react";
import styled from "styled-components";

interface MailConfigStatus {
  provider: string;
  enabled: boolean;
  apiKeyConfigured: boolean;
  fromEmail: string;
  fromName: string;
  replyTo: string[];
  testTo: string;
}

interface TestMailResult {
  ok: boolean;
  id?: string;
  error?: string;
  provider?: string;
}

const Wrap = styled.div`
  min-height: calc(100vh - 120px);
  padding: 18px;
  display: grid;
  grid-template-columns: minmax(320px, 420px) minmax(320px, 1fr);
  gap: 14px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.section`
  border-radius: 12px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0)),
    #101010;
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 16px;
`;

const Eyebrow = styled.div`
  font-size: 0.65rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.38);
  margin-bottom: 6px;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 1.1rem;
  color: #fafafa;
`;

const Copy = styled.p`
  margin: 8px 0 0;
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.62);
  font-size: 0.84rem;
`;

const StatusRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
  margin-top: 16px;
`;

const Stat = styled.div`
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  padding: 12px;
`;

const StatLabel = styled.div`
  font-size: 0.66rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.35);
`;

const StatValue = styled.div`
  margin-top: 6px;
  font-size: 0.92rem;
  color: rgba(255, 255, 255, 0.9);
  word-break: break-word;
`;

const Badge = styled.span<{ $ok: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background: ${(props) =>
    props.$ok ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.14)"};
  color: ${(props) => (props.$ok ? "#4ade80" : "#f59e0b")};
  font-size: 0.72rem;
  font-weight: 700;
  margin-top: 14px;
`;

const Dot = styled.span<{ $ok: boolean }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${(props) => (props.$ok ? "#22c55e" : "#f59e0b")};
`;

const Form = styled.form`
  display: grid;
  gap: 12px;
  margin-top: 16px;
`;

const Field = styled.label`
  display: grid;
  gap: 6px;
`;

const FieldLabel = styled.span`
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.55);
`;

const Input = styled.input`
  width: 100%;
  min-height: 38px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: #0b0b0b;
  color: rgba(255, 255, 255, 0.92);
  padding: 0 12px;
  font: inherit;

  &::placeholder {
    color: rgba(255, 255, 255, 0.26);
  }
`;

const Textarea = styled.textarea`
  width: 100%;
  min-height: 132px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: #0b0b0b;
  color: rgba(255, 255, 255, 0.92);
  padding: 10px 12px;
  font: inherit;
  resize: vertical;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const Button = styled.button`
  height: 38px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #1d4ed8, #2563eb);
  color: white;
  padding: 0 14px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

const GhostButton = styled.button`
  height: 38px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: #121212;
  color: rgba(255, 255, 255, 0.78);
  padding: 0 14px;
  font: inherit;
  cursor: pointer;
`;

const Result = styled.div<{ $error?: boolean }>`
  margin-top: 12px;
  border-radius: 10px;
  padding: 12px;
  background: ${(props) =>
    props.$error ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)"};
  color: ${(props) => (props.$error ? "#fca5a5" : "#86efac")};
  font-size: 0.8rem;
  white-space: pre-wrap;
  word-break: break-word;
`;

const HintList = styled.ul`
  margin: 14px 0 0;
  padding-left: 18px;
  color: rgba(255, 255, 255, 0.55);
  font-size: 0.8rem;
  line-height: 1.5;
`;

const DEFAULT_HTML = `<div style="font-family:Arial,sans-serif">
  <h2>Resend test email</h2>
  <p>Serverlayer can reach the Resend Email API.</p>
</div>`;

export const EmailWidget = () => {
  const [status, setStatus] = useState<MailConfigStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<TestMailResult | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("Ticketmaster shell test");
  const [html, setHtml] = useState(DEFAULT_HTML);

  const loadStatus = async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch("/api/mail/config");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json: MailConfigStatus = await res.json();
      setStatus(json);
      setFromName((current) => current || json.fromName || "Ticketmaster");
      setFromEmail((current) => current || json.fromEmail);
      setReplyTo((current) => current || json.replyTo.join(", "));
      setTo((current) => current || json.testTo);
    } catch (error) {
      setResult({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSending(true);
    setResult(null);

    try {
      const res = await fetch("/api/mail/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey: apiKey.trim() || undefined,
          fromName: fromName.trim() || undefined,
          fromEmail: fromEmail.trim() || undefined,
          replyTo: replyTo.trim() || undefined,
          to: to.trim(),
          subject: subject.trim(),
          html,
        }),
      });

      const json: TestMailResult = await res.json();
      setResult(json);
    } catch (error) {
      setResult({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Wrap>
      <Card>
        <Eyebrow>Integration</Eyebrow>
        <Title>Resend Email API</Title>
        <Copy>
          Конфиг сервера читается из `RESEND_*` переменных, а этот shell-модуль
          даёт статус и ручную отправку тестового письма с временными override.
        </Copy>

        <Badge $ok={Boolean(status?.enabled)}>
          <Dot $ok={Boolean(status?.enabled)} />
          {status?.enabled ? "Configured" : "Missing config"}
        </Badge>

        <StatusRow>
          <Stat>
            <StatLabel>Provider</StatLabel>
            <StatValue>{status?.provider ?? "resend"}</StatValue>
          </Stat>
          <Stat>
            <StatLabel>API Key</StatLabel>
            <StatValue>{status?.apiKeyConfigured ? "Configured" : "Missing"}</StatValue>
          </Stat>
          <Stat>
            <StatLabel>From</StatLabel>
            <StatValue>{status?.fromEmail || "Not set"}</StatValue>
          </Stat>
          <Stat>
            <StatLabel>Reply-To</StatLabel>
            <StatValue>{status?.replyTo.join(", ") || "Not set"}</StatValue>
          </Stat>
        </StatusRow>

        <HintList>
          <li>`RESEND_API_KEY` обязателен.</li>
          <li>`RESEND_FROM_EMAIL` должен быть валидным sender у Resend.</li>
          <li>`RESEND_FROM_NAME`, `RESEND_REPLY_TO`, `RESEND_TEST_TO` опциональны.</li>
        </HintList>
      </Card>

      <Card>
        <Eyebrow>Test Send</Eyebrow>
        <Title>Send verification email</Title>
        <Copy>
          Поля ниже можно заполнить значениями из `/shell`, не раскрывая текущий
          ключ сервера. Пустые поля берутся из server env.
        </Copy>

        <Form onSubmit={handleSubmit}>
          <Field>
            <FieldLabel>API key override</FieldLabel>
            <Input
              type="password"
              placeholder={status?.apiKeyConfigured ? "Stored on server" : "re_xxxxx"}
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
            />
          </Field>

          <Grid>
            <Field>
              <FieldLabel>From name</FieldLabel>
              <Input
                placeholder="Ticketmaster"
                value={fromName}
                onChange={(event) => setFromName(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>From email</FieldLabel>
              <Input
                type="email"
                placeholder="onboarding@your-domain.com"
                value={fromEmail}
                onChange={(event) => setFromEmail(event.target.value)}
              />
            </Field>
          </Grid>

          <Field>
            <FieldLabel>Reply-To</FieldLabel>
            <Input
              placeholder="support@your-domain.com, ops@your-domain.com"
              value={replyTo}
              onChange={(event) => setReplyTo(event.target.value)}
            />
          </Field>

          <Field>
            <FieldLabel>Recipients</FieldLabel>
            <Input
              placeholder="name@example.com, qa@example.com"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </Field>

          <Field>
            <FieldLabel>Subject</FieldLabel>
            <Input
              placeholder="Ticketmaster shell test"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />
          </Field>

          <Field>
            <FieldLabel>HTML body</FieldLabel>
            <Textarea value={html} onChange={(event) => setHtml(event.target.value)} />
          </Field>

          <Actions>
            <Button type="submit" disabled={sending}>
              {sending ? "Sending..." : "Send test"}
            </Button>
            <GhostButton type="button" onClick={loadStatus} disabled={loadingStatus}>
              {loadingStatus ? "Refreshing..." : "Refresh status"}
            </GhostButton>
          </Actions>
        </Form>

        {result && (
          <Result $error={!result.ok}>
            {result.ok
              ? `Email accepted by ${result.provider}. Message ID: ${result.id}`
              : result.error || "Unknown error"}
          </Result>
        )}
      </Card>
    </Wrap>
  );
};
