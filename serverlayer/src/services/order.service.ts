import { Inject, Singleton } from "@/core/di";
import { DatabaseProvider } from "@/db";
import {
  checkoutSessions,
  events,
  orderEvents,
  orderItems,
  orders,
  partners,
  paymentTransactions,
  reservationHolds,
  users,
} from "@/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { PartnerService } from "./partner.service";

type JsonValue = Record<string, unknown> | unknown[] | string | number | boolean | null;

export interface CreateOrderItemInput {
  itemType?: string;
  description?: string;
  externalOfferId?: string;
  externalInventoryType?: string;
  externalPlaceIds?: string[];
  section?: string;
  rowLabel?: string;
  seatFrom?: string;
  seatTo?: string;
  quantity: number;
  currencyCode?: string;
  unitPriceMinor: number;
  feesMinor?: number;
  taxMinor?: number;
  discountMinor?: number;
  totalMinor?: number;
  ticketSnapshot?: JsonValue;
}

export interface CreateOrderInput {
  channel: string;
  userId?: string;
  partnerId?: string;
  eventId?: string;
  externalEventId?: string;
  buyerEmail?: string;
  buyerName?: string;
  currencyCode?: string;
  status?: string;
  expiresAt?: string;
  checkoutSession?: {
    selectedOfferSnapshot?: JsonValue;
    pricingSnapshot?: JsonValue;
    expiresAt?: string;
  };
  items: CreateOrderItemInput[];
}

export interface OrderSummary {
  id: string;
  publicOrderNo: string;
  status: string;
  channel: string;
  buyerEmail: string | null;
  buyerName: string | null;
  currencyCode: string;
  totalMinor: number;
  eventId: string | null;
  externalEventId: string | null;
  partnerId: string | null;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrderDetail extends OrderSummary {
  checkoutSessionId: string | null;
  userId: string | null;
  expiresAt: string | null;
  submittedAt: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  subtotalMinor: number;
  feesMinor: number;
  taxMinor: number;
  discountMinor: number;
  eventSnapshot: JsonValue | null;
  event: { id: string; name: string; date: string | null } | null;
  partner: { id: string; email: string; name: string | null } | null;
  user: { id: string; email: string; name: string | null } | null;
  checkoutSession:
    | {
        id: string;
        status: string;
        expiresAt: string;
        selectedOfferSnapshot: JsonValue | null;
        pricingSnapshot: JsonValue | null;
      }
    | null;
  items: Array<{
    id: string;
    lineNo: number;
    itemType: string;
    description: string | null;
    externalOfferId: string | null;
    externalInventoryType: string | null;
    externalPlaceIds: string[] | null;
    section: string | null;
    rowLabel: string | null;
    seatFrom: string | null;
    seatTo: string | null;
    quantity: number;
    currencyCode: string;
    unitPriceMinor: number;
    feesMinor: number;
    taxMinor: number;
    discountMinor: number;
    totalMinor: number;
    ticketSnapshot: JsonValue | null;
    createdAt: string;
  }>;
  holds: Array<{
    id: string;
    provider: string;
    providerHoldId: string | null;
    status: string;
    expiresAt: string | null;
    releasedAt: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  payments: Array<{
    id: string;
    provider: string;
    providerPaymentId: string | null;
    status: string;
    amountMinor: number;
    currencyCode: string;
    idempotencyKey: string;
    createdAt: string;
    updatedAt: string;
    authorizedAt: string | null;
    capturedAt: string | null;
    failedAt: string | null;
  }>;
  timeline: Array<{
    id: string;
    eventType: string;
    actorType: string;
    actorId: string | null;
    payload: JsonValue | null;
    createdAt: string;
  }>;
}

@Singleton()
export class OrderService {
  constructor(
    @Inject(DatabaseProvider) private dbProvider: DatabaseProvider,
    @Inject(PartnerService) private partnerService: PartnerService,
  ) {}

  private get db() {
    return this.dbProvider.db;
  }

  async listOrders(input?: {
    status?: string;
    partnerId?: string;
    limit?: number;
  }): Promise<OrderSummary[]> {
    const filters = [];
    if (input?.status?.trim()) {
      filters.push(eq(orders.status, input.status.trim()));
    }
    if (input?.partnerId?.trim()) {
      filters.push(eq(orders.partnerId, input.partnerId.trim()));
    }

    const rows = await this.db
      .select()
      .from(orders)
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(orders.createdAt))
      .limit(Math.min(Math.max(input?.limit ?? 100, 1), 500));

    const orderIds = rows.map((row) => row.id);
    const items =
      orderIds.length > 0
        ? await this.db
            .select({
              orderId: orderItems.orderId,
            })
            .from(orderItems)
            .where(inArray(orderItems.orderId, orderIds))
        : [];
    const itemCountByOrder = items.reduce<Record<string, number>>((acc, item) => {
      acc[item.orderId] = (acc[item.orderId] ?? 0) + 1;
      return acc;
    }, {});

    return rows.map((row) => this.toOrderSummary(row, itemCountByOrder[row.id] ?? 0));
  }

  async getOrderById(orderId: string): Promise<OrderDetail | null> {
    const [row] = await this.db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));
    if (!row) {
      return null;
    }

