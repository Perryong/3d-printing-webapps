import { randomUUID } from "node:crypto";
import { z } from "zod";
import { type Transaction } from "firebase-admin/firestore";
import { calculateQuote, publicQuote, jobSchema } from "../../shared/pricing";
import {
  requestSchema,
  boundsSchema,
  requireVersion,
  canConfirm,
  canAdvance,
  type Order,
  type PrivateOrder,
  type BusinessConfig,
} from "../../shared/orders";
import {
  callable,
  db,
  guard,
  mutate,
  mutationFields,
  validateModel,
  id,
} from "./core";
import { paymentConfig } from "./pricingService";
export async function readOrder(
  tx: Transaction,
  orderId: string,
  uid: string,
  isOwner = false,
) {
  const ref = db.doc("orders/" + orderId),
    priv = db.doc("privateOrders/" + orderId);
  const [s, p] = await Promise.all([tx.get(ref), tx.get(priv)]);
  guard(s.exists && p.exists, "Order not found");
  const o = s.data() as Order;
  guard(isOwner || o.customerUid === uid, "Order not found");
  return { ref, priv, o, p: p.data() as PrivateOrder };
}
export const requestQuote = callable(requestSchema, async (d, r) => {
  await validateModel(d.modelPath, r.auth!.uid);
  return mutate(r.auth!.uid, "requestQuote", d, async (tx) => {
    const c = await tx.get(db.doc("config/business"));
    guard(c.exists, "Owner setup is not ready");
    const settings = c.get("settings"),
      job = { ...d.job, source: "preliminary" as const };
    const q = calculateQuote(job, settings, d.fulfilment),
      orderId =
        "SG-" + randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase(),
      now = new Date().toISOString();
    const order: Order = {
      id: orderId,
      customerUid: r.auth!.uid,
      modelPath: d.modelPath,
      modelRevision: d.modelRevision,
      ...(d.customization ? {customization:d.customization}:{}),
      quantity: d.job.quantity,
      material: "PLA",
      fulfilment: d.fulfilment,
      contact: d.contact,
      ...(d.fulfilment === "delivery"
        ? { deliveryAddress: d.deliveryAddress }
        : {}),
      quoteVersion: 0,
      quoteState: "requested",
      paymentState: "not_requested",
      fulfilmentState: "not_started",
      refundState: "none",
      cancelled: false,
      quote: publicQuote(q),
      createdAt: now,
      updatedAt: now,
    };
    tx.create(db.doc("orders/" + orderId), order);
    tx.create(db.doc("privateOrders/" + orderId), {
      job,
      settings,
      estimate: q,
      ...(d.customization ? {customization:d.customization}:{}),
      audit: [{ action: "requested", uid: r.auth!.uid, at: now }],
    });
    return { orderId };
  });
});
export const confirmQuote = callable(
  z
    .object({ ...mutationFields, job: jobSchema, buildBoundsMm: boundsSchema })
    .strict(),
  async (d, r) =>
    mutate(r.auth!.uid, "confirmQuote", d, async (tx) => {
      const { o, p, ref, priv } = await readOrder(
        tx,
        d.orderId,
        r.auth!.uid,
        true,
      );
      requireVersion(o, d.expectedQuoteVersion);
      guard(
        canConfirm(o),
        "Resolve payment or cancellation before changing this quote",
      );
      guard(
        d.job.source === "bambu-studio-confirmed" && d.job.scope === "batch",
        "Enter confirmed Bambu Studio totals for the whole batch",
      );
      guard(
        d.job.quantity === o.quantity,
        "Quantity changed: create a new request",
      );
      const c = await tx.get(db.doc("config/business")),
        settings = c.get("settings"),
        q = calculateQuote(d.job, settings, o.fulfilment),
        now = new Date().toISOString();
      tx.update(ref, {
        quote: publicQuote(q),
        quoteVersion: o.quoteVersion + 1,
        quoteState: "confirmed",
        paymentState: "not_requested",
        acceptedQuote: null,
        paymentConfig: null,
        updatedAt: now,
      });
      tx.update(priv, {
        job: d.job,
        settings,
        estimate: q,
        buildBoundsMm: d.buildBoundsMm,
        audit: [...p.audit, { action: "confirmed", uid: r.auth!.uid, at: now }],
      });
      return publicQuote(q);
    }),
  true,
);
export const acceptQuote = callable(
  z.object(mutationFields).strict(),
  async (d, r) =>
    mutate(r.auth!.uid, "acceptQuote", d, async (tx) => {
      const { o, ref } = await readOrder(tx, d.orderId, r.auth!.uid);
      requireVersion(o, d.expectedQuoteVersion);
      guard(
        !o.cancelled &&
          o.quoteState === "confirmed" &&
          o.paymentState === "not_requested",
        "Review the confirmed quote before accepting",
      );
      const c = await tx.get(db.doc("config/business"));
      const payment = paymentConfig(c.get("businessConfig") as BusinessConfig);
      guard(payment.ready, "Payment setup is incomplete. Contact the owner.");
      const updated = {
        ...o,
        quoteState: "accepted" as const,
        paymentState: "awaiting_payment" as const,
        acceptedQuote: o.quote,
        paymentConfig: payment,
        updatedAt: new Date().toISOString(),
      };
      tx.set(ref, updated);
      return updated;
    }),
);
export const advanceFulfilment = callable(
  z
    .object({
      requestId: z.string().uuid(),
      orderId: id,
      nextState: z.enum([
        "printing",
        "ready",
        "collected",
        "dispatched",
        "completed",
      ]),
    })
    .strict(),
  async (d, r) =>
    mutate(r.auth!.uid, "advanceFulfilment", d, async (tx) => {
      const { o, ref, p, priv } = await readOrder(
        tx,
        d.orderId,
        r.auth!.uid,
        true,
      );
      guard(
        canAdvance(o, d.nextState),
        "Payment or fulfilment state does not allow this action",
      );
      const now = new Date().toISOString();
      tx.update(ref, { fulfilmentState: d.nextState, updatedAt: now });
      tx.update(priv, {
        audit: [...p.audit, { action: d.nextState, uid: r.auth!.uid, at: now }],
      });
      return { ok: true };
    }),
  true,
);
export const cancelOrder = callable(
  z
    .object({
      requestId: z.string().uuid(),
      orderId: id,
      reason: z.string().trim().min(1).max(500),
    })
    .strict(),
  async (d, r) =>
    mutate(r.auth!.uid, "cancelOrder", d, async (tx) => {
      const { o, ref, p, priv } = await readOrder(
        tx,
        d.orderId,
        r.auth!.uid,
        r.auth!.token.owner === true,
      );
      guard(
        !o.cancelled &&
          o.fulfilmentState === "not_started" &&
          o.paymentState !== "verification_pending",
        "Cancellation requires no printing and no pending payment verification",
      );
      const now = new Date().toISOString();
      tx.update(ref, {
        cancelled: true,
        refundState: o.paymentState === "paid" ? "required" : "none",
        updatedAt: now,
      });
      tx.update(priv, {
        audit: [
          ...p.audit,
          {
            action: "cancelled",
            uid: r.auth!.uid,
            at: now,
            reference: d.reason,
          },
        ],
      });
      return { ok: true };
    }),
);
