import { container } from "@/core/di";
import { EventService } from "@/services";
import Elysia, { t } from "elysia";

export const eventRoutes = new Elysia({ prefix: "/events" })
  .get("/", async () => {
    const service = container.resolve(EventService);
    return service.findAll();
  })
  .get(
    "/:id",
    async ({ params }) => {
      const service = container.resolve(EventService);
      const event = await service.findById(params.id);
      if (!event) {
        throw new Error("Event not found");
      }
      return event;
    },
    { params: t.Object({ id: t.String() }) },
  )
  .post(
    "/",
    async ({ body }) => {
      const service = container.resolve(EventService);
      const { date, ...rest } = body;
      return service.create({
        ...rest,
        date: date ? new Date(date) : undefined,
      });
    },
    {
      body: t.Object({
        name: t.String(),
        description: t.Optional(t.String()),
        artistId: t.Optional(t.String()),
        venue: t.Optional(t.String()),
        city: t.Optional(t.String()),
        country: t.Optional(t.String()),
        date: t.Optional(t.String()),
        imageUrl: t.Optional(t.String()),
        ticketUrl: t.Optional(t.String()),
        minPrice: t.Optional(t.Number()),
        maxPrice: t.Optional(t.Number()),
        currency: t.Optional(t.String()),
      }),
    },
  );
