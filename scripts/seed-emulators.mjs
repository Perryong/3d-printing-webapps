import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
const require = createRequire(
  new URL("../functions/package.json", import.meta.url),
);
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");
for (const key of [
  "FIRESTORE_EMULATOR_HOST",
  "FIREBASE_AUTH_EMULATOR_HOST",
  "FIREBASE_STORAGE_EMULATOR_HOST",
])
  if (!process.env[key]?.match(/^(127\.0\.0\.1|localhost):\d+$/))
    throw Error("Seed requires local emulators: " + key);
initializeApp({ projectId: "demo-print-checkout" });
const email = "owner@example.test",
  password = "Demo-" + randomUUID();
let user;
try {
  user = await getAuth().getUserByEmail(email);
  await getAuth().updateUser(user.uid, { password });
} catch {
  user = await getAuth().createUser({ email, password });
}
await getAuth().setCustomUserClaims(user.uid, { owner: true });
await getFirestore()
  .doc("config/business")
  .set({
    settings: {
      version: 1,
      tariffPerKwh: 0.3116,
      tariffValidUntil: "2026-12-31",
      averageWatts: 150,
      filamentPerKg: 25,
      printerCost: 700,
      recoveryHours: 3000,
      maintenancePerHour: 0.2,
      labourPerHour: 15,
      handlingMinutes: 15,
      packagingCost: 1,
      reserveRate: 0.1,
      marginRate: 0.4,
      minimumPrintCharge: 10,
      deliveryCharge: 5,
      courierCost: 5,
    },
    businessConfig: {
      name: "LOCAL DEMO — no money",
      recipientName: "DEMO ONLY — DO NOT PAY",
      paynowIdentifier: "DEMO-NOT-A-PAYNOW-ACCOUNT",
      qrPath: "",
      recipientConfirmed: true,
      collectionInstructions:
        "Demo collection point. Contact owner for a real address.",
      taxStatus: "non-gst",
      liveEnabled: false,
    },
  });
writeFileSync(".emulator-seed.json", JSON.stringify({ email, password }), {
  mode: 0o600,
});
console.log(
  "Local demo seeded. Synthetic credentials saved to ignored .emulator-seed.json",
);
