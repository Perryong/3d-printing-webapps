import { test } from "node:test";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";
import { readFileSync } from "node:fs";
test("customer isolation and owner claim; direct writes forbidden", async () => {
  const e = await initializeTestEnvironment({
    projectId: "demo-print-checkout",
    firestore: {
      host: "127.0.0.1",
      port: 8088,
      rules: readFileSync("firestore.rules", "utf8"),
    },
    storage: {
      host: "127.0.0.1",
      port: 9199,
      rules: readFileSync("storage.rules", "utf8"),
    },
  });
  try {
    await e.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), "orders/a"), { customerUid: "alice" });
      await setDoc(doc(c.firestore(), "privateOrders/a"), { cost: 100 });
    });
    const a = e.authenticatedContext("alice"),
      b = e.authenticatedContext("bob"),
      o = e.authenticatedContext("owner", { owner: true });
    await assertSucceeds(getDoc(doc(a.firestore(), "orders/a")));
    await assertFails(getDoc(doc(b.firestore(), "orders/a")));
    await assertFails(getDoc(doc(a.firestore(), "privateOrders/a")));
    await assertSucceeds(getDoc(doc(o.firestore(), "privateOrders/a")));
    await assertFails(setDoc(doc(a.firestore(), "orders/a"), { paid: true }));
    await assertFails(setDoc(doc(o.firestore(), "orders/a"), { paid: true }));
    await assertFails(
      getDoc(doc(e.unauthenticatedContext().firestore(), "privateOrders/a")),
    );
    await assertSucceeds(
      uploadBytes(
        ref(a.storage(), "models/alice/sample.stl"),
        new Uint8Array(84),
        { contentType: "application/octet-stream" },
      ),
    );
    await assertFails(
      uploadBytes(
        ref(b.storage(), "models/alice/hijack.stl"),
        new Uint8Array(84),
      ),
    );
    await assertFails(
      uploadBytes(
        ref(a.storage(), "models/alice/wrong.exe"),
        new Uint8Array(84),
      ),
    );
  } finally {
    await e.withSecurityRulesDisabled(async c=>{await deleteDoc(doc(c.firestore(),"orders/a"));await deleteDoc(doc(c.firestore(),"privateOrders/a"));});
    await e.cleanup();
  }
});
