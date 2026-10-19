import { test } from "node:test";
import assert from "node:assert/strict";
import { initializeApp, deleteApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  signInAnonymously,
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  getFunctions,
  connectFunctionsEmulator,
  httpsCallable,
} from "firebase/functions";
import {
  getStorage,
  connectStorageEmulator,
  ref,
  uploadBytes,
} from "firebase/storage";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { DEFAULT_PRICING_SETTINGS } from "../../shared/pricing";
const require = createRequire(process.cwd() + "/functions/package.json");
const { initializeApp: adminInit } = require("firebase-admin/app");
const { getAuth: adminAuth } = require("firebase-admin/auth");
const { getFirestore: adminDb } = require("firebase-admin/firestore");
const admin = adminInit(
  { projectId: "demo-print-checkout" },
  "reference-tests",
);
const db = adminDb(admin);
const sharp = require("sharp");
const { getStorage: adminStorage } = require("firebase-admin/storage");
async function client(name: string, owner = false) {
  const app = initializeApp(
    {
      apiKey: "demo-key",
      projectId: "demo-print-checkout",
      storageBucket: "demo-print-checkout.firebasestorage.app",
    },
    name,
  );
  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  if (owner) {
    const email = randomUUID() + "@example.test",
      password = "test-password";
    const u = await adminAuth(admin).createUser({ email, password });
    await adminAuth(admin).setCustomUserClaims(u.uid, { owner: true });
    await signInWithEmailAndPassword(auth, email, password);
  } else await signInAnonymously(auth);
  const f = getFunctions(app, "asia-southeast1");
  connectFunctionsEmulator(f, "127.0.0.1", 5001);
  const s = getStorage(app);
  connectStorageEmulator(s, "127.0.0.1", 9199);
  return {
    app,
    uid: auth.currentUser!.uid,
    s,
    call: async (name: string, data: unknown) =>
      (await httpsCallable(f, name)(data)).data as Record<string, unknown>,
  };
}
const businessConfig = {
  name: "Demo",
  recipientName: "DEMO DO NOT PAY",
  paynowIdentifier: "DEMO",
  qrPath: "",
  recipientConfirmed: true,
  collectionInstructions: "Demo",
  taxStatus: "non-gst",
  liveEnabled: false,
};

test("private validated photos, immutable retries, context and customer isolation", async () => {
  await db
    .doc("config/business")
    .set({ settings: DEFAULT_PRICING_SETTINGS, businessConfig });
  const a = await client("ref-a"),
    b = await client("ref-b"),
    o = await client("ref-owner", true);
  try {
    const requestId = randomUUID(),
      assetId = randomUUID();
    const bytes = await sharp({
      create: { width: 40, height: 30, channels: 3, background: "#cccccc" },
    })
      .png()
      .toBuffer();
    const payload = {
      requestId,
      assetId,
      originalName: "reference.png",
      base64: bytes.toString("base64"),
    };
    const asset = await a.call("uploadReference", payload);
    assert.deepEqual(await a.call("uploadReference", payload), asset);
    const other = await sharp({
      create: { width: 40, height: 30, channels: 3, background: "#eeeeee" },
    })
      .png()
      .toBuffer();
    await assert.rejects(
      a.call("uploadReference", {
        ...payload,
        base64: other.toString("base64"),
      }),
    );
    await assert.rejects(
      a.call("uploadReference", {
        ...payload,
        assetId: randomUUID(),
        base64: Buffer.from("<svg/>").toString("base64"),
      }),
    );
    const huge = await sharp({
      create: { width: 5000, height: 4001, channels: 3, background: "#eeeeee" },
    })
      .png()
      .toBuffer();
    await assert.rejects(
      a.call("uploadReference", {
        ...payload,
        assetId: randomUUID(),
        base64: huge.toString("base64"),
      }),
    );
    await assert.rejects(
      a.call("uploadReference", {
        ...payload,
        assetId: randomUUID(),
        base64: bytes.subarray(0, 40).toString("base64"),
      }),
    );
    const storage = adminStorage(admin).bucket(
      "demo-print-checkout.firebasestorage.app",
    );
    const [meta] = await storage.file(asset.path as string).getMetadata();
    assert.equal(meta.metadata?.firebaseStorageDownloadTokens, undefined);
    const modelPath = `models/${a.uid}/${requestId}.stl`;
    const data = new Uint8Array(134);
    new DataView(data.buffer).setUint32(80, 1, true);
    await uploadBytes(ref(a.s, modelPath), data);
    const request = {
      requestId,
      modelPath,
      modelRevision: "revision",
      references: [asset],
      referenceNotes: "Demo only",
      referenceMeasurement: { label: "slot", valueMm: 12 },
      customization: {
        sourceName: "source.stl",
        originalBoundsMm: { x: 20, y: 10, z: 5 },
        editedBoundsMm: { x: 40, y: 20, z: 10 },
        scale: { x: 2, y: 2, z: 2 },
        proportionsLocked: true,
      },
      job: {
        source: "preliminary",
        scope: "per-item",
        quantity: 1,
        hours: 1,
        grams: 20,
      },
      contact: {
        name: "Reference demo",
        email: "demo@example.test",
        phone: "81234567",
      },
      fulfilment: "collection",
    };
    await assert.rejects(
      a.call("requestQuote", {
        ...request,
        references: [
          { ...asset, path: (asset.path as string).replace(a.uid, b.uid) },
        ],
      }),
    );
    await assert.rejects(
      a.call("requestQuote", {
        ...request,
        references: [
          { ...asset, path: `references/${a.uid}/${requestId}/../bad.png` },
        ],
      }),
    );
    await assert.rejects(
      a.call("requestQuote", {
        ...request,
        references: [asset, asset, asset, asset],
      }),
    );
    const { orderId } = await a.call("requestQuote", request);
    assert.deepEqual(await a.call("requestQuote", request), { orderId });
    const order = (await db.doc("orders/" + orderId).get()).data()!;
    assert.equal(order.referenceNotes, "Demo only");
    assert.deepEqual(order.customization, request.customization);
    assert.deepEqual(
      (await db.doc("privateOrders/" + orderId).get()).get("customization"),
      request.customization,
    );
    for (const client of [a, o])
      assert.equal(
        (await client.call("readReference", { orderId, path: asset.path }))
          .base64,
        bytes.toString("base64"),
      );
    await assert.rejects(
      b.call("readReference", { orderId, path: asset.path }),
    );
    await assert.rejects(
      a.call("readReference", { orderId, path: "payment-qr/other.png" }),
    );
  } finally {
    await Promise.all([a, b, o].map((c) => deleteApp(c.app)));
  }
});
