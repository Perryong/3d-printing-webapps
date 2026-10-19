import { z } from "zod";
import sharp from "sharp";
import { createHash } from "node:crypto";
import { bucket, callable, guard, db, id } from "./core";
import {
  MAX_PHOTO_BYTES,
  MAX_PHOTO_PIXELS,
  type ReferenceAsset,
} from "../../shared/references";
export async function inspectPhoto(data: Buffer) {
  guard(
    data.length > 0 && data.length <= MAX_PHOTO_BYTES,
    "Photo must be between 1 byte and 5 MiB",
  );
  const image = sharp(data, {
    limitInputPixels: MAX_PHOTO_PIXELS,
    failOn: "warning",
  });
  const meta = await image.metadata();
  guard(
    ["png", "jpeg"].includes(meta.format ?? "") && (meta.pages ?? 1) === 1,
    "Only single-frame JPEG/PNG photos are supported",
  );
  guard(
    meta.width && meta.height && meta.width * meta.height <= MAX_PHOTO_PIXELS,
    "Photo exceeds 20 megapixels",
  );
  // Force decoding: metadata alone would accept corrupt/truncated image bodies.
  await image.stats();
  return meta.format === "png"
    ? ("image/png" as const)
    : ("image/jpeg" as const);
}
export const uploadReference = callable(
  z
    .object({
      requestId: z.string().uuid(),
      assetId: z.string().uuid(),
      originalName: z.string().min(1).max(255),
      base64: z
        .string()
        .min(1)
        .max(Math.ceil(MAX_PHOTO_BYTES / 3) * 4),
    })
    .strict(),
  async (d, r) => {
    const bytes = Buffer.from(d.base64, "base64");
    const contentType = await inspectPhoto(bytes);
    const path = `references/${r.auth!.uid}/${d.requestId}/${d.assetId}.${contentType === "image/png" ? "png" : "jpg"}`;
    const file = bucket().file(path),
      digest = createHash("sha256").update(bytes).digest("hex");
    const [alreadyExists] = await file.exists();
    if (alreadyExists) {
      const [m] = await file.getMetadata();
      guard(
        m.metadata?.sha256 === digest,
        "Photo upload conflicts with an existing request",
      );
      return {
        path,
        originalName: d.originalName,
        bytes: bytes.length,
        contentType,
      };
    }
    try {
      await file.save(bytes, {
        resumable: false,
        preconditionOpts: { ifGenerationMatch: 0 },
        metadata: { contentType, metadata: { sha256: digest } },
      });
    } catch (e) {
      const [exists] = await file.exists();
      if (!exists) throw e;
      const [m] = await file.getMetadata();
      guard(
        m.metadata?.sha256 === digest,
        "Photo upload conflicts with an existing request",
      );
    }
    return {
      path,
      originalName: d.originalName,
      bytes: bytes.length,
      contentType,
    } satisfies ReferenceAsset;
  },
  false,
  { memory: "512MiB", concurrency: 1 },
);
export async function validateReferences(
  uid: string,
  requestId: string,
  assets: ReferenceAsset[],
) {
  guard(
    assets.length <= 3 &&
      new Set(assets.map((a) => a.path)).size === assets.length,
    "Choose up to three distinct references",
  );
  for (const a of assets) {
    const prefix = `references/${uid}/${requestId}/`;
    guard(
      a.path.startsWith(prefix) &&
        /^[a-f0-9-]{36}\.(png|jpg)$/.test(a.path.slice(prefix.length)),
      "Reference must belong to this customer and request",
    );
    const [meta] = await bucket().file(a.path).getMetadata();
    guard(
      Number(meta.size) === a.bytes && a.bytes <= MAX_PHOTO_BYTES,
      "Reference size mismatch",
    );
    const [data] = await bucket().file(a.path).download();
    guard(
      (await inspectPhoto(data)) === a.contentType,
      "Reference type mismatch",
    );
  }
}
export const readReference = callable(
  z.object({ orderId: id, path: z.string().max(300) }).strict(),
  async (d, r) => {
    const snap = await db.doc("orders/" + d.orderId).get();
    guard(
      snap.exists &&
        (snap.get("customerUid") === r.auth!.uid ||
          r.auth!.token.owner === true),
      "Order not found",
    );
    const asset = (snap.get("references") ?? []).find(
      (a: ReferenceAsset) => a.path === d.path,
    ) as ReferenceAsset | undefined;
    guard(asset, "Reference not found");
    const [data] = await bucket().file(asset.path).download();
    guard(data.length <= MAX_PHOTO_BYTES, "Reference exceeds size limit");
    return { base64: data.toString("base64"), contentType: asset.contentType };
  },
);
