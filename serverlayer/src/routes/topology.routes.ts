import { container } from "@/core/di";
import { TopologyService } from "@/services/topology.service";
import Elysia, { t } from "elysia";

export const topologyRoutes = new Elysia({ prefix: "/topology" }).get(
  "/:eventId",
  async ({ params }) => {
    const service = container.resolve(TopologyService);
    return service.getTopology(params.eventId);
  },
  { params: t.Object({ eventId: t.String() }) },
);
