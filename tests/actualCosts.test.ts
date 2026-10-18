import { test } from "node:test";
import assert from "node:assert/strict";
import { actualCostDraft } from "../src/components/owner/actualCostDraft";
import { DEFAULT_PRICING_SETTINGS } from "../shared/pricing";
import type { PrivateOrder } from "../shared/orders";
test("owner reload preserves saved actual costs and measured energy", () => {
  const p = {
    job: {
      source: "bambu-studio-confirmed",
      scope: "batch",
      quantity: 2,
      hours: 2,
      grams: 60,
      measuredKwh: 0.5,
    },
    settings: DEFAULT_PRICING_SETTINGS,
    actualInputs: {
      job: {
        source: "bambu-studio-confirmed",
        scope: "batch",
        quantity: 2,
        hours: 3,
        grams: 70,
        measuredKwh: 0.8,
      },
      handlingMinutes: 30,
      reprintsCostCents: 500,
      courierCostCents: 700,
    },
  } as PrivateOrder;
  assert.deepEqual(actualCostDraft(p), {
    hours: 3,
    grams: 70,
    kwh: "0.8",
    handling: 30,
    reprints: 5,
    courier: 7,
  });
  assert.equal(actualCostDraft({ ...p, actualInputs: undefined }).kwh, "0.5");
});
