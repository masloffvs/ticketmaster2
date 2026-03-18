import { container } from "@/core/di";
import { LogsService } from "@/services/logs.service";
import Elysia, { t } from "elysia";

export const logsRoutes = new Elysia({ prefix: "/logs" })
  .get(
    "/",
    async ({ query }) => {
      const service = container.resolve(LogsService);
      return service.getLogs({
        limit: query.limit ? Number(query.limit) : undefined,
        offset: query.offset ? Number(query.offset) : undefined,
        level: query.level || undefined,
        service: query.service || undefined,
        search: query.search || undefined,
        from: query.from || undefined,
        to: query.to || undefined,
      });
    },
    {
      query: t.Object({
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
        level: t.Optional(t.String()),
        service: t.Optional(t.String()),
        search: t.Optional(t.String()),
        from: t.Optional(t.String()),
        to: t.Optional(t.String()),
      }),
    },
  )
  .get("/stats", async () => {
    const service = container.resolve(LogsService);
    return service.getStats();
  })
  .get("/services", async () => {
    const service = container.resolve(LogsService);
    return service.getServices();
  });
