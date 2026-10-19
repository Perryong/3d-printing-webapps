import { test } from "node:test";
import assert from "node:assert/strict";
import {
  referenceContextSchema,
  referenceAssetSchema,
} from "../shared/references";
test("reference metadata is bounded and rejects invalid measurements and assets", () => {
  assert.ok(
    referenceContextSchema.safeParse({
      referenceNotes: "Fit reference",
      referenceMeasurement: { label: "width", valueMm: 20 },
    }).success,
  );
  for (const value of [0, -1, Infinity, NaN])
    assert.equal(
      referenceContextSchema.safeParse({
        referenceMeasurement: { label: "width", valueMm: value },
      }).success,
      false,
    );
  assert.equal(
    referenceContextSchema.safeParse({ referenceNotes: "x".repeat(1001) })
      .success,
    false,
  );
  const asset = {
    path: "references/alice/request/file.png",
    originalName: "ref.png",
    bytes: 100,
    contentType: "image/png",
  };
  assert.ok(referenceAssetSchema.safeParse(asset).success);
  assert.equal(
    referenceAssetSchema.safeParse({ ...asset, bytes: 6 * 1024 * 1024 })
      .success,
    false,
  );
  assert.equal(
    referenceAssetSchema.safeParse({ ...asset, contentType: "image/svg+xml" })
      .success,
    false,
  );
  assert.equal(
    referenceContextSchema.safeParse({
      references: [asset, asset, asset, asset],
    }).success,
    false,
  );
});