    const [eventRow, partnerRow, userRow, checkoutSessionRow] =
      await Promise.all([
        row.eventId
          ? this.db
              .select()
              .from(events)
              .where(eq(events.id, row.eventId))
              .then((rows) => rows[0] ?? null)
          : Promise.resolve(null),
        row.partnerId
          ? this.db
              .select()
              .from(partners)
              .where(eq(partners.id, row.partnerId))
              .then((rows) => rows[0] ?? null)
          : Promise.resolve(null),
        row.userId
          ? this.db
              .select()
              .from(users)
              .where(eq(users.id, row.userId))
              .then((rows) => rows[0] ?? null)
          : Promise.resolve(null),
        row.checkoutSessionId
          ? this.db
              .select()
              .from(checkoutSessions)
              .where(eq(checkoutSessions.id, row.checkoutSessionId))
              .then((rows) => rows[0] ?? null)
          : Promise.resolve(null),
      ]);

    const [itemRows, holdRows, paymentRows, timelineRows] = await Promise.all([
      this.db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, row.id))
        .orderBy(orderItems.lineNo),
      this.db
        .select()
        .from(reservationHolds)
        .where(eq(reservationHolds.orderId, row.id))
        .orderBy(desc(reservationHolds.createdAt)),
      this.db
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.orderId, row.id))
        .orderBy(desc(paymentTransactions.createdAt)),
      this.db
        .select()
        .from(orderEvents)
        .where(eq(orderEvents.orderId, row.id))
        .orderBy(desc(orderEvents.createdAt)),
    ]);

    return {
      ...this.toOrderSummary(row, itemRows.length),
      checkoutSessionId: row.checkoutSessionId,
      userId: row.userId,
      expiresAt: row.expiresAt?.toISOString() ?? null,
      submittedAt: row.submittedAt?.toISOString() ?? null,
      paidAt: row.paidAt?.toISOString() ?? null,
      cancelledAt: row.cancelledAt?.toISOString() ?? null,
      subtotalMinor: row.subtotalMinor,
      feesMinor: row.feesMinor,
      taxMinor: row.taxMinor,
      discountMinor: row.discountMinor,
      eventSnapshot: (row.eventSnapshot as JsonValue | null) ?? null,
      event: eventRow
        ? {
            id: eventRow.id,
            name: eventRow.name,
            date: eventRow.date?.toISOString() ?? null,
          }
        : null,
      partner: partnerRow
        ? {
            id: partnerRow.id,
            email: partnerRow.email,
            name: partnerRow.name,
          }
        : null,
      user: userRow
        ? {
            id: userRow.id,
            email: userRow.email,
            name: userRow.name,
          }
        : null,
      checkoutSession: checkoutSessionRow
        ? {
            id: checkoutSessionRow.id,
            status: checkoutSessionRow.status,
            expiresAt: checkoutSessionRow.expiresAt.toISOString(),
            selectedOfferSnapshot:
              (checkoutSessionRow.selectedOfferSnapshot as JsonValue | null) ??
              null,
            pricingSnapshot:
              (checkoutSessionRow.pricingSnapshot as JsonValue | null) ?? null,
          }
        : null,
      items: itemRows.map((item) => ({
        id: item.id,
        lineNo: item.lineNo,
        itemType: item.itemType,
        description: item.description,
        externalOfferId: item.externalOfferId,
        externalInventoryType: item.externalInventoryType,
        externalPlaceIds: (item.externalPlaceIds as string[] | null) ?? null,
        section: item.section,
        rowLabel: item.rowLabel,
        seatFrom: item.seatFrom,
        seatTo: item.seatTo,
        quantity: item.quantity,
        currencyCode: item.currencyCode,
        unitPriceMinor: item.unitPriceMinor,
        feesMinor: item.feesMinor,
        taxMinor: item.taxMinor,
        discountMinor: item.discountMinor,
        totalMinor: item.totalMinor,
        ticketSnapshot: (item.ticketSnapshot as JsonValue | null) ?? null,
        createdAt: item.createdAt.toISOString(),
      })),
      holds: holdRows.map((hold) => ({
        id: hold.id,
        provider: hold.provider,
        providerHoldId: hold.providerHoldId,
        status: hold.status,
        expiresAt: hold.expiresAt?.toISOString() ?? null,
        releasedAt: hold.releasedAt?.toISOString() ?? null,
        createdAt: hold.createdAt.toISOString(),
        updatedAt: hold.updatedAt.toISOString(),
      })),
      payments: paymentRows.map((payment) => ({
        id: payment.id,
        provider: payment.provider,
        providerPaymentId: payment.providerPaymentId,
        status: payment.status,
        amountMinor: payment.amountMinor,
        currencyCode: payment.currencyCode,
        idempotencyKey: payment.idempotencyKey,
        createdAt: payment.createdAt.toISOString(),
        updatedAt: payment.updatedAt.toISOString(),
        authorizedAt: payment.authorizedAt?.toISOString() ?? null,
        capturedAt: payment.capturedAt?.toISOString() ?? null,
        failedAt: payment.failedAt?.toISOString() ?? null,
      })),
      timeline: timelineRows.map((entry) => ({
        id: entry.id,
        eventType: entry.eventType,
        actorType: entry.actorType,
        actorId: entry.actorId,
        payload: (entry.payload as JsonValue | null) ?? null,
        createdAt: entry.createdAt.toISOString(),
      })),
    };
  }

  async createOrder(input: CreateOrderInput): Promise<OrderDetail> {
    if (!input.items.length) {
      throw new Error("Order must contain at least one item");
    }

    const currencyCode = (input.currencyCode || input.items[0]?.currencyCode || "USD")
      .trim()
      .toUpperCase();
    const status = input.status?.trim() || "draft";
    const publicOrderNo = this.generatePublicOrderNo();
    const buyerEmail = input.buyerEmail?.trim().toLowerCase() || null;
    const resolvedPartner =
      !input.partnerId && buyerEmail
        ? await this.partnerService.resolvePartnerByEmailDomain(buyerEmail)
        : null;
    const effectivePartnerId = input.partnerId || resolvedPartner?.id || null;

    const itemRows = input.items.map((item, index) => {
      const feesMinor = item.feesMinor ?? 0;
      const taxMinor = item.taxMinor ?? 0;
      const discountMinor = item.discountMinor ?? 0;
      const totalMinor =
        item.totalMinor ??
        item.unitPriceMinor * item.quantity +
          feesMinor +
          taxMinor -
          discountMinor;

      return {
        lineNo: index + 1,
        itemType: item.itemType?.trim() || "ticket",
        description: item.description?.trim() || null,
        externalOfferId: item.externalOfferId?.trim() || null,
        externalInventoryType: item.externalInventoryType?.trim() || null,
        externalPlaceIds: item.externalPlaceIds ?? null,
        section: item.section?.trim() || null,
        rowLabel: item.rowLabel?.trim() || null,
        seatFrom: item.seatFrom?.trim() || null,
        seatTo: item.seatTo?.trim() || null,
        quantity: item.quantity,
        currencyCode: (item.currencyCode || currencyCode).trim().toUpperCase(),
        unitPriceMinor: item.unitPriceMinor,
        feesMinor,
        taxMinor,
        discountMinor,
        totalMinor,
        ticketSnapshot: item.ticketSnapshot ?? null,
      };
    });

    const totals = itemRows.reduce(
      (acc, item) => {
        acc.subtotalMinor += item.unitPriceMinor * item.quantity;
        acc.feesMinor += item.feesMinor;
        acc.taxMinor += item.taxMinor;
        acc.discountMinor += item.discountMinor;
        acc.totalMinor += item.totalMinor;
        return acc;
      },
      {
        subtotalMinor: 0,
        feesMinor: 0,
        taxMinor: 0,
        discountMinor: 0,
        totalMinor: 0,
      },
    );

    const detail = await this.db.transaction(async (tx) => {
      let eventSnapshot: JsonValue | null = null;
      if (input.eventId) {
        const eventRow = await tx.query.events.findFirst({
          where: eq(events.id, input.eventId),
        });
        if (!eventRow) {
          throw new Error("Event not found");
        }
        eventSnapshot = {
          id: eventRow.id,
          name: eventRow.name,
          venue: eventRow.venue,
          city: eventRow.city,
          country: eventRow.country,
          date: eventRow.date?.toISOString() ?? null,
          externalId: eventRow.externalId,
        };
      }

      let checkoutSessionId: string | null = null;
      if (input.checkoutSession) {
        const [session] = await tx
          .insert(checkoutSessions)
          .values({
            channel: input.channel.trim(),
            userId: input.userId || null,
            partnerId: effectivePartnerId,
            eventId: input.eventId || null,
            externalEventId: input.externalEventId || null,
            status: "open",
            buyerEmail,
            selectedOfferSnapshot:
              input.checkoutSession.selectedOfferSnapshot ?? null,
            pricingSnapshot: input.checkoutSession.pricingSnapshot ?? null,
            expiresAt: new Date(
              input.checkoutSession.expiresAt ?? Date.now() + 15 * 60 * 1000,
            ),
          })
          .returning();
        checkoutSessionId = session.id;
      }

      const [order] = await tx
        .insert(orders)
        .values({
          publicOrderNo,
          checkoutSessionId,
          channel: input.channel.trim(),
          userId: input.userId || null,
          partnerId: effectivePartnerId,
          eventId: input.eventId || null,
          externalEventId: input.externalEventId || null,
          status,
          currencyCode,
          subtotalMinor: totals.subtotalMinor,
          feesMinor: totals.feesMinor,
          taxMinor: totals.taxMinor,
          discountMinor: totals.discountMinor,
          totalMinor: totals.totalMinor,
          buyerEmail,
          buyerName: input.buyerName?.trim() || null,
          eventSnapshot,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
          submittedAt:
            status === "pending_payment" || status === "paid"
              ? new Date()
              : null,
          paidAt: status === "paid" ? new Date() : null,
          cancelledAt: status === "cancelled" ? new Date() : null,
        })
        .returning();

      await tx.insert(orderItems).values(
        itemRows.map((item) => ({
          orderId: order.id,
          ...item,
        })),
      );

      await tx.insert(orderEvents).values({
        orderId: order.id,
        eventType: "order.created",
        actorType: effectivePartnerId ? "partner" : input.userId ? "user" : "admin",
        actorId: effectivePartnerId || input.userId || null,
        payload: {
          status,
          channel: input.channel.trim(),
          itemCount: itemRows.length,
          totalMinor: totals.totalMinor,
          partnerAssignment: effectivePartnerId
            ? input.partnerId
              ? "explicit"
              : "domain"
            : "general",
        },
      });

      return order.id;
    });

    const created = await this.getOrderById(detail);
    if (!created) {
      throw new Error("Created order not found");
    }
    return created;
  }

  async updateOrderStatus(input: {
    orderId: string;
    status: string;
    actorType?: string;
    actorId?: string;
    note?: string;
  }): Promise<OrderDetail> {
    const [current] = await this.db
      .select()
      .from(orders)
      .where(eq(orders.id, input.orderId));
    if (!current) {
      throw new Error("Order not found");
    }

    const nextStatus = input.status.trim();
    const now = new Date();
    const [updated] = await this.db
      .update(orders)
      .set({
        status: nextStatus,
        updatedAt: now,
        submittedAt:
          nextStatus === "pending_payment" && !current.submittedAt
            ? now
            : current.submittedAt,
        paidAt: nextStatus === "paid" ? now : current.paidAt,
        cancelledAt:
          nextStatus === "cancelled" || nextStatus === "expired"
            ? now
            : current.cancelledAt,
      })
      .where(eq(orders.id, input.orderId))
      .returning();

    await this.db.insert(orderEvents).values({
      orderId: input.orderId,
      eventType: "order.status_changed",
      actorType: input.actorType?.trim() || "admin",
      actorId: input.actorId?.trim() || null,
      payload: {
        from: current.status,
        to: nextStatus,
        note: input.note?.trim() || null,
      },
    });

    const detail = await this.getOrderById(updated.id);
    if (!detail) {
      throw new Error("Updated order not found");
    }
    return detail;
  }

  private generatePublicOrderNo(): string {
    return `TM-${randomBytes(5).toString("hex").toUpperCase()}`;
  }

  private toOrderSummary(
    row: typeof orders.$inferSelect,
    itemCount: number,
  ): OrderSummary {
    return {
      id: row.id,
      publicOrderNo: row.publicOrderNo,
      status: row.status,
      channel: row.channel,
      buyerEmail: row.buyerEmail,
      buyerName: row.buyerName,
      currencyCode: row.currencyCode,
      totalMinor: row.totalMinor,
      eventId: row.eventId,
      externalEventId: row.externalEventId,
      partnerId: row.partnerId,
      itemCount,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
