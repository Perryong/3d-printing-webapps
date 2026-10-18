import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { checkoutAuth, checkoutMode } from "../lib/firebase";
import OwnerSettings from "../components/owner/OwnerSettings";
import OwnerOrders from "../components/owner/OwnerOrders";
import "../components/checkout/checkout.css";
export default function Owner() {
  const [owner, setOwner] = useState(false),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!checkoutAuth) return;
    return onAuthStateChanged(checkoutAuth, async (user) => {
      setOwner(false);
      if (user) {
        const token = await user.getIdTokenResult();
        setOwner(token.claims.owner === true);
      }
    });
  }, []);
  return (
    <main className="owner-page">
      <a href="/" className="underline">
        ← Back to viewer
      </a>
      <h1>Print business workspace</h1>
      {checkoutMode === "emulator" && (
        <p className="demo-banner">
          Local emulator · synthetic orders and payment verification only
        </p>
      )}
      {checkoutMode === "disabled" ? (
        <p>Checkout is disabled.</p>
      ) : owner ? (
        <>
          <button onClick={() => signOut(checkoutAuth!)}>Sign out</button>
          <OwnerOrders />
          <OwnerSettings />
        </>
      ) : (
        <section>
          <h2>Owner sign-in</h2>
          <p>A server-issued owner claim is required.</p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                const c = await signInWithEmailAndPassword(
                  checkoutAuth!,
                  email,
                  password,
                );
                if ((await c.user.getIdTokenResult()).claims.owner !== true)
                  setError("This account is not an owner.");
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button disabled={busy}>Sign in</button>
          </form>
        </section>
      )}
      {error && <p role="alert">{error}</p>}
    </main>
  );
}
