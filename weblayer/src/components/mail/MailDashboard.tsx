import { useEffect, useMemo, useState, type FormEvent } from "react";
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

interface MailMetricItem {
  id: string;
  provider: string;
  messageId: string | null;
  toEmails: string[];
  subject: string;
  status: string;
  responseStatus: number | null;
  responseBody: string | null;
  error: string | null;
  createdAt: string;
}

interface MailMetricsResult {
  summary: {
    total: number;
    accepted: number;
    failed: number;
    lastSentAt: string | null;
  };
  items: MailMetricItem[];
}

interface TestMailResult {
  ok: boolean;
  id?: string;
  error?: string;
  provider?: string;
}

interface MailDashboardProps {
  mode?: "shell" | "partner";
  initialTab?: "config" | "activity" | "responses";
}

const Wrap = styled.div<{ $mode: "shell" | "partner" }>`
  min-height: ${(props) =>
    props.$mode === "shell" ? "calc(100vh - 120px)" : "auto"};
  padding: ${(props) => (props.$mode === "shell" ? "18px" : "0")};
  display: grid;
  gap: 16px;
`;

const Hero = styled.section`
  border-radius: 18px;
  padding: 18px 20px;
  background:
    radial-gradient(circle at top right, rgba(59, 130, 246, 0.24), transparent 34%),
    linear-gradient(135deg, #0f172a, #111827 58%, #0a0a0a);
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

const Eyebrow = styled.div`
  font-size: 0.68rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.42);
`;

const Title = styled.h2`
  margin: 8px 0 0;
  font-size: 1.35rem;
  color: #f8fafc;
`;

const Copy = styled.p`
  margin: 10px 0 0;
  max-width: 720px;
  color: rgba(255, 255, 255, 0.68);
  line-height: 1.55;
`;

const BadgeRow = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 14px;
`;

const Badge = styled.span<{ $tone: "good" | "warn" | "neutral" }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 0.74rem;
  font-weight: 700;
  background: ${(props) =>
    props.$tone === "good"
      ? "rgba(34, 197, 94, 0.14)"
      : props.$tone === "warn"
        ? "rgba(245, 158, 11, 0.14)"
        : "rgba(255, 255, 255, 0.08)"};
  color: ${(props) =>
    props.$tone === "good"
      ? "#86efac"
      : props.$tone === "warn"
        ? "#fcd34d"
        : "rgba(255,255,255,0.78)"};
`;

const Dot = styled.span<{ $tone: "good" | "warn" | "neutral" }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${(props) =>
    props.$tone === "good"
      ? "#22c55e"
      : props.$tone === "warn"
        ? "#f59e0b"
        : "rgba(255,255,255,0.5)"};
`;

const Tabs = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const Tab = styled.button<{ $active: boolean }>`
  height: 36px;
  border: 1px solid ${(props) => (props.$active ? "rgba(37,99,235,0.65)" : "rgba(255,255,255,0.08)")};
  background: ${(props) => (props.$active ? "rgba(37,99,235,0.16)" : "#111")};
  color: ${(props) => (props.$active ? "#dbeafe" : "rgba(255,255,255,0.68)")};
  border-radius: 10px;
  padding: 0 14px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
`;

const Grid = styled.div<{ $wide?: boolean }>`
  display: grid;
  grid-template-columns: ${(props) => (props.$wide ? "1.1fr 1fr" : "repeat(auto-fit, minmax(190px, 1fr))")};
  gap: 14px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.section`
  border-radius: 14px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0)),
    #101010;
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 16px;
`;

const CardTitle = styled.h3`
  margin: 0;
  font-size: 0.98rem;
  color: #f8fafc;
`;

const CardCopy = styled.p`
  margin: 8px 0 0;
  color: rgba(255,255,255,0.58);
  font-size: 0.82rem;
  line-height: 1.5;
`;

const Stats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
`;

const Stat = styled.div`
  border-radius: 12px;
  background: rgba(255,255,255,0.03);
  padding: 14px;
`;

const StatLabel = styled.div`
  font-size: 0.66rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.38);
`;

const StatValue = styled.div`
  margin-top: 6px;
  font-size: 1.32rem;
  font-weight: 800;
  color: #fff;
`;

const StatSub = styled.div`
  margin-top: 4px;
  color: rgba(255,255,255,0.46);
  font-size: 0.74rem;
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
  color: rgba(255,255,255,0.56);
`;

