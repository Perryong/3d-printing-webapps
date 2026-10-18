import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { checkoutDb, checkoutMode } from "../../lib/firebase";
import { callCheckout, uploadQr } from "../../services/checkoutService";
import {
  DEFAULT_PRICING_SETTINGS,
  type PricingSettings,
} from "../../../shared/pricing";
import type { BusinessConfig } from "../../../shared/orders";
const labels: Record<keyof PricingSettings, string> = {
  version: "Version",
  tariffPerKwh: "Electricity (S$/kWh, including GST)",
  tariffValidUntil: "Tariff valid until",
  averageWatts: "Average measured power (W)",
  filamentPerKg: "PLA filament (S$/kg)",
  printerCost: "Printer purchase cost (S$)",
  recoveryHours: "Recovery life (printing hours)",
  maintenancePerHour: "Maintenance (S$/hour)",
  labourPerHour: "Labour (S$/hour)",
  handlingMinutes: "Handling (minutes/order)",
  packagingCost: "Packaging (S$/order)",
  reserveRate: "Reprint reserve (fraction, 0.10 = 10%)",
  marginRate: "Target margin (fraction, 0.40 = 40%)",
  minimumPrintCharge: "Minimum print charge (S$)",
  deliveryCharge: "Customer delivery charge (fixed S$5)",
  courierCost: "Courier expense (S$/order)",
};
const empty: BusinessConfig = {
  name: "",
  recipientName: "",
  paynowIdentifier: "",
  qrPath: "",
  recipientConfirmed: false,
  collectionInstructions: "",
  taxStatus: "unknown",
  liveEnabled: false,
};
export default function OwnerSettings() {
  const [settings, setSettings] = useState<PricingSettings>(
      DEFAULT_PRICING_SETTINGS,
    ),
    [business, setBusiness] = useState<BusinessConfig>(empty),
    [version, setVersion] = useState(0),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    getDoc(doc(checkoutDb!, "config/business"))
      .then((s) => {
        if (s.exists()) {
          setSettings(s.get("settings"));
          setVersion(s.get("settings.version"));
          setBusiness(s.get("businessConfig"));
        }
      })
      .catch((e) => setError(e.message));
  }, []);
  async function save() {
    setBusy(true);
    setError("");
    try {
      const result = await callCheckout<{
        settings: PricingSettings;
        businessConfig: BusinessConfig;
      }>("saveSettings", {
        requestId: crypto.randomUUID(),
        expectedVersion: version,
        settings,
        businessConfig: business,
      });
      setSettings(result.settings);
      setVersion(result.settings.version);
      setMessage("Settings saved. Existing accepted prices are unchanged.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <h2>Cost assumptions & business setup</h2>
      <p className="text-sm mb-4">
        Starter assumptions are editable. 150 W is provisional average
        consumption, not the A1's rated maximum. Measure actual energy and
        record filament/support/purge totals from Bambu Studio. Price = cost ÷
        (1 − margin), subject to the minimum.
      </p>
      <p className="text-sm mb-4">
        Starter electricity rate: S$0.3116/kWh including GST, 1 Oct–31 Dec 2026.
        Replace with your bill rate. Other costs are placeholders.
      </p>
      {new Date().toISOString().slice(0, 10) > settings.tariffValidUntil && (
        <p role="alert">Tariff expired — check the latest bill.</p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <fieldset
          disabled={busy}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {(Object.keys(labels) as Array<keyof PricingSettings>)
            .filter((k) => k !== "version")
            .map((k) => (
              <label key={k}>
                {labels[k]}
                <input
                  required
                  type={k === "tariffValidUntil" ? "date" : "number"}
                  step="any"
                  min={0}
                  readOnly={k === "deliveryCharge"}
                  value={settings[k]}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      [k]:
                        k === "tariffValidUntil"
                          ? e.target.value
                          : Number(e.target.value),
                    })
                  }
                />
              </label>
            ))}
        </fieldset>
        <h3 className="font-semibold">Payment and collection</h3>
        {(
          [
            "name",
            "recipientName",
            "paynowIdentifier",
            "collectionInstructions",
          ] as const
        ).map((k) => (
          <label key={k}>
            {
              {
                name: "Business name",
                recipientName: "Bank recipient name",
                paynowIdentifier: "PayNow mobile / UEN (or supply QR)",
                collectionInstructions: "Collection instructions",
              }[k]
            }
            <input
              value={business[k]}
              onChange={(e) =>
                setBusiness({ ...business, [k]: e.target.value })
              }
            />
          </label>
        ))}
        <label>
          Bank-issued PayNow QR (PNG/JPEG, up to 2 MiB)
          <input
            type="file"
            accept="image/png,image/jpeg"
            disabled={busy}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setBusy(true);
              try {
                const qrPath = await uploadQr(f);
                setBusiness((b) => ({ ...b, qrPath }));
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          />
        </label>
        {business.qrPath && (
          <p>
            QR uploaded: {business.qrPath}{" "}
            <button
              type="button"
              onClick={() => setBusiness({ ...business, qrPath: "" })}
            >
              Remove QR
            </button>
          </p>
        )}
        <label>
          <input
            type="checkbox"
            checked={business.recipientConfirmed}
            onChange={(e) =>
              setBusiness({ ...business, recipientConfirmed: e.target.checked })
            }
          />
          I checked the bank recipient matches this business.
        </label>
        <label>
          GST declaration
          <select
            value={business.taxStatus}
            onChange={(e) =>
              setBusiness({
                ...business,
                taxStatus: e.target.value as BusinessConfig["taxStatus"],
              })
            }
          >
            <option value="unknown">Not declared — payments blocked</option>
            <option value="non-gst">Not GST registered</option>
            <option value="gst-registered">
              GST registered — unsupported in this release
            </option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            disabled={checkoutMode === "emulator"}
            checked={business.liveEnabled}
            onChange={(e) =>
              setBusiness({ ...business, liveEnabled: e.target.checked })
            }
          />
          Enable live checkout after setup (never enabled by the emulator)
        </label>
        <button disabled={busy}>Save settings</button>
      </form>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
