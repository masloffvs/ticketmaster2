import { container } from "@/core/di";
import { OrderService } from "@/services/order.service";
import Elysia, { t } from "elysia";

export const orderRoutes = new Elysia({ prefix: "/orders" })
  .get("/", async ({ query }) => {
    const service = container.resolve(OrderService);
    return service.listOrders({
      status: query.status,
      partnerId: query.partnerId,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  })
  .get(
    "/:id",
    async ({ params }) => {
      const service = container.resolve(OrderService);
      const order = await service.getOrderById(params.id);
      if (!order) {
        throw new Error("Order not found");
      }
      return order;
    },
    { params: t.Object({ id: t.String() }) },
  )
  .post(
    "/",
    async ({ body }) => {
      const service = container.resolve(OrderService);
      return service.createOrder(body);
    },
    {
      body: t.Object({
        channel: t.String(),
        userId: t.Optional(t.String()),
        partnerId: t.Optional(t.String()),
        eventId: t.Optional(t.String()),
        externalEventId: t.Optional(t.String()),
        buyerEmail: t.Optional(t.String()),
        buyerName: t.Optional(t.String()),
        currencyCode: t.Optional(t.String()),
        status: t.Optional(t.String()),
        expiresAt: t.Optional(t.String()),
        checkoutSession: t.Optional(
          t.Object({
            selectedOfferSnapshot: t.Optional(t.Any()),
            pricingSnapshot: t.Optional(t.Any()),
            expiresAt: t.Optional(t.String()),
          }),
        ),
        items: t.Array(
          t.Object({
            itemType: t.Optional(t.String()),
            description: t.Optional(t.String()),
            externalOfferId: t.Optional(t.String()),
            externalInventoryType: t.Optional(t.String()),
            externalPlaceIds: t.Optional(t.Array(t.String())),
            section: t.Optional(t.String()),
            rowLabel: t.Optional(t.String()),
            seatFrom: t.Optional(t.String()),
            seatTo: t.Optional(t.String()),
            quantity: t.Number(),
            currencyCode: t.Optional(t.String()),
            unitPriceMinor: t.Number(),
            feesMinor: t.Optional(t.Number()),
            taxMinor: t.Optional(t.Number()),
            discountMinor: t.Optional(t.Number()),
            totalMinor: t.Optional(t.Number()),
            ticketSnapshot: t.Optional(t.Any()),
          }),
        ),
      }),
    },
  )
  .post(
    "/:id/status",
    async ({ params, body }) => {
      const service = container.resolve(OrderService);
      return service.updateOrderStatus({
        orderId: params.id,
        status: body.status,
        actorType: body.actorType,
        actorId: body.actorId,
        note: body.note,
      });
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        status: t.String(),
        actorType: t.Optional(t.String()),
        actorId: t.Optional(t.String()),
        note: t.Optional(t.String()),
      }),
    },
  );
