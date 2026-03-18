import { useCallback, useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";

/* ── Types ───────────────────────────────────────────────────── */

interface FetchResult {
  label: string;
  status: "idle" | "loading" | "ok" | "error";
  ms?: number;
  sizeBytes?: number;
  data?: unknown;
  error?: string;
}

interface InspectorState {
  topology: FetchResult;
  manifest: FetchResult;
  geometry: FetchResult;
  facets: FetchResult;
  quickpicks: FetchResult;
  persist: FetchResult;
}

const INIT: InspectorState = {
  topology: { label: "Topology", status: "idle" },
  manifest: { label: "Manifest", status: "idle" },
  geometry: { label: "Geometry", status: "idle" },
  facets: { label: "Facets", status: "idle" },
  quickpicks: { label: "Quickpicks", status: "idle" },
  persist: { label: "Persist (Worker)", status: "idle" },
};

/* ── Styled ──────────────────────────────────────────────────── */

const Wrap = styled.div`
  padding: 8px 4px;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 120px);
`;

const TopRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  flex-wrap: wrap;
`;

const Input = styled.input`
  height: 32px;
  border: none;
  outline: none;
  border-radius: 6px;
  background: #121212;
  color: rgba(255, 255, 255, 0.88);
  padding: 0 12px;
  font: inherit;
  font-size: 0.78rem;
  flex: 1;
  min-width: 200px;
  max-width: 400px;

  &::placeholder {
    color: rgba(255, 255, 255, 0.28);
  }
`;

const Btn = styled.button<{ $accent?: boolean }>`
  height: 32px;
  border: none;
  outline: none;
  border-radius: 6px;
  background: ${(p) => (p.$accent ? "#1d4ed8" : "#1a1a1a")};
  color: ${(p) => (p.$accent ? "#fff" : "rgba(255,255,255,0.6)")};
  padding: 0 16px;
  font: inherit;
  font-size: 0.74rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: ${(p) => (p.$accent ? "#2563eb" : "#222")};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

/* ── Result cards ────────────────────────────────────────────── */

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 8px;
  margin-bottom: 12px;
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const Card = styled.div<{ $status: string }>`
  border-radius: 8px;
  background: #111;
  border: 1px solid
    ${(p) =>
      p.$status === "ok"
        ? "rgba(34,197,94,0.25)"
        : p.$status === "error"
          ? "rgba(239,68,68,0.25)"
          : p.$status === "loading"
            ? "rgba(59,130,246,0.25)"
            : "rgba(255,255,255,0.06)"};
  padding: 12px 14px;
  cursor: ${(p) => (p.$status === "ok" ? "pointer" : "default")};
  transition:
    border 0.2s,
    background 0.15s;

  &:hover {
    background: ${(p) => (p.$status === "ok" ? "#151515" : "#111")};
  }
`;

const CardLabel = styled.div`
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.35);
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const Spinner = styled.span`
  display: inline-block;
  width: 10px;
  height: 10px;
  border: 2px solid rgba(59, 130, 246, 0.3);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: ${spin} 0.6s linear infinite;
`;

const StatusDot = styled.span<{ $color: string }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${(p) => p.$color};
`;

const CardValue = styled.div`
  font-size: 0.82rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.85);
`;

const CardSub = styled.div`
  font-size: 0.66rem;
  color: rgba(255, 255, 255, 0.3);
  margin-top: 2px;
`;

/* ── Data viewer overlay ─────────────────────────────────────── */

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Modal = styled.div`
  width: min(1000px, 92vw);
  max-height: 88vh;
  background: #0e0e0e;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
`;

const ModalTitle = styled.div`
  font-size: 0.82rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.88);
`;

const ModalTabs = styled.div`
  display: flex;
  gap: 2px;
  padding: 0 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
`;

const ModalTab = styled.button<{ $active: boolean }>`
  border: none;
  outline: none;
  background: transparent;
  color: ${(p) => (p.$active ? "#60a5fa" : "rgba(255,255,255,0.4)")};
  font: inherit;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 8px 14px;
  cursor: pointer;
  border-bottom: 2px solid ${(p) => (p.$active ? "#3b82f6" : "transparent")};
  margin-bottom: -1px;
  transition: color 0.15s;

  &:hover {
    color: rgba(255, 255, 255, 0.7);
  }
`;

const ModalBody = styled.pre`
  flex: 1;
  overflow: auto;
  padding: 14px 18px;
  margin: 0;
  font-family: "SF Mono", "Fira Code", Consolas, monospace;
  font-size: 0.66rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.7);
  white-space: pre-wrap;
  word-break: break-all;
`;

const CloseBtn = styled.button`
  border: none;
  outline: none;
  background: #1a1a1a;
  color: rgba(255, 255, 255, 0.6);
  border-radius: 6px;
  padding: 4px 12px;
  font: inherit;
  font-size: 0.72rem;
  cursor: pointer;

  &:hover {
    background: #222;
    color: rgba(255, 255, 255, 0.85);
  }
`;

/* ── History ─────────────────────────────────────────────────── */

const HistoryWrap = styled.div`
  flex: 1;
  overflow-y: auto;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.04);
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.74rem;

  th,
  td {
    text-align: left;
    padding: 6px 10px;
    white-space: nowrap;
  }

  th {
    position: sticky;
    top: 0;
    background: #111;
    color: rgba(255, 255, 255, 0.4);
    font-size: 0.64rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    z-index: 1;
  }

  tr:hover td {
    background: rgba(255, 255, 255, 0.02);
  }
`;

const Td = styled.td`
  color: rgba(255, 255, 255, 0.72);
  border-bottom: 1px solid rgba(255, 255, 255, 0.025);
`;

const TdMono = styled(Td)`
  font-family: "SF Mono", "Fira Code", Consolas, monospace;
  font-size: 0.68rem;
`;

const TdStatus = styled(Td)<{ $ok: boolean }>`
  color: ${(p) => (p.$ok ? "#4ade80" : "#f87171")};
  font-weight: 600;
`;

const InspectBtn = styled.button`
  border: none;
  outline: none;
  background: rgba(59, 130, 246, 0.12);
  color: #60a5fa;
  border-radius: 4px;
  padding: 2px 10px;
  font: inherit;
  font-size: 0.66rem;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: rgba(59, 130, 246, 0.2);
  }
`;

const EmptyState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: rgba(255, 255, 255, 0.2);
  font-size: 0.78rem;
`;

/* ── Helpers ─────────────────────────────────────────────────── */

function fmtBytes(n: number): string {
  if (n >= 1_048_576) return `${(n / 1_048_576).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}

function statusColor(s: string): string {
  if (s === "ok") return "#22c55e";
  if (s === "error") return "#ef4444";
  if (s === "loading") return "#3b82f6";
  return "rgba(255,255,255,0.15)";
}

/* ── Timed fetch helper ──────────────────────────────────────── */

async function timedFetch(
  url: string,
  opts?: RequestInit,
): Promise<{ data: unknown; ms: number; sizeBytes: number }> {
  const t0 = performance.now();
  const res = await fetch(url, opts);
  const text = await res.text();
  const ms = Math.round(performance.now() - t0);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  const data = JSON.parse(text);
  return { data, ms, sizeBytes: text.length };
}

/* ── History entry ───────────────────────────────────────────── */

interface HistoryEntry {
  eventId: string;
  ts: number;
  state: InspectorState;
}

type ModalDataKey = "topology" | "manifest" | "geometry" | "facets" | "quickpicks" | "persist";

/* ── Component ───────────────────────────────────────────────── */

export const EventInspectorWidget = () => {
  const [eventId, setEventId] = useState("");
  const [running, setRunning] = useState(false);
  const [state, setState] = useState<InspectorState>(INIT);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalEntry, setModalEntry] = useState<InspectorState | null>(null);
  const [modalTab, setModalTab] = useState<ModalDataKey>("topology");
  const abortRef = useRef<AbortController | null>(null);

  const inspect = useCallback(
    async (id: string) => {
      const eid = id.trim();
      if (!eid || running) return;

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      setRunning(true);
      const next: InspectorState = {
        topology: { label: "Topology", status: "loading" },
        manifest: { label: "Manifest", status: "loading" },
        geometry: { label: "Geometry", status: "loading" },
        facets: { label: "Facets", status: "loading" },
        quickpicks: { label: "Quickpicks", status: "loading" },
        persist: { label: "Persist (Worker)", status: "loading" },
      };
      setState({ ...next });

      const update = (
        key: keyof InspectorState,
        patch: Partial<FetchResult>,
      ) => {
        next[key] = { ...next[key], ...patch };
        setState({ ...next });
      };

      const enc = encodeURIComponent(eid);

      // All 4 fetches in parallel
      const jobs: Array<{
        key: keyof InspectorState;
        promise: Promise<{ data: unknown; ms: number; sizeBytes: number }>;
      }> = [
        {
          key: "topology",
          promise: timedFetch(`/api/topology/${enc}`),
        },
        {
          key: "manifest",
          promise: timedFetch(`/api/tm/manifest/${enc}`),
        },
        {
          key: "geometry",
          promise: timedFetch(`/api/tm/geometry/${enc}`),
        },
        {
          key: "facets",
          promise: timedFetch(`/api/tm/facets/${enc}`),
        },
        {
          key: "quickpicks",
          promise: timedFetch(`/api/tm/quickpicks/${enc}`),
        },
        {
          key: "persist",
          promise: timedFetch("/api/worker/topology/fetch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ eventId: eid }),
          }),
        },
      ];

      await Promise.allSettled(
        jobs.map(async ({ key, promise }) => {
          try {
            const result = await promise;
            if (ac.signal.aborted) return;
            update(key, {
              status: "ok",
              ms: result.ms,
              sizeBytes: result.sizeBytes,
              data: result.data,
            });
          } catch (err) {
            if (ac.signal.aborted) return;
            update(key, {
              status: "error",
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }),
      );

      if (!ac.signal.aborted) {
        setHistory((prev) =>
          [{ eventId: eid, ts: Date.now(), state: { ...next } }, ...prev].slice(
            0,
            50,
          ),
        );
        setRunning(false);
      }
    },
    [running],
  );

  const openModal = (entry: InspectorState) => {
    setModalEntry(entry);
    // Auto-select first available tab
    const avail = (
      ["topology", "manifest", "geometry", "facets", "quickpicks", "persist"] as const
    ).find((k) => entry[k].status === "ok");
    setModalTab(avail ?? "topology");
    setModalOpen(true);
  };

  // Escape closes modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Wrap>
      {/* ── Input row ───── */}
      <TopRow>
        <Input
          placeholder="Enter Event ID (e.g. Z7r9jZ1A7-6ud)…"
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") inspect(eventId);
          }}
        />
        <Btn
          $accent
          onClick={() => inspect(eventId)}
          disabled={running || !eventId.trim()}
        >
          {running ? "Inspecting…" : "Inspect Event"}
        </Btn>
      </TopRow>

      {/* ── Status cards ───── */}
      <Grid>
        {(["topology", "manifest", "geometry", "facets", "quickpicks", "persist"] as const).map(
          (key) => {
            const r = state[key];
            return (
              <Card
                key={key}
                $status={r.status}
                onClick={() => {
                  if (r.status === "ok") openModal(state);
                }}
              >
                <CardLabel>
                  {r.status === "loading" ? (
                    <Spinner />
                  ) : (
                    <StatusDot $color={statusColor(r.status)} />
                  )}
                  {r.label}
                </CardLabel>
                <CardValue>
                  {r.status === "idle" && "—"}
                  {r.status === "loading" && "Fetching…"}
                  {r.status === "ok" &&
                    (r.sizeBytes != null ? fmtBytes(r.sizeBytes) : "OK")}
                  {r.status === "error" && "Failed"}
                </CardValue>
                <CardSub>
                  {r.status === "ok" && r.ms != null && `${r.ms}ms`}
                  {r.status === "error" && r.error}
                </CardSub>
              </Card>
            );
          },
        )}
      </Grid>

      {/* ── History table ───── */}
      <HistoryWrap>
        {history.length === 0 ? (
          <EmptyState>Enter an Event ID above to start inspecting</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Event ID</th>
                <th>Time</th>
                <th>Topology</th>
                <th>Manifest</th>
                <th>Geometry</th>
                <th>Facets</th>
                <th>Quickpicks</th>
                <th>Persist</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={`${h.eventId}-${h.ts}-${i}`}>
                  <TdMono>{h.eventId}</TdMono>
                  <Td>
                    {new Date(h.ts).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </Td>
                  <TdStatus $ok={h.state.topology.status === "ok"}>
                    {h.state.topology.status === "ok"
                      ? `✓ ${h.state.topology.ms}ms`
                      : "✗"}
                  </TdStatus>
                  <TdStatus $ok={h.state.manifest.status === "ok"}>
                    {h.state.manifest.status === "ok"
                      ? `✓ ${h.state.manifest.ms}ms`
                      : "✗"}
                  </TdStatus>
                  <TdStatus $ok={h.state.geometry.status === "ok"}>
                    {h.state.geometry.status === "ok"
                      ? `✓ ${h.state.geometry.ms}ms`
                      : "✗"}
                  </TdStatus>
                  <TdStatus $ok={h.state.facets.status === "ok"}>
                    {h.state.facets.status === "ok"
                      ? `✓ ${h.state.facets.ms}ms`
                      : "✗"}
                  </TdStatus>
                  <TdStatus $ok={h.state.quickpicks.status === "ok"}>
                    {h.state.quickpicks.status === "ok"
                      ? `✓ ${h.state.quickpicks.ms}ms`
                      : "✗"}
                  </TdStatus>
                  <TdStatus $ok={h.state.persist.status === "ok"}>
                    {h.state.persist.status === "ok"
                      ? `✓ ${h.state.persist.ms}ms`
                      : "✗"}
                  </TdStatus>
                  <Td>
                    <InspectBtn onClick={() => openModal(h.state)}>
                      View Data
                    </InspectBtn>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </HistoryWrap>

      {/* ── Data modal ───── */}
      {modalOpen && modalEntry && (
        <Overlay onClick={() => setModalOpen(false)}>
          <Modal onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Event Data Inspector</ModalTitle>
              <CloseBtn onClick={() => setModalOpen(false)}>Close</CloseBtn>
            </ModalHeader>
            <ModalTabs>
              {([
                "topology", "manifest", "geometry", "facets", "quickpicks", "persist",
              ] as const).map(
                (key) => (
                  <ModalTab
                    key={key}
                    $active={modalTab === key}
                    onClick={() => setModalTab(key)}
                  >
                    {modalEntry[key].label}
                    {modalEntry[key].status === "ok" && (
                      <span style={{ color: "#4ade80", marginLeft: 4 }}>✓</span>
                    )}
                    {modalEntry[key].status === "error" && (
                      <span style={{ color: "#f87171", marginLeft: 4 }}>✗</span>
                    )}
                  </ModalTab>
                ),
              )}
            </ModalTabs>
            <ModalBody>
              {modalEntry[modalTab].status === "ok"
                ? JSON.stringify(modalEntry[modalTab].data, null, 2)
                : modalEntry[modalTab].status === "error"
                  ? `Error: ${modalEntry[modalTab].error}`
                  : "No data"}
            </ModalBody>
          </Modal>
        </Overlay>
      )}
    </Wrap>
  );
};
