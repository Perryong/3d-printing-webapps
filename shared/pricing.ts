import { z } from "zod";
const decimal = z
  .union([z.number(), z.string().regex(/^\d+(\.\d{1,9})?$/)])
  .transform(Number)
  .pipe(z.number().finite().min(0).max(1e8));
export const pricingSchema = z
  .object({
    version: z.number().int().positive(),
    tariffPerKwh: decimal,
    tariffValidUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    averageWatts: decimal,
    filamentPerKg: decimal,
    printerCost: decimal,
    recoveryHours: decimal.refine((n) => n > 0),
    maintenancePerHour: decimal,
    labourPerHour: decimal,
    handlingMinutes: decimal,
    packagingCost: decimal,
    reserveRate: decimal.refine((n) => n <= 1),
    marginRate: decimal.refine((n) => n < 1),
    minimumPrintCharge: decimal,
    deliveryCharge: decimal.refine((n) => n === 5),
    courierCost: decimal,
  })
  .strict();
export type PricingSettings = z.infer<typeof pricingSchema>;
export const DEFAULT_PRICING_SETTINGS: PricingSettings = {
  version: 1,
  tariffPerKwh: 0.3116,
  tariffValidUntil: "2026-12-31",
  averageWatts: 150,
  filamentPerKg: 25,
  printerCost: 700,
  recoveryHours: 3000,
  maintenancePerHour: 0.2,
  labourPerHour: 15,
  handlingMinutes: 15,
  packagingCost: 1,
  reserveRate: 0.1,
  marginRate: 0.4,
  minimumPrintCharge: 10,
  deliveryCharge: 5,
  courierCost: 5,
};
export const jobSchema = z
  .object({
    source: z.enum(["preliminary", "bambu-studio-confirmed"]),
    hours: z.number().finite().positive().max(100000),
    grams: z.number().finite().positive().max(1e7),
    quantity: z.number().int().positive().max(10000),
    scope: z.enum(["per-item", "batch"]),
    measuredKwh: z.number().finite().nonnegative().max(1e7).optional(),
  })
  .strict()
  .refine(
    (j) => j.source !== "bambu-studio-confirmed" || j.scope === "batch",
    "Confirmed totals must cover the entire batch",
  );
export type JobTotals = z.infer<typeof jobSchema>;
export type Fulfilment = "collection" | "delivery";
// Nine decimal places retained between operations; monetary boundaries round half up.
const S = 1000000000n;
function fixed(n: number): bigint {
  const [i, f = ""] = n.toFixed(9).split(".");
  return BigInt(i) * S + BigInt(f);
}
const div = (a: bigint, b: bigint) => (a + b / 2n) / b;
const mul = (a: bigint, b: bigint) => div(a * b, S);
const ratio = (a: bigint, b: bigint) => div(a * S, b);
const cents = (a: bigint) => {
  const n = Number(div(a, S / 100n));
  if (!Number.isSafeInteger(n)) throw new Error("Amount too large");
  return n;
};
export function calculateQuote(
  input: JobTotals,
  config: PricingSettings,
  fulfilment: Fulfilment,
  today = new Date().toISOString().slice(0, 10),
) {
  const job = jobSchema.parse(input),
    s = pricingSchema.parse(config);
  z.enum(["collection", "delivery"]).parse(fulfilment);
  const count = job.scope === "per-item" ? BigInt(job.quantity) : 1n;
  const h = fixed(job.hours) * count,
    g = fixed(job.grams) * count;
  const material = mul(ratio(g, fixed(1000)), fixed(s.filamentPerKg));
  const kwh =
    job.measuredKwh === undefined
      ? mul(h, ratio(fixed(s.averageWatts), fixed(1000)))
      : fixed(job.measuredKwh) * count;
  const energy = mul(kwh, fixed(s.tariffPerKwh));
  const depreciation = mul(
    h,
    ratio(fixed(s.printerCost), fixed(s.recoveryHours)),
  );
  const maintenance = mul(h, fixed(s.maintenancePerHour));
  const reserve = mul(
    material + energy + depreciation + maintenance,
    fixed(s.reserveRate),
  );
  const labour = mul(
    ratio(fixed(s.handlingMinutes), fixed(60)),
    fixed(s.labourPerHour),
  );
  const packaging = fixed(s.packagingCost),
    cost =
      material +
      energy +
      depreciation +
      maintenance +
      reserve +
      labour +
      packaging;
  const lines = {
    materialCents: cents(material),
    energyCents: cents(energy),
    depreciationCents: cents(depreciation),
    maintenanceCents: cents(maintenance),
    reserveCents: cents(reserve),
    labourCents: cents(labour),
    packagingCents: cents(packaging),
  };
  const costCents = cents(cost),
    printCents = Math.max(
      cents(fixed(s.minimumPrintCharge)),
      cents(ratio(cost, S - fixed(s.marginRate))),
    );
  const fulfilmentCents =
    fulfilment === "delivery" ? cents(fixed(s.deliveryCharge)) : 0;
  const courierCents =
    fulfilment === "delivery" ? cents(fixed(s.courierCost)) : 0;
  return {
    currency: "SGD" as const,
    source: job.source,
    quantity: job.quantity,
    requiresConfirmation: job.source === "preliminary",
    fulfilment,
    lines,
    costCents,
    roundingAdjustmentCents:
      costCents - Object.values(lines).reduce((a, b) => a + b, 0),
    printCents,
    fulfilmentCents,
    totalCents: printCents + fulfilmentCents,
    courierCents,
    profitCents: printCents + fulfilmentCents - costCents - courierCents,
    settingsVersion: s.version,
    warnings:
      today > s.tariffValidUntil
        ? [
            "Electricity tariff has expired; owner should review the actual bill.",
          ]
        : [],
  };
}
export type PrivateQuote = ReturnType<typeof calculateQuote>;
export function publicQuote(q: PrivateQuote) {
  return {
    currency: q.currency,
    source: q.source,
    quantity: q.quantity,
    requiresConfirmation: q.requiresConfirmation,
    fulfilment: q.fulfilment,
    printCents: q.printCents,
    fulfilmentCents: q.fulfilmentCents,
    totalCents: q.totalCents,
    warnings: q.warnings,
  };
}
export type PublicQuote = ReturnType<typeof publicQuote>;
