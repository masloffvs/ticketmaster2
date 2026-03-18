import { container } from "@/core/di";
import { PartnerService } from "@/services/partner.service";
import Elysia, { t } from "elysia";

export const partnerRoutes = new Elysia({ prefix: "/partners" })
  .get("/", async () => {
    const service = container.resolve(PartnerService);
    return service.listPartners();
  })
  .post(
    "/",
    async ({ body }) => {
      const service = container.resolve(PartnerService);
      return service.createPartner(body);
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        name: t.Optional(t.String()),
      }),
    },
  )
  .post(
    "/:id/rotate-key",
    async ({ params }) => {
      const service = container.resolve(PartnerService);
      return service.rotateKeyPair(params.id);
    },
    { params: t.Object({ id: t.String() }) },
  )
  .post(
    "/:id/status",
    async ({ params, body }) => {
      const service = container.resolve(PartnerService);
      return service.setPartnerActive(params.id, body.isActive);
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({ isActive: t.Boolean() }),
    },
  );
