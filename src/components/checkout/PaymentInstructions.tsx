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
      <h3 className="font-semibold">PayNow payment</h3>
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
      {qr && (
        <img
          className="w-48"
          src={qr}
          alt="Owner-provided bank-issued PayNow QR"
        />
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
      <p className="text-sm">
        Check the recipient in your bank app. For a static QR, enter the exact
        amount and order reference. The owner checks the bank receipt manually.
      </p>
      {order.fulfilment === "collection" && (
        <p>Collection: {p.collectionInstructions}</p>
      )}
    </section>
  );
}
