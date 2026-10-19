import { useEffect, useRef, useState } from "react";
import type {
  JobTotals,
  PublicQuote,
  Fulfilment,
} from "../../../shared/pricing";
import { checkoutMode, ensureCustomerSession } from "../../lib/firebase";
import {
  callCheckout,
  uploadModel,
  watchOrders,
  sgd,
} from "../../services/checkoutService";
import CheckoutForm, { type CheckoutDetails } from "./CheckoutForm";
import OrderStatus from "./OrderStatus";
import "./checkout.css";
import type { Customization } from "../../../shared/customization";
export default function QuotePanel({
  job,
  modelFile,
  modelRevision,
  inspecting = false,
  blockedReason = "",
  customization,
}: {
  job: JobTotals | null;
  modelFile: File | null;
  modelRevision: string;
  inspecting?: boolean;
  blockedReason?: string;
  customization?: Customization;
}) {
  const [open, setOpen] = useState(false),
    [quantity, setQuantity] = useState(1),
    [fulfilment, setFulfilment] = useState<Fulfilment>("collection"),
    [quote, setQuote] = useState<PublicQuote>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [orderIds, setOrderIds] = useState<string[]>([]);
  useEffect(() => {
    if (inspecting) setOpen(false);
  }, [inspecting]);
  const attempt = useRef<{ key: string; id: string }>();
  const jobKey = JSON.stringify(job);
  const draftKey = JSON.stringify([
    jobKey,
    modelRevision,
    quantity,
    fulfilment,
    customization,
    blockedReason,
  ]);
  const currentDraft = useRef(draftKey);
  currentDraft.current = draftKey;
  useEffect(() => {
    setQuote(undefined);
    setError("");
    attempt.current = undefined;
  }, [draftKey]);
  useEffect(() => {
    if (!open || checkoutMode === "disabled") return;
    let stop = () => {},
      active = true;
    ensureCustomerSession()
      .then((uid) => {
        if (active)
          stop = watchOrders(
            uid,
            false,
            (orders) => setOrderIds(orders.map((o) => o.id)),
            (e) => setError(e.message),
          );
      })
      .catch((e) => setError(e.message));
    return () => {
      active = false;
      stop();
    };
  }, [open]);
  async function preview() {
    if (!job || blockedReason) return;
    const revision = draftKey;
    setBusy(true);
    setError("");
    try {
      const q = await callCheckout<PublicQuote>("previewQuote", {
        job: { ...job, quantity },
        fulfilment,
      });
      if (revision === currentDraft.current) setQuote(q);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function submit(details: CheckoutDetails) {
    if (!job || !modelFile || blockedReason)
      return;
    const submittingDraft = draftKey;
    const payload = {
        job: { ...job, quantity },
        fulfilment,
        modelRevision,
        ...(customization ? { customization } : {}),
        ...details,
      },
      key = JSON.stringify(payload);
    if (attempt.current?.key !== key)
      attempt.current = { key, id: crypto.randomUUID() };
    const requestId = attempt.current.id;
    setBusy(true);
    setError("");
    try {
      const modelPath = await uploadModel(modelFile, requestId);
      if (submittingDraft !== currentDraft.current)
        throw new Error(
          "Your draft changed during upload. Review it and submit again.",
        );
      await callCheckout("requestQuote", {
        ...payload,
        requestId,
        modelPath,
      });
      if (submittingDraft === currentDraft.current) {
        attempt.current = undefined;
        setQuote(undefined);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="checkout">
      <button
        className="checkout-toggle"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        {open ? "Close checkout" : "Get print quote / My orders"}
      </button>
      {open && (
        <aside aria-label="Print checkout" className="checkout-drawer">
          <h2 className="text-xl font-bold">Print in Singapore</h2>
          <p className="text-sm text-slate-500">
            Bambu Lab A1 Combo · PLA · SGD
          </p>
          {checkoutMode === "emulator" && (
            <p className="demo-banner">
              Local demo · no real payments or delivery
            </p>
          )}
          {checkoutMode === "disabled" ? (
            <p>Checkout is disabled until the owner configures the service.</p>
          ) : (
            <>
              <fieldset disabled={busy} className="space-y-3">
                <label>
                  Quantity
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                  />
                </label>
                <label>
                  Fulfilment
                  <select
                    value={fulfilment}
                    onChange={(e) =>
                      setFulfilment(e.target.value as Fulfilment)
                    }
                  >
                    <option value="collection">Free self-collection</option>
                    <option value="delivery">Delivery +S$5 per order</option>
                  </select>
                </label>
                {customization && (
                  <p className="text-sm break-all">
                    Quoting {customization.sourceName}:{" "}
                    {Object.values(customization.editedBoundsMm)
                      .map((n) => n.toFixed(2))
                      .join(" × ")}{" "}
                    mm. The edited STL will be uploaded.
                  </p>
                )}
                {blockedReason && <p role="status">{blockedReason}</p>}
                {job && modelFile && !blockedReason ? (
                  <>
                    <p className="text-sm">
                      Preliminary: {(job.hours * quantity).toFixed(2)} hours ·{" "}
                      {(job.grams * quantity).toFixed(1)} g. Owner will confirm
                      full batch time, supports and purge in Bambu Studio.
                    </p>
                    <button
                      disabled={
                        !Number.isInteger(quantity) ||
                        quantity < 1
                      }
                      onClick={preview}
                    >
                      Estimate price
                    </button>
                  </>
                ) : (
                  <p>Load and select an STL to request a quote.</p>
                )}
                {quote && !blockedReason && (
                  <>
                    <p className="text-xl font-semibold">
                      Estimated total {sgd(quote.totalCents)}
                    </p>
                    <p className="text-sm">
                      Print {sgd(quote.printCents)} +{" "}
                      {fulfilment === "delivery" ? "delivery" : "collection"}{" "}
                      {sgd(quote.fulfilmentCents)}. Confirmed price may change
                      after slicing.
                    </p>
                    {quote.warnings.map((w) => (
                      <p key={w}>{w}</p>
                    ))}
                    <CheckoutForm
                      delivery={fulfilment === "delivery"}
                      busy={busy}
                      onSubmit={submit}
                    />
                  </>
                )}
              </fieldset>
              {error && (
                <p role="alert" className="text-red-700">
                  {error}
                </p>
              )}
              <h3 className="font-bold">My orders</h3>
              <p className="text-xs text-slate-500">
                Orders are tied to this browser's anonymous sign-in. Keep your
                order reference; contact the owner if you clear browser data or
                change devices.
              </p>
              {orderIds.map((id) => (
                <OrderStatus key={id} orderId={id} />
              ))}
            </>
          )}
          <a className="text-sm underline" href="/owner">
            Owner sign-in
          </a>
        </aside>
      )}
    </div>
  );
}