const Input = styled.input`
  width: 100%;
  min-height: 40px;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  background: #0b0b0b;
  color: rgba(255,255,255,0.94);
  padding: 0 12px;
  font: inherit;
`;

const Textarea = styled.textarea`
  width: 100%;
  min-height: 132px;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  background: #0b0b0b;
  color: rgba(255,255,255,0.94);
  padding: 10px 12px;
  font: inherit;
  resize: vertical;
`;

const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

const Button = styled.button<{ $ghost?: boolean }>`
  height: 40px;
  border-radius: 10px;
  border: ${(props) => (props.$ghost ? "1px solid rgba(255,255,255,0.08)" : "none")};
  background: ${(props) => (props.$ghost ? "#121212" : "linear-gradient(135deg, #2563eb, #1d4ed8)")};
  color: ${(props) => (props.$ghost ? "rgba(255,255,255,0.8)" : "#fff")};
  padding: 0 14px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
`;

const Result = styled.div<{ $error?: boolean }>`
  border-radius: 10px;
  padding: 12px;
  background: ${(props) =>
    props.$error ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.12)"};
  color: ${(props) => (props.$error ? "#fca5a5" : "#86efac")};
  font-size: 0.8rem;
`;

const TableWrap = styled.div`
  overflow: auto;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.06);
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 720px;

  th,
  td {
    padding: 10px 12px;
    text-align: left;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    vertical-align: top;
  }

  th {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: rgba(255,255,255,0.36);
    background: #0d0d0d;
  }

  td {
    color: rgba(255,255,255,0.76);
    font-size: 0.82rem;
  }
`;

const StatusPill = styled.span<{ $status: string }>`
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  background: ${(props) =>
    props.$status === "accepted" ? "rgba(34,197,94,0.14)" : "rgba(239,68,68,0.14)"};
  color: ${(props) => (props.$status === "accepted" ? "#86efac" : "#fca5a5")};
`;

const ResponseList = styled.div`
  display: grid;
  gap: 12px;
`;

const ResponseCard = styled.div`
  border-radius: 12px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  padding: 14px;
`;

const ResponseMeta = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 8px;
  color: rgba(255,255,255,0.52);
  font-size: 0.76rem;
`;

const Mono = styled.code`
  font-family: "SF Mono", "Fira Code", Consolas, monospace;
  color: rgba(255,255,255,0.88);
`;

const Pre = styled.pre`
  margin: 10px 0 0;
  padding: 12px;
  border-radius: 10px;
  background: #0b0b0b;
  color: rgba(255,255,255,0.74);
  font-size: 0.74rem;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
`;

const HintList = styled.ul`
  margin: 14px 0 0;
  padding-left: 18px;
  color: rgba(255,255,255,0.56);
  font-size: 0.8rem;
  line-height: 1.55;
`;

const Empty = styled.div`
  padding: 18px;
  border-radius: 12px;
  background: rgba(255,255,255,0.03);
  color: rgba(255,255,255,0.46);
`;

const DEFAULT_HTML = `<div style="font-family:Arial,sans-serif">
  <h2>Resend test email</h2>
  <p>Serverlayer can reach the Resend Email API.</p>
