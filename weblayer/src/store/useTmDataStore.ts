import { create } from "zustand";

// ─── Manifest types (availability.ticketmaster.se) ──────────────
export interface ManifestPriceLevel {
  id: number;
  name: string;
  currency: string;
  value: number;
  fees: number;
  total: number;
}

export interface ManifestSection {
  id: string;
  name: string;
  priceLevels: ManifestPriceLevel[];
  availableCount?: number;
}

export interface ManifestData {
  eventId: string;
  sections: ManifestSection[];
  raw: unknown;
}

// ─── Geometry types (mapsapi.tmol.co) ───────────────────────────
export interface GeoPlace {
  id: string;
  name: string;
  type: string;
  color?: string;
  path?: string;
  points?: Array<{ x: number; y: number }>;
  labels?: Array<{ text: string; x: number; y: number }>;
  children?: GeoPlace[];
}

export interface GeometryData {
  eventId: string;
  viewBox?: { width: number; height: number };
  places: GeoPlace[];
  raw: unknown;
}

// ─── Store ──────────────────────────────────────────────────────
interface TmDataState {
  manifest: ManifestData | null;
  geometry: GeometryData | null;
  topology: unknown | null;
  facets: unknown | null;
  quickpicks: unknown | null;
  manifestLoading: boolean;
  geometryLoading: boolean;
  topologyLoading: boolean;
  facetsLoading: boolean;
  quickpicksLoading: boolean;
  manifestError: string | null;
  geometryError: string | null;
  topologyError: string | null;
  facetsError: string | null;
  quickpicksError: string | null;

  fetchManifest: (eventId: string) => Promise<void>;
  fetchGeometry: (eventId: string) => Promise<void>;
  fetchTopology: (eventId: string) => Promise<void>;
  fetchFacets: (eventId: string) => Promise<void>;
  fetchQuickpicks: (eventId: string) => Promise<void>;
  fetchAll: (eventId: string) => Promise<void>;
  reset: () => void;
}

function parseManifest(eventId: string, raw: unknown): ManifestData {
  const data = raw as Record<string, unknown>;
  const sections: ManifestSection[] = [];

  // The TM manifest API typically returns facets/sections with price info
  // Adapt parsing based on actual response shape
  const facets = (data.facets ?? data.sections ?? []) as Array<
    Record<string, unknown>
  >;
  for (const facet of facets) {
    const priceLevels: ManifestPriceLevel[] = [];
    const prices = (facet.priceLevels ?? facet.prices ?? []) as Array<
      Record<string, unknown>
    >;
    for (const p of prices) {
      priceLevels.push({
        id: Number(p.id ?? 0),
        name: String(p.name ?? p.description ?? ""),
        currency: String(p.currency ?? "SEK"),
        value: Number(p.value ?? p.price ?? 0),
        fees: Number(p.fees ?? p.serviceFee ?? 0),
        total: Number(
          p.total ?? p.totalPrice ?? Number(p.value ?? 0) + Number(p.fees ?? 0),
        ),
      });
    }
    sections.push({
      id: String(facet.id ?? facet.sectionId ?? ""),
      name: String(facet.name ?? facet.sectionName ?? ""),
      priceLevels,
      availableCount:
        facet.availableCount != null ? Number(facet.availableCount) : undefined,
    });
  }

  return { eventId, sections, raw };
}

function parseGeometry(eventId: string, raw: unknown): GeometryData {
  const data = raw as Record<string, unknown>;
  const places: GeoPlace[] = [];

  // mapsapi.tmol.co typically returns places with SVG path data
  const rawPlaces = (data.places ?? data.sections ?? []) as Array<
    Record<string, unknown>
  >;
  let maxW = 0;
  let maxH = 0;

  function parsePlaceTree(items: Array<Record<string, unknown>>): GeoPlace[] {
    const result: GeoPlace[] = [];
    for (const item of items) {
      const points = (item.points ?? []) as Array<Record<string, number>>;
      for (const pt of points) {
        if (pt.x > maxW) maxW = pt.x;
        if (pt.y > maxH) maxH = pt.y;
      }
      const children = item.children
        ? parsePlaceTree(item.children as Array<Record<string, unknown>>)
        : undefined;
      result.push({
        id: String(item.id ?? ""),
        name: String(item.name ?? ""),
        type: String(item.type ?? "section"),
        color: item.color ? String(item.color) : undefined,
        path: item.path ? String(item.path) : undefined,
        points:
          points.length > 0
            ? points.map((p) => ({ x: p.x, y: p.y }))
            : undefined,
        labels: item.labels
          ? (item.labels as Array<Record<string, unknown>>).map((l) => ({
              text: String(l.text ?? ""),
              x: Number(l.x ?? 0),
              y: Number(l.y ?? 0),
            }))
          : undefined,
        children,
      });
    }
    return result;
  }

  places.push(...parsePlaceTree(rawPlaces));

  return {
    eventId,
    viewBox: maxW > 0 ? { width: maxW, height: maxH } : undefined,
    places,
    raw,
  };
}

