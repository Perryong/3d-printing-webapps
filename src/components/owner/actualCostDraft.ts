import type { PrivateOrder } from "../../../shared/orders";
export function actualCostDraft(p: PrivateOrder) {
  const a = p.actualInputs,
    j = a?.job ?? p.job,
    count = j.scope === "per-item" ? j.quantity : 1;
  return {
    hours: j.hours * count,
    grams: j.grams * count,
    kwh: j.measuredKwh === undefined ? "" : String(j.measuredKwh * count),
    handling: a?.handlingMinutes ?? p.settings.handlingMinutes,
    reprints: (a?.reprintsCostCents ?? 0) / 100,
    courier: a ? a.courierCostCents / 100 : p.settings.courierCost,
  };
}