</div>`;

function formatDate(value: string | null) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function prettyPayload(value: string | null) {
  if (!value) return "No response body recorded";
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

export const MailDashboard = ({
  mode = "shell",
  initialTab = "config",
}: MailDashboardProps) => {
  const [tab, setTab] = useState<"config" | "activity" | "responses">(
    initialTab,
  );
  const [status, setStatus] = useState<MailConfigStatus | null>(null);
  const [metrics, setMetrics] = useState<MailMetricsResult | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
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
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
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

  const loadMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const res = await fetch("/api/mail/metrics?limit=80");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: MailMetricsResult = await res.json();
      setMetrics(json);
    } catch (error) {
      setResult({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoadingMetrics(false);
    }
  };

  useEffect(() => {
    loadStatus();
    loadMetrics();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
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
      await loadMetrics();
    } catch (error) {
      setResult({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSending(false);
    }
  };

  const failedItems = useMemo(
    () => metrics?.items.filter((item) => item.status !== "accepted") ?? [],
    [metrics],
  );

  const acceptedRate = useMemo(() => {
    if (!metrics || metrics.summary.total === 0) return "0%";
    return `${Math.round((metrics.summary.accepted / metrics.summary.total) * 100)}%`;
  }, [metrics]);

  return (
    <Wrap $mode={mode}>
      <Hero>
        <Eyebrow>{mode === "partner" ? "Partner Console" : "Shell Module"}</Eyebrow>
        <Title>Mail client telemetry</Title>
        <Copy>
          Дашборд показывает конфиг Resend, историю отправок, ответы API и фейлы.
          Всё берётся из серверного mail-модуля и таблицы delivery telemetry.
        </Copy>
        <BadgeRow>
          <Badge $tone={status?.enabled ? "good" : "warn"}>
            <Dot $tone={status?.enabled ? "good" : "warn"} />
            {status?.enabled ? "Resend configured" : "Resend config incomplete"}
          </Badge>
          <Badge $tone="neutral">
            <Dot $tone="neutral" />
            {metrics ? `${metrics.summary.total} tracked deliveries` : "Loading metrics"}
          </Badge>
          <Badge $tone={failedItems.length > 0 ? "warn" : "good"}>
            <Dot $tone={failedItems.length > 0 ? "warn" : "good"} />
            {failedItems.length > 0 ? `${failedItems.length} failures in feed` : "No recent failures"}
          </Badge>
        </BadgeRow>
      </Hero>

      <Tabs>
        <Tab type="button" $active={tab === "config"} onClick={() => setTab("config")}>
          Config
        </Tab>
        <Tab type="button" $active={tab === "activity"} onClick={() => setTab("activity")}>
          Activity
        </Tab>
        <Tab type="button" $active={tab === "responses"} onClick={() => setTab("responses")}>
          Responses
        </Tab>
      </Tabs>

      {tab === "config" && (
        <Grid $wide>
          <Card>
            <CardTitle>Provider status</CardTitle>
            <CardCopy>
              Shell и partner используют один и тот же backend config. Пустые поля
              в форме ниже наследуют server env.
            </CardCopy>
            <Stats style={{ marginTop: 16 }}>
              <Stat>
                <StatLabel>Provider</StatLabel>
                <StatValue style={{ fontSize: "1rem" }}>{status?.provider ?? "resend"}</StatValue>
                <StatSub>Current transport</StatSub>
              </Stat>
              <Stat>
                <StatLabel>API key</StatLabel>
                <StatValue style={{ fontSize: "1rem" }}>
                  {status?.apiKeyConfigured ? "Configured" : "Missing"}
                </StatValue>
                <StatSub>Secret stays server-side</StatSub>
              </Stat>
              <Stat>
                <StatLabel>From</StatLabel>
                <StatValue style={{ fontSize: "1rem" }}>{status?.fromEmail || "Not set"}</StatValue>
                <StatSub>{status?.fromName || "No display name"}</StatSub>
              </Stat>
              <Stat>
                <StatLabel>Reply-To</StatLabel>
                <StatValue style={{ fontSize: "1rem" }}>
                  {status?.replyTo.join(", ") || "Not set"}
                </StatValue>
                <StatSub>Optional responder addresses</StatSub>
              </Stat>
            </Stats>
            <HintList>
              <li>`RESEND_API_KEY` и `RESEND_FROM_EMAIL` обязательны для рабочих отправок.</li>
              <li>Каждая test/send попытка теперь пишет delivery telemetry в Postgres.</li>
              <li>Ответ Resend и ошибки доступны во вкладке `Responses` и на `/partner`.</li>
            </HintList>
          </Card>

          <Card>
            <CardTitle>Send test email</CardTitle>
            <CardCopy>
              Полезно для проверки домена, sender identity и ответа API после правок.
            </CardCopy>
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
              <TwoCol>
                <Field>
                  <FieldLabel>From name</FieldLabel>
                  <Input
                    value={fromName}
                    placeholder="Ticketmaster"
                    onChange={(event) => setFromName(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel>From email</FieldLabel>
                  <Input
                    type="email"
                    value={fromEmail}
                    placeholder="onboarding@your-domain.com"
                    onChange={(event) => setFromEmail(event.target.value)}
                  />
                </Field>
              </TwoCol>
              <Field>
                <FieldLabel>Reply-To</FieldLabel>
                <Input
                  value={replyTo}
                  placeholder="support@your-domain.com, ops@your-domain.com"
                  onChange={(event) => setReplyTo(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>Recipients</FieldLabel>
                <Input
                  value={to}
                  placeholder="name@example.com, qa@example.com"
                  onChange={(event) => setTo(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>Subject</FieldLabel>
                <Input
                  value={subject}
                  placeholder="Ticketmaster shell test"
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
                <Button type="button" $ghost onClick={loadStatus} disabled={loadingStatus}>
                  {loadingStatus ? "Refreshing config..." : "Refresh config"}
                </Button>
                <Button type="button" $ghost onClick={loadMetrics} disabled={loadingMetrics}>
                  {loadingMetrics ? "Refreshing metrics..." : "Refresh metrics"}
                </Button>
              </Actions>
              {result && (
                <Result $error={!result.ok}>
                  {result.ok
                    ? `Email accepted by ${result.provider}. Message ID: ${result.id}`
                    : result.error || "Unknown error"}
                </Result>
              )}
            </Form>
          </Card>
        </Grid>
      )}

      {tab === "activity" && (
        <Grid>
          <Card>
            <CardTitle>Delivery summary</CardTitle>
            <CardCopy>Срез по сохранённым отправкам и ошибкам провайдера.</CardCopy>
            <Stats style={{ marginTop: 16 }}>
              <Stat>
                <StatLabel>Total</StatLabel>
                <StatValue>{metrics?.summary.total ?? 0}</StatValue>
                <StatSub>All tracked sends</StatSub>
              </Stat>
              <Stat>
                <StatLabel>Accepted</StatLabel>
                <StatValue>{metrics?.summary.accepted ?? 0}</StatValue>
                <StatSub>Accepted by Resend</StatSub>
              </Stat>
              <Stat>
                <StatLabel>Failed</StatLabel>
                <StatValue>{metrics?.summary.failed ?? 0}</StatValue>
                <StatSub>Provider or transport errors</StatSub>
              </Stat>
              <Stat>
                <StatLabel>Acceptance rate</StatLabel>
                <StatValue>{acceptedRate}</StatValue>
                <StatSub>Accepted / total</StatSub>
              </Stat>
              <Stat>
                <StatLabel>Last send</StatLabel>
                <StatValue style={{ fontSize: "1rem" }}>
                  {formatDate(metrics?.summary.lastSentAt ?? null)}
                </StatValue>
                <StatSub>Most recent delivery record</StatSub>
              </Stat>
            </Stats>
          </Card>

          <Card>
            <CardTitle>Recent deliveries</CardTitle>
            <CardCopy>Последние письма с кодом ответа и message id.</CardCopy>
            {metrics && metrics.items.length > 0 ? (
              <TableWrap style={{ marginTop: 16 }}>
                <Table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Status</th>
                      <th>To</th>
                      <th>Subject</th>
                      <th>HTTP</th>
                      <th>Message ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.items.map((item) => (
                      <tr key={item.id}>
                        <td>{formatDate(item.createdAt)}</td>
                        <td>
                          <StatusPill $status={item.status}>{item.status}</StatusPill>
                        </td>
                        <td>{item.toEmails.join(", ")}</td>
                        <td>{item.subject}</td>
                        <td>{item.responseStatus ?? "-"}</td>
                        <td><Mono>{item.messageId ?? "-"}</Mono></td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
            ) : (
              <Empty style={{ marginTop: 16 }}>No delivery telemetry yet.</Empty>
            )}
          </Card>
        </Grid>
      )}

      {tab === "responses" && (
        <Card>
          <CardTitle>Provider responses</CardTitle>
          <CardCopy>
            Здесь видно, что именно вернул Resend по каждой попытке отправки.
          </CardCopy>
          {metrics && metrics.items.length > 0 ? (
            <ResponseList style={{ marginTop: 16 }}>
              {metrics.items.map((item) => (
                <ResponseCard key={item.id}>
                  <ResponseMeta>
                    <StatusPill $status={item.status}>{item.status}</StatusPill>
                    <span>{formatDate(item.createdAt)}</span>
                    <span>{item.toEmails.join(", ")}</span>
                    <span>HTTP {item.responseStatus ?? "-"}</span>
                    {item.messageId ? <Mono>{item.messageId}</Mono> : null}
                  </ResponseMeta>
                  <div style={{ color: "rgba(255,255,255,0.86)", fontWeight: 700 }}>
                    {item.subject}
                  </div>
                  {item.error ? (
                    <Result $error style={{ marginTop: 10 }}>
                      {item.error}
                    </Result>
                  ) : null}
                  <Pre>{prettyPayload(item.responseBody)}</Pre>
                </ResponseCard>
              ))}
            </ResponseList>
          ) : (
            <Empty style={{ marginTop: 16 }}>No provider responses recorded yet.</Empty>
          )}
        </Card>
      )}
    </Wrap>
  );
};
