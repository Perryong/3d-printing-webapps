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
const admin = adminInit({ projectId: "demo-print-checkout" }, "tests");
const db = adminDb(admin);
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
test("authoritative quotes, owner verification, retries, isolation and refunds", async () => {
  await db
    .doc("config/business")
    .set({ settings: DEFAULT_PRICING_SETTINGS, businessConfig });
  const a = await client("a"),
    b = await client("b"),
    o = await client("o", true);
  try {
    const modelPath = `models/${a.uid}/test.stl`;
    const data = new Uint8Array(134);
    new DataView(data.buffer).setUint32(80, 1, true);
    await uploadBytes(ref(a.s, modelPath), data);
    const job = {
      source: "preliminary",
      hours: 1,
      grams: 30,
      quantity: 2,
      scope: "per-item",
    };
    const request = {
      requestId: randomUUID(),
      modelPath,
      modelRevision: "v1",
      job,
      contact: { name: "Test", email: "a@example.test", phone: "81234567" },
      fulfilment: "delivery",
      deliveryAddress: { line: "Test Street", postal: "123456" },
    };
    const { orderId } = await a.call("requestQuote", request);
    assert.deepEqual(await a.call("requestQuote", request), { orderId });
    await assert.rejects(
      a.call("requestQuote", { ...request, job: { ...job, quantity: 3 } }),
    );
    await assert.rejects(
      b.call("requestQuote", { ...request, requestId: randomUUID() }),
    );
    await assert.rejects(
      a.call("requestQuote", {
        ...request,
        requestId: randomUUID(),
        totalCents: 1,
      }),
    );
    const confirm = {
      requestId: randomUUID(),
      orderId,
      expectedQuoteVersion: 0,
      job: {
        ...job,
        source: "bambu-studio-confirmed",
        scope: "batch",
        hours: 2,
        grams: 60,
      },
      buildBoundsMm: { x: 100, y: 100, z: 20 },
    };
    await assert.rejects(a.call("confirmQuote", confirm));
    await assert.rejects(
      o.call("confirmQuote", {
        ...confirm,
        buildBoundsMm: { x: 257, y: 1, z: 1 },
      }),
    );
    const q = await o.call("confirmQuote", confirm);
    assert.equal(q.fulfilmentCents, 500);
    assert.equal(q.costCents, undefined);
    const action = {
      requestId: randomUUID(),
      orderId,
      expectedQuoteVersion: 1,
    };
    await assert.rejects(
      a.call("acceptQuote", { ...action, expectedQuoteVersion: 0 }),
    );
    await assert.rejects(b.call("acceptQuote", action));
    await db
      .doc("config/business")
      .update({ "businessConfig.taxStatus": "unknown" });
    await assert.rejects(a.call("acceptQuote", action));
    await db
      .doc("config/business")
      .set({ settings: DEFAULT_PRICING_SETTINGS, businessConfig });
    await a.call("acceptQuote", action);
    await a.call("claimPayment", { ...action, requestId: randomUUID() });
    assert.equal(
      (await db.doc("orders/" + orderId).get()).get("paymentState"),
      "verification_pending",
    );
    await assert.rejects(
      o.call("confirmQuote", {
        ...confirm,
        requestId: randomUUID(),
        expectedQuoteVersion: 1,
      }),
    );
    await assert.rejects(
      a.call("verifyPayment", {
        ...action,
        decision: "approve",
        bankReference: "x",
      }),
    );
    await o.call("verifyPayment", {
      ...action,
      requestId: randomUUID(),
      decision: "reject",
      reason: "No matching receipt",
    });
    const claim = { ...action, requestId: randomUUID() };
    await a.call("claimPayment", claim);
    await a.call("claimPayment", claim);
    const approve = {
      ...action,
      requestId: randomUUID(),
      decision: "approve",
      bankReference: "BANK-001",
    };
    await Promise.all([
      o.call("verifyPayment", approve),
      o.call("verifyPayment", approve),
    ]);
    assert.equal(
      (await db.doc("orders/" + orderId).get()).get("paymentState"),
      "paid",
    );
    await a.call("cancelOrder", {
      requestId: randomUUID(),
      orderId,
      reason: "Cancel before printing",
    });
    assert.equal(
      (await db.doc("orders/" + orderId).get()).get("refundState"),
      "required",
    );
    await o.call("recordRefund", {
      requestId: randomUUID(),
      orderId,
      reference: "REFUND-001",
    });
    assert.equal(
      (await db.doc("orders/" + orderId).get()).get("refundState"),
      "recorded",
    );
    await assert.rejects(a.call("getPrivateOrder", { orderId }));
    // A second order cannot reuse an already verified bank receipt.
    const second = await a.call("requestQuote", {
      ...request,
      requestId: randomUUID(),
    });
    const secondId = second.orderId;
    await o.call("confirmQuote", {
      ...confirm,
      orderId: secondId,
      requestId: randomUUID(),
    });
    const secondAction = { orderId: secondId, expectedQuoteVersion: 1 };
    await db
      .doc("config/business")
      .update({
        "businessConfig.paynowIdentifier": "DEMO NEW DISPLAY IDENTIFIER",
      });
    await a.call("acceptQuote", { ...secondAction, requestId: randomUUID() });
    await a.call("claimPayment", { ...secondAction, requestId: randomUUID() });
    await assert.rejects(
      o.call("verifyPayment", {
        ...secondAction,
        requestId: randomUUID(),
        decision: "approve",
        bankReference: "BANK-001",
      }),
    );
    await o.call("verifyPayment", {
      ...secondAction,
      requestId: randomUUID(),
      decision: "approve",
      bankReference: "BANK-002",
    });
    // Settings are private and historical accepted quotes are immutable.
    await assert.rejects(
      a.call("saveSettings", {
        requestId: randomUUID(),
        expectedVersion: 1,
        settings: DEFAULT_PRICING_SETTINGS,
        businessConfig,
      }),
    );
    await assert.rejects(
      o.call("saveSettings", {
        requestId: randomUUID(),
        expectedVersion: 1,
        settings: DEFAULT_PRICING_SETTINGS,
        businessConfig: {
          ...businessConfig,
          taxStatus: "gst-registered",
          liveEnabled: true,
        },
      }),
    );
    const before = (await db.doc("orders/" + secondId).get()).get(
      "acceptedQuote",
    );
    await o.call("saveSettings", {
      requestId: randomUUID(),
      expectedVersion: 1,
      settings: { ...DEFAULT_PRICING_SETTINGS, filamentPerKg: 40 },
      businessConfig,
    });
    assert.deepEqual(
      (await db.doc("orders/" + secondId).get()).get("acceptedQuote"),
      before,
    );
    const actual = {
      requestId: randomUUID(),
      orderId: secondId,
      job: confirm.job,
      handlingMinutes: 15,
      reprintsCostCents: 0,
      courierCostCents: 500,
    };
    const profit5 = await o.call("recordActualCosts", actual);
    const profit7 = await o.call("recordActualCosts", {
      ...actual,
      requestId: randomUUID(),
      courierCostCents: 700,
    });
    assert.equal(
      Number(profit5.profitCents) - Number(profit7.profitCents),
      200,
    );
    assert.equal(profit7.complete, false);
    await assert.rejects(
      o.call("advanceFulfilment", {
        requestId: randomUUID(),
        orderId: secondId,
        nextState: "dispatched",
      }),
    );
    for (const nextState of ["printing", "ready", "dispatched", "completed"])
      await o.call("advanceFulfilment", {
        requestId: randomUUID(),
        orderId: secondId,
        nextState,
      });
    await assert.rejects(
      a.call("cancelOrder", {
        requestId: randomUUID(),
        orderId: secondId,
        reason: "Too late",
      }),
    );
    const final = await o.call("recordActualCosts", {
      ...actual,
      requestId: randomUUID(),
    });
    assert.equal(final.complete, true);
    const badPath = `models/${a.uid}/invalid.stl`;
    await uploadBytes(ref(a.s, badPath), new Uint8Array([1, 2, 3]));
    await assert.rejects(
      a.call("requestQuote", {
        ...request,
        requestId: randomUUID(),
        modelPath: badPath,
      }),
    );
  } finally {
    await Promise.all([a, b, o].map((c) => deleteApp(c.app)));
  }
});
