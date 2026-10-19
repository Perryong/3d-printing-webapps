import React from "react";
import type { Order } from "../../../shared/orders";
export default function OrderModelDetails({ order }: { order: Order }) {
  const c = order.customization;
  if (!c) return null;
  const dimensions = (v: typeof c.editedBoundsMm) =>
    [v.x, v.y, v.z].map(n => n.toFixed(2)).join(" × ");
  return <details className="my-3">
    <summary className="cursor-pointer font-semibold">Model dimensions</summary>
    <p className="break-all">Source: {c.sourceName}</p>
    <p>Original: {dimensions(c.originalBoundsMm)} mm · Edited: {dimensions(c.editedBoundsMm)} mm</p>
    <p className="text-sm">Customer model dimensions. Owner slicing and fit checks determine the confirmed quote.</p>
  </details>;
}
