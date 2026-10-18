import { useEffect, useState } from "react";
import type { Order } from "../../../shared/orders";
import { assetUrl, sgd } from "../../services/checkoutService";
export default function PaymentInstructions({ order }: { order: Order }) {
  const [qr, setQr] = useState(""),
    [error, setError] = useState("");
  const p = order.paymentConfig;
  useEffect(() => {
    let active = true;
    setQr("");
    setError("");
    if (p?.qrPath)
      assetUrl(p.qrPath)
        .then((u) => {
          if (active) setQr(u);
        })
        .catch(() => {
          if (active)
            setError("QR could not load. Contact the owner before paying.");
        });
    return () => {
      active = false;
    };
  }, [p?.qrPath]);
  if (!p?.ready || !order.acceptedQuote)
    return <p>Payment setup is incomplete. Contact the owner.</p>;
  return (
    <section className="rounded-xl border p-4 space-y-2">
      <h3 className="font-semibold">Scan to pay {p.recipientName}</h3>
      {p.demo && (
        <strong className="block text-amber-800">
          LOCAL DEMO — do not send money
        </strong>
      )}
      <p>
        Recipient: <strong>{p.recipientName}</strong>
      </p>
      {p.paynowIdentifier && (
        <p>
          PayNow ID: <code className="break-all">{p.paynowIdentifier}</code>{" "}
          <button
            type="button"
            onClick={() =>
              navigator.clipboard
                .writeText(p.paynowIdentifier)
                .catch(() =>
                  setError("Copy unavailable; select the identifier manually."),
                )
            }
          >
            Copy ID
          </button>
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      <p>
        Amount: <strong>{sgd(order.acceptedQuote.totalCents)}</strong>{" "}
        <button
          type="button"
          onClick={() =>
            navigator.clipboard
              .writeText((order.acceptedQuote!.totalCents / 100).toFixed(2))
              .catch(() =>
                setError("Copy unavailable; select the amount manually."),
              )
          }
        >
          Copy amount
        </button>
      </p>
      <p>
        Reference: <strong>{order.id}</strong>{" "}
        <button
          type="button"
          onClick={() =>
            navigator.clipboard
              .writeText(order.id)
              .catch(() =>
                setError("Copy unavailable; select the reference manually."),
              )
          }
        >
          Copy reference
        </button>
      </p>
      {qr && (
        <div className="mx-auto w-full max-w-80 rounded-xl border bg-white p-3">
          {p.qrPath === "payment-qr/6426f2b8-5baa-4555-8d50-ecb0ca7d4720.png" ? (
            // Frame only the QR in the owner's original bank screenshot; keep its pixels intact.
            <div className="relative aspect-square overflow-hidden">
              <img
                src={qr}
                alt={`PayNow QR to pay ${p.recipientName}`}
                className="absolute max-w-none"
                style={{ width: "142.857143%", left: "-21.428571%", top: "-65.372671%" }}
              />
            </div>
          ) : (
            <img src={qr} alt={`PayNow QR to pay ${p.recipientName}`} className="w-full" />
          )}
        </div>
      )}
      <ol className="list-decimal space-y-2 pl-5 text-sm">
        <li>Open your banking app and scan this PayNow QR.</li>
        <li>Check the recipient is <strong>{p.recipientName}</strong>. Enter <strong>{sgd(order.acceptedQuote.totalCents)}</strong> and use <strong className="break-all">{order.id}</strong> as the payment reference.</li>
        <li>Complete the transfer in your banking app, then return here and select “I have completed the bank transfer”.</li>
      </ol>
      <p className="text-sm text-slate-600">On the same phone? Take a screenshot of this QR and import it using your banking app’s Scan from gallery option, if supported.</p>
      <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-800">
        {order.paymentState === "verification_pending"
          ? "Waiting for owner verification. We will check the transfer in our bank account. Please do not pay again."
          : "Payment is made in your banking app. The button below only notifies us; your order is marked paid after we verify the money has arrived."}
      </p>
      {order.fulfilment === "collection" && (
        <p>Collection: {p.collectionInstructions}</p>
      )}
    </section>
  );
}
