import OrderReferences from "../customization/OrderReferences";
import { useEffect, useRef, useState } from "react";
import { checkoutAuth } from "../../lib/firebase";
import {
  callCheckout,
  watchOrders,
  assetUrl,
  sgd,
} from "../../services/checkoutService";
import {
  canAdvance,
  canConfirm,
  type Order,
  type PrivateOrder,
} from "../../../shared/orders";
import { actualCostDraft } from "./actualCostDraft";
function OrderCard({ order: o }: { order: Order }) {
  const [privateOrder, setPrivate] = useState<PrivateOrder>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [hours, setHours] = useState(1),
    [grams, setGrams] = useState(30),
    [kwh, setKwh] = useState(""),
    [bounds, setBounds] = useState({ x: 100, y: 100, z: 20 }),
    [bankRef, setBankRef] = useState(""),
    [reason, setReason] = useState(""),
    [handling, setHandling] = useState(15),
    [reprints, setReprints] = useState(0),
    [courier, setCourier] = useState(5),
    [inspected, setInspected] = useState(false);
  const attempt = useRef<{ key: string; id: string }>();
  const load = () =>
    callCheckout<PrivateOrder>("getPrivateOrder", { orderId: o.id }).then(
      (p) => {
        setPrivate(p);
      },
    );
  useEffect(() => {
    let active = true;
    callCheckout<PrivateOrder>("getPrivateOrder", { orderId: o.id })
      .then((p) => {
        if (active) {
          setPrivate(p);
          const draft = actualCostDraft(p);
          setHours(draft.hours);
          setGrams(draft.grams);
          setKwh(draft.kwh);
          setHandling(draft.handling);
          setReprints(draft.reprints);
          setCourier(draft.courier);
          if (p.buildBoundsMm) setBounds(p.buildBoundsMm);
        }
      })
      .catch((e) => setError(e.message));
    return () => {
      active = false;
    };
  }, [o.id, o.quoteVersion]);
  async function act(name: string, extra: object = {}) {
    const data = {
      orderId: o.id,
      ...(["confirmQuote", "verifyPayment"].includes(name)
        ? { expectedQuoteVersion: o.quoteVersion }
        : {}),
      ...extra,
    };
    const key = JSON.stringify([name, data]);
    if (attempt.current?.key !== key)
      attempt.current = { key, id: crypto.randomUUID() };
    setBusy(true);
    setError("");
    try {
      await callCheckout(name, { ...data, requestId: attempt.current.id });
      attempt.current = undefined;
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const job = {
    source: "bambu-studio-confirmed",
    scope: "batch",
    quantity: o.quantity,
    hours,
    grams,
    ...(kwh !== "" ? { measuredKwh: Number(kwh) } : {}),
  };
  return (
    <section>
      <h2 className="break-all">{o.id}</h2>
      <p>
        {o.contact.name} · {o.contact.email} · {o.contact.phone}
      </p>
      <p>
        {o.quantity} × PLA · {o.fulfilment} · {sgd(o.quote.totalCents)} · quote
        v{o.quoteVersion}
      </p>
      {o.deliveryAddress && (
        <p>
          {o.deliveryAddress.line}, Singapore {o.deliveryAddress.postal}
        </p>
      )}
      <p>
        {o.cancelled ? "Cancelled" : o.quoteState} · {o.paymentState} ·{" "}
        {o.fulfilmentState} · refund {o.refundState}
      </p>
      <button
        onClick={async () => {
          try {
            const url = await assetUrl(o.modelPath);
            window.open(url, "_blank", "noopener,noreferrer");
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        Download customer STL
      </button>
      <OrderReferences order={o}/>
      {privateOrder && (
        <p className="my-3">
          Estimated production & handling cost:{" "}
          {sgd(privateOrder.estimate.costCents)} · courier expense:{" "}
          {sgd(privateOrder.estimate.courierCents)} · estimated profit:{" "}
          <strong>{sgd(privateOrder.estimate.profitCents)}</strong> (settings v
          {privateOrder.settings.version})
        </p>
      )}
      <fieldset disabled={busy} className="space-y-4 mt-4">
        {(canConfirm(o) || (o.paymentState === "paid" && !o.cancelled)) && (
          <div className="grid sm:grid-cols-3 gap-3">
            <label>
              Whole batch printing hours
              <input
                type="number"
                step="any"
                min="0.001"
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
              />
            </label>
            <label>
              Whole batch grams (supports + purge included)
              <input
                type="number"
                step="any"
                min="0.001"
                value={grams}
                onChange={(e) => setGrams(Number(e.target.value))}
              />
            </label>
            <label>
              Measured energy kWh (optional, replaces estimate)
              <input
                type="number"
                min="0"
                step="any"
                value={kwh}
                onChange={(e) => setKwh(e.target.value)}
              />
            </label>
          </div>
        )}
        {canConfirm(o) && (
          <>
            <div className="grid grid-cols-3 gap-3">
              {(["x", "y", "z"] as const).map((k) => (
                <label key={k}>
                  Occupied plate {k.toUpperCase()} (mm)
                  <input
                    type="number"
                    min="0.001"
                    max="256"
                    step="any"
                    value={bounds[k]}
                    onChange={(e) =>
                      setBounds({ ...bounds, [k]: Number(e.target.value) })
                    }
                  />
                </label>
              ))}
            </div>
            <label>
              <input
                type="checkbox"
                checked={inspected}
                onChange={(e) => setInspected(e.target.checked)}
              />
              I inspected the model and sliced all {o.quantity} items in Bambu
              Studio on the A1's 256 mm build volume. Totals include supports
              and purge.
            </label>
            <button
              disabled={!inspected}
              onClick={() =>
                act("confirmQuote", { job, buildBoundsMm: bounds })
              }
            >
              Confirm sliced quote
            </button>
          </>
        )}
        {o.paymentState === "verification_pending" && (
          <>
            <p>
              Customer reference: {o.transferReference || "Not supplied"}. Check
              your bank record for {sgd(o.acceptedQuote!.totalCents)} before
              approving.
            </p>
            <label>
              Bank transaction reference
              <input
                value={bankRef}
                onChange={(e) => setBankRef(e.target.value)}
              />
            </label>
            <button
              disabled={!bankRef.trim()}
              onClick={() =>
                act("verifyPayment", {
                  decision: "approve",
                  bankReference: bankRef,
                })
              }
            >
              Verify received payment
            </button>
            <label>
              Rejection reason
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <button
              disabled={!reason.trim()}
              onClick={() =>
                act("verifyPayment", { decision: "reject", reason })
              }
            >
              Reject payment claim
            </button>
          </>
        )}
        {(
          ["printing", "ready", "collected", "dispatched", "completed"] as const
        )
          .filter((n) => canAdvance(o, n))
          .map((n) => (
            <button
              key={n}
              onClick={() => act("advanceFulfilment", { nextState: n })}
            >
              Mark {n}
            </button>
          ))}
        {!o.cancelled &&
          o.fulfilmentState === "not_started" &&
          o.paymentState !== "verification_pending" && (
            <button
              onClick={() =>
                act("cancelOrder", {
                  reason: "Owner cancelled before printing",
                })
              }
            >
              Cancel order
            </button>
          )}
        {o.refundState === "required" && (
          <>
            <label>
              Completed bank refund reference
              <input
                value={bankRef}
                onChange={(e) => setBankRef(e.target.value)}
              />
            </label>
            <button
              disabled={!bankRef.trim()}
              onClick={() => act("recordRefund", { reference: bankRef })}
            >
              Record manual refund
            </button>
            <p>
              This records a refund you already sent; it does not transfer
              money.
            </p>
          </>
        )}
        {o.paymentState === "paid" && !o.cancelled && (
          <>
            <h3 className="font-semibold">Actual cost record</h3>
            <p>
              Use actual whole-batch totals above for the successful prints.
              Enter additional failed-print expense separately; it replaces the
              estimated reserve.
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              <label>
                Actual handling minutes
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={handling}
                  onChange={(e) => setHandling(Number(e.target.value))}
                />
              </label>
              <label>
                Additional reprint expense (S$)
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={reprints}
                  onChange={(e) => setReprints(Number(e.target.value))}
                />
              </label>
              <label>
                Actual courier expense (S$)
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={courier}
                  onChange={(e) => setCourier(Number(e.target.value))}
                />
              </label>
            </div>
            <button
              onClick={() =>
                act("recordActualCosts", {
                  job,
                  handlingMinutes: handling,
                  reprintsCostCents: Math.round(reprints * 100),
                  courierCostCents: Math.round(courier * 100),
                })
              }
            >
              Save actual costs
            </button>
            {privateOrder?.actual && (
              <p>
                {privateOrder.actual.complete
                  ? "Final recorded"
                  : "Partial recorded"}{" "}
                profit: {sgd(privateOrder.actual.profitCents)}
              </p>
            )}
          </>
        )}
      </fieldset>
      {error && (
        <p role="alert" className="text-red-700 mt-3">
          {error}
        </p>
      )}
    </section>
  );
}
export default function OwnerOrders() {
  const [orders, setOrders] = useState<Order[]>([]),
    [error, setError] = useState("");
  useEffect(
    () =>
      watchOrders(checkoutAuth!.currentUser!.uid, true, setOrders, (e) =>
        setError(e.message),
      ),
    [],
  );
  return (
    <div>
      <h2 className="mt-6">Orders</h2>
      {error && <p role="alert">{error}</p>}
      {orders.length === 0 && <p>No orders yet.</p>}
      {orders.map((o) => (
        <OrderCard key={o.id} order={o} />
      ))}
    </div>
  );
}
