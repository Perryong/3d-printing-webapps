import React, { useState, useEffect } from "react";
import type { Order } from "../../../shared/orders";
import { callCheckout } from "../../services/checkoutService";
function Photo({
  orderId,
  path,
  name,
}: {
  orderId: string;
  path: string;
  name: string;
}) {
  const [url, setUrl] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    callCheckout<{ base64: string; contentType: string }>("readReference", {
      orderId,
      path,
    })
      .then((d) => {
        if (active) setUrl(`data:${d.contentType};base64,${d.base64}`);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [orderId, path]);
  return (
    <figure>
      {url ? (
        <a href={url} download={name}>
          <img
            src={url}
            alt={name}
            className="max-h-48 w-full object-contain"
          />
        </a>
      ) : (
        <p>{error || "Loading reference…"}</p>
      )}
      <figcaption className="text-xs break-all">{name}</figcaption>
    </figure>
  );
}
export default function OrderReferences({ order }: { order: Order }) {
  const [open, setOpen] = useState(false);
  const c = order.customization;
  if (
    !c &&
    !order.references?.length &&
    !order.referenceNotes &&
    !order.referenceMeasurement
  )
    return null;
  const dims = (v: NonNullable<Order["customization"]>["editedBoundsMm"]) =>
    [v.x, v.y, v.z].map((n) => n.toFixed(2)).join(" × ");
  return (
    <details className="my-3" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="cursor-pointer font-semibold">
        Model & photo references
      </summary>
      {c && (
        <>
          <p className="break-all">Source: {c.sourceName}</p>
          <p>
            Original: {dims(c.originalBoundsMm)} mm · Edited:{" "}
            {dims(c.editedBoundsMm)} mm
          </p>
          <p className="text-sm">
            Customer model dimensions. Owner slicing and fit checks determine
            the confirmed quote.
          </p>
        </>
      )}
      {order.referenceNotes && (
        <p className="whitespace-pre-wrap break-words">
          {order.referenceNotes}
        </p>
      )}
      {order.referenceMeasurement && (
        <p>
          {order.referenceMeasurement.label}:{" "}
          {order.referenceMeasurement.valueMm} mm (customer reference)
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        {open &&
          order.references?.map((a) => (
            <Photo
              key={a.path}
              orderId={order.id}
              path={a.path}
              name={a.originalName}
            />
          ))}
      </div>
    </details>
  );
}
