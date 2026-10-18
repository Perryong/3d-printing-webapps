import { z } from "zod";
import {
  jobSchema,
  type JobTotals,
  type PublicQuote,
  type PricingSettings,
  type PrivateQuote,
} from "./pricing";
const text = z.string().trim().min(1).max(300);
export const businessSchema = z
  .object({
    name: text,
    recipientName: text,
    paynowIdentifier: z.string().trim().max(100),
    qrPath: z.string().max(200),
    recipientConfirmed: z.boolean(),
    collectionInstructions: text,
    taxStatus: z.enum(["unknown", "non-gst", "gst-registered"]),
    liveEnabled: z.boolean(),
  })
  .strict();
export type BusinessConfig = z.infer<typeof businessSchema>;
export function setupReady(b: BusinessConfig) {
  return !!(
    b.name &&
    b.recipientName &&
    (b.paynowIdentifier || b.qrPath) &&
    b.recipientConfirmed &&
    b.collectionInstructions &&
    b.taxStatus === "non-gst"
  );
}
export const requestSchema = z
  .object({
    requestId: z.string().uuid(),
    modelPath: text,
    modelRevision: text,
    job: jobSchema,
    contact: z
      .object({
        name: text,
        email: z.string().email().max(254),
        phone: z.string().regex(/^\+?[\d ()-]{8,20}$/),
      })
      .strict(),
    fulfilment: z.enum(["collection", "delivery"]),
    deliveryAddress: z
      .object({ line: text, postal: z.string().regex(/^\d{6}$/) })
      .strict()
      .optional(),
  })
  .strict()
  .refine(
    (v) => v.fulfilment !== "delivery" || !!v.deliveryAddress,
    "Delivery address and six-digit postal code required",
  );
export type QuoteRequest = z.infer<typeof requestSchema>;
export type Order = {
  id: string;
  customerUid: string;
  modelPath: string;
  modelRevision: string;
  quantity: number;
  material: "PLA";
  fulfilment: "collection" | "delivery";
  contact: QuoteRequest["contact"];
  deliveryAddress?: QuoteRequest["deliveryAddress"];
  quoteVersion: number;
  quoteState: "requested" | "confirmed" | "accepted";
  paymentState:
    | "not_requested"
    | "awaiting_payment"
    | "verification_pending"
    | "paid";
  fulfilmentState:
    | "not_started"
    | "printing"
    | "ready"
    | "collected"
    | "dispatched"
    | "completed";
  refundState: "none" | "required" | "recorded";
  cancelled: boolean;
  quote: PublicQuote;
  acceptedQuote?: PublicQuote;
  paymentConfig?: PublicPaymentConfig;
  createdAt: string;
  updatedAt: string;
  transferReference?: string;
  paymentRejection?: string;
};
export type PublicPaymentConfig = Pick<
  BusinessConfig,
  | "name"
  | "recipientName"
  | "paynowIdentifier"
  | "qrPath"
  | "collectionInstructions"
> & { ready: boolean; demo: boolean };
export type ActualCostInputs = {
  job: JobTotals;
  handlingMinutes: number;
  reprintsCostCents: number;
  courierCostCents: number;
};
export type PrivateOrder = {
  actualInputs?: ActualCostInputs;
  buildBoundsMm?: { x: number; y: number; z: number };
  job: JobTotals;
  settings: PricingSettings;
  estimate: PrivateQuote;
  verification?: {
    ownerUid: string;
    verifiedAt: string;
    bankReference: string;
    amountCents: number;
    quoteVersion: number;
  };
  actual?: {
    costCents: number;
    courierCents: number;
    profitCents: number;
    complete: boolean;
  };
  audit: Array<{ action: string; uid: string; at: string; reference?: string }>;
};
export const boundsSchema = z
  .object({
    x: z.number().finite().positive().max(256),
    y: z.number().finite().positive().max(256),
    z: z.number().finite().positive().max(256),
  })
  .strict();
export function requireVersion(order: Order, version: number) {
  if (order.quoteVersion !== version)
    throw new Error("Quote changed. Refresh and review the current quote.");
}
export function canConfirm(o: Order) {
  return (
    !o.cancelled &&
    o.fulfilmentState === "not_started" &&
    !["verification_pending", "paid"].includes(o.paymentState)
  );
}
export function canAdvance(o: Order, next: Order["fulfilmentState"]) {
  const transitions: Record<string, string> = {
    not_started: "printing",
    printing: "ready",
    ready: o.fulfilment === "collection" ? "collected" : "dispatched",
    collected: "completed",
    dispatched: "completed",
  };
  return (
    !o.cancelled &&
    o.paymentState === "paid" &&
    transitions[o.fulfilmentState] === next
  );
}