export const useTmDataStore = create<TmDataState>((set) => ({
  manifest: null,
  geometry: null,
  topology: null,
  facets: null,
  quickpicks: null,
  manifestLoading: false,
  geometryLoading: false,
  topologyLoading: false,
  facetsLoading: false,
  quickpicksLoading: false,
  manifestError: null,
  geometryError: null,
  topologyError: null,
  facetsError: null,
  quickpicksError: null,

  fetchManifest: async (eventId) => {
    set({ manifestLoading: true, manifestError: null });
    try {
      const res = await fetch(
        `/api/tm/manifest/${encodeURIComponent(eventId)}`,
      );
      if (!res.ok) throw new Error(`Manifest HTTP ${res.status}`);
      const json = await res.json();
      set({ manifest: parseManifest(eventId, json), manifestLoading: false });
    } catch (err) {
      set({
        manifestError:
          err instanceof Error ? err.message : "Failed to fetch manifest",
        manifestLoading: false,
      });
    }
  },

  fetchGeometry: async (eventId) => {
    set({ geometryLoading: true, geometryError: null });
    try {
      const res = await fetch(
        `/api/tm/geometry/${encodeURIComponent(eventId)}`,
      );
      if (!res.ok) throw new Error(`Geometry HTTP ${res.status}`);
      const json = await res.json();
      set({ geometry: parseGeometry(eventId, json), geometryLoading: false });
    } catch (err) {
      set({
        geometryError:
          err instanceof Error ? err.message : "Failed to fetch geometry",
        geometryLoading: false,
      });
    }
  },

  fetchTopology: async (eventId) => {
    set({ topologyLoading: true, topologyError: null });
    try {
      const res = await fetch(`/api/topology/${encodeURIComponent(eventId)}`);
      if (!res.ok) throw new Error(`Topology HTTP ${res.status}`);
      const json = await res.json();
      set({ topology: json, topologyLoading: false });
    } catch (err) {
      set({
        topologyError:
          err instanceof Error ? err.message : "Failed to fetch topology",
        topologyLoading: false,
      });
    }
  },

  fetchFacets: async (eventId) => {
    set({ facetsLoading: true, facetsError: null });
    try {
      const res = await fetch(`/api/tm/facets/${encodeURIComponent(eventId)}`);
      if (!res.ok) throw new Error(`Facets HTTP ${res.status}`);
      const json = await res.json();
      set({ facets: json, facetsLoading: false });
    } catch (err) {
      set({
        facetsError:
          err instanceof Error ? err.message : "Failed to fetch facets",
        facetsLoading: false,
      });
    }
  },

  fetchQuickpicks: async (eventId) => {
    set({ quickpicksLoading: true, quickpicksError: null });
    try {
      const res = await fetch(
        `/api/tm/quickpicks/${encodeURIComponent(eventId)}`,
      );
      if (!res.ok) throw new Error(`Quickpicks HTTP ${res.status}`);
      const json = await res.json();
      set({ quickpicks: json, quickpicksLoading: false });
    } catch (err) {
      set({
        quickpicksError:
          err instanceof Error ? err.message : "Failed to fetch quickpicks",
        quickpicksLoading: false,
      });
    }
  },

  fetchAll: async (eventId) => {
    const store = useTmDataStore.getState();
    await Promise.allSettled([
      store.fetchManifest(eventId),
      store.fetchGeometry(eventId),
      store.fetchTopology(eventId),
      store.fetchFacets(eventId),
      store.fetchQuickpicks(eventId),
    ]);
  },

  reset: () =>
    set({
      manifest: null,
      geometry: null,
      topology: null,
      facets: null,
      quickpicks: null,
      manifestLoading: false,
      geometryLoading: false,
      topologyLoading: false,
      facetsLoading: false,
      quickpicksLoading: false,
      manifestError: null,
      geometryError: null,
      topologyError: null,
      facetsError: null,
      quickpicksError: null,
    }),
}));
