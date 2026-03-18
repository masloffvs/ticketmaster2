import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  parseTopologyData,
  type TopologyData,
} from "../components/SeatMapCanvas";
import { useTmDataStore } from "../store/useTmDataStore";

/* ── Context value ───────────────────────────────────────────── */

interface SceneTopologyCtx {
  /** Parsed topology ready for SeatMapCanvas */
  topologyData: TopologyData | null;
  /** Raw topology blob from the TM API */
  rawTopology: unknown;
  /** Whether the topology is currently being fetched */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Whether the topology was persisted to the worker cache */
  persisted: boolean;
  /** Re-fetch topology for the current event */
  refetch: () => void;
}

const SceneTopologyContext = createContext<SceneTopologyCtx | null>(null);

/* ── Provider ────────────────────────────────────────────────── */

interface SceneTopologyProviderProps {
  eventId: string;
  children: ReactNode;
}

export const SceneTopologyProvider = ({
  eventId,
  children,
}: SceneTopologyProviderProps) => {
  const { topology, topologyLoading, topologyError, fetchTopology } =
    useTmDataStore();

  const [persisted, setPersisted] = useState(false);

  const topologyData = useMemo(() => parseTopologyData(topology), [topology]);

  // Fetch topology from the serverlayer cache (Redis → Mongo → TM API)
  const refetch = useCallback(() => {
    if (eventId) fetchTopology(eventId);
  }, [eventId, fetchTopology]);

  useEffect(() => {
    if (!eventId) return;

    // 1) Fetch topology through serverlayer (Redis hot → MongoDB persistent → TM API first-demand)
    fetchTopology(eventId);

    // 2) Fire-and-forget: ensure workerslayer has a permanent copy in MongoDB
    //    Topology is immutable (scene layout never changes), so this is a one-time persist
    setPersisted(false);
    fetch("/api/worker/topology/fetch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId }),
    })
      .then((res) => {
        if (res.ok) setPersisted(true);
      })
      .catch(() => {
        // Silent — persistence is best-effort, not critical for page render
      });
  }, [eventId, fetchTopology]);

  const value = useMemo<SceneTopologyCtx>(
    () => ({
      topologyData,
      rawTopology: topology,
      loading: topologyLoading,
      error: topologyError,
      persisted,
      refetch,
    }),
    [
      topologyData,
      topology,
      topologyLoading,
      topologyError,
      persisted,
      refetch,
    ],
  );

  return (
    <SceneTopologyContext.Provider value={value}>
      {children}
    </SceneTopologyContext.Provider>
  );
};

/* ── Hook ────────────────────────────────────────────────────── */

export function useSceneTopology(): SceneTopologyCtx {
  const ctx = useContext(SceneTopologyContext);
  if (!ctx) {
    throw new Error(
      "useSceneTopology must be used within a <SceneTopologyProvider>",
    );
  }
  return ctx;
}
