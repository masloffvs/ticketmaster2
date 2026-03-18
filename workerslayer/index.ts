import { cors } from "@elysiajs/cors";
import {
  clickhouseFromEnv,
  createLogger,
  shutdownLogger,
} from "@ticketmaster/logger";
import { Elysia, t } from "elysia";
import { TopologyFetcher } from "./src/topology-fetcher";
import { TopologyStore } from "./src/topology-store";

// ── Logger ──────────────────────────────────────────────────────
const logger = createLogger({
  service: "workerslayer",
  env: Bun.env.NODE_ENV,
  clickhouse: clickhouseFromEnv(),
});

// ── MongoDB topology store ──────────────────────────────────────
const mongoUrl = Bun.env.MONGO_URL ?? "mongodb://mongo:mongo@localhost:27017";
const mongoDb = Bun.env.MONGO_DB ?? "ticketmaster";

const store = new TopologyStore(mongoUrl, mongoDb, logger);
await store.connect();

const fetcher = new TopologyFetcher(store, logger);

// ── HTTP API ────────────────────────────────────────────────────
const port = Number(Bun.env.PORT ?? 3001);
const host = Bun.env.HOST ?? "0.0.0.0";

const app = new Elysia()
  .use(cors())
  .onRequest(({ request }) => {
    logger.debug(
      { method: request.method, url: request.url },
      "incoming request",
    );
  })
  .onError(({ error, request }) => {
    logger.error(
      { method: request.method, url: request.url, error: error.message },
      "request error",
    );
  })

  // ── Health ──────────────────────────────────────────────
  .get("/health", () => ({ status: "ok", service: "workerslayer" }))

  // ── Fetch topology → store in MongoDB ───────────────────
  .post(
    "/topology/fetch",
    async ({ body }) => {
      const { eventId } = body;
      const result = await fetcher.fetchAndStore(eventId);
      return {
        ok: true,
        ...result,
      };
    },
    {
      body: t.Object({ eventId: t.String() }),
    },
  )

  // ── Batch fetch ─────────────────────────────────────────
  .post(
    "/topology/fetch-batch",
    async ({ body }) => {
      const results = await Promise.allSettled(
        body.eventIds.map((id) => fetcher.fetchAndStore(id)),
      );
      return results.map((r, i) =>
        r.status === "fulfilled"
          ? { ok: true, ...r.value }
          : {
              ok: false,
              eventId: body.eventIds[i],
              error: r.reason?.message ?? String(r.reason),
            },
      );
    },
    {
      body: t.Object({
        eventIds: t.Array(t.String(), { minItems: 1, maxItems: 50 }),
      }),
    },
  )

  // ── Read from MongoDB ───────────────────────────────────
  .get(
    "/topology/:eventId",
    async ({ params, set }) => {
      const doc = await store.get(params.eventId);
      if (!doc) {
        set.status = 404;
        return { error: "Topology not found", eventId: params.eventId };
      }
      return {
        eventId: doc.eventId,
        fetchedAt: doc.fetchedAt.toISOString(),
        sizeBytes: doc.sizeBytes,
        source: doc.source,
        data: doc.data,
      };
    },
    { params: t.Object({ eventId: t.String() }) },
  )

  // ── List stored topologies (without data blob) ──────────
  .get("/topology", async ({ query }) => {
    const limit = Number(query.limit) || 50;
    const docs = await store.list(limit);
    return docs.map((d) => ({
      eventId: d.eventId,
      fetchedAt: d.fetchedAt.toISOString(),
      sizeBytes: d.sizeBytes,
      source: d.source,
    }));
  })

  // ── Stats ───────────────────────────────────────────────
  .get("/topology/stats", async () => {
    return store.stats();
  })

  .listen({ port, hostname: host });

logger.info(
  `Workerslayer running at http://${app.server?.hostname}:${app.server?.port}`,
);

// ── Graceful shutdown ───────────────────────────────────────────
process.on("SIGTERM", async () => {
  logger.info("Shutting down workerslayer...");
  shutdownLogger();
  await store.close();
  process.exit(0);
});
