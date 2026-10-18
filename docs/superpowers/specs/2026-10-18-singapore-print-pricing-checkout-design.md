# Singapore print pricing and PayNow checkout

Date: 18 October 2026
Status: Written specification for user review; conversational design approved.

## Purpose and approved scope

Extend the existing React/Three.js STL application into a Singapore print quoting
and order application for one Bambu Lab A1 Combo business. Preserve the enlarged
viewer and collapsed model controls. Quotes must account for operating costs,
owner labour and a target margin; profitability is an estimate, not a guarantee.

The user approved editable starter costs, free self-collection or S$5 delivery
per order, and PayNow by recipient identifier or bank-issued QR with manual bank
verification. The first release uses a quote-review step before requesting money.
STEP/CAD inspection, automatic bank reconciliation, courier booking, automatic
slicing and promotional discounts are outside this release.

## Existing application and changes required

The app currently has Firebase Storage, in-memory order state and two inconsistent
pricing components. It has no authenticated owner workflow or persistent order
service. The viewer charges a full-solid PLA weight rather than its displayed
filament estimate. Its electricity formula uses maximum printer wattage for the
whole job. The STL time estimator uses bounding-box geometry, and its infill
area/speed formula is dimensionally incorrect. The G-code parser does not reliably
handle Bambu metadata, modal feed rates or extrusion modes.

Introduce one shared, pure pricing module for all price displays and server-side
quotes. Distinguish preliminary geometry estimates from owner-confirmed Bambu
Studio job totals. Do not label existing G-code calculations as exact. Fix the
bounding-box initialization and dimensional error in the preliminary estimator;
unsupported or malformed input must not silently become a zero-price quote.
The owner can enter Bambu Studio total time and total filament grams directly,
which is the authoritative first-release confirmation path. No slicer installation
or execution is required. Unreliable G-code parsing must fall back to an explicit
request for confirmed totals rather than authorizing payment.

## Editable starter settings

| Setting | Initial value | Meaning |
| --- | --- | --- |
| Currency | SGD | All customer amounts shown as S$ |
| Electricity | S$0.3116/kWh | SP tariff including GST, 1 Oct–31 Dec 2026; override with actual bill rate |
| Average job power | 150 W | Provisional assumption, not manufacturer average consumption |
| PLA filament | S$25/kg | Procurement-cost placeholder |
| Printer purchase cost | S$700 | A1 Combo placeholder; replace with actual purchase cost |
| Recovery life | 3,000 printing hours | Purchase cost divided by productive hours |
| Maintenance | S$0.20/printing hour | Separate from depreciation |
| Labour | S$15/hour | Owner handling labour |
| Handling time | 15 minutes/order | Setup, cleanup and packing; editable per quote |
| Packaging | S$1/order | Charged to costs for either fulfilment method |
| Reprint reserve | 10% | Applied to production costs only |
| Target margin | 40% | Margin on print selling price, not a markup |
| Minimum print charge | S$10/order | Applied before delivery |
| Customer delivery charge | S$5/order | Once per order, not per part |
| Courier cost | S$5/order | Explicit provisional expense, independently editable |
| Collection charge/cost | S$0/S$0 | Packaging and handling still apply |

Settings show their units, source or assumption label, and last-updated date. Warn
when the tariff validity period has expired; never silently fetch or substitute a
new rate. Keep the proposed 40% margin editable, strictly below 100%.

Support material, brim/raft and AMS purge waste must be included in the total grams.
When Bambu Studio already includes these, do not add them again. Preliminary
single-part estimates multiply production time/grams by quantity; confirmed batch
job totals already cover the selected quantity and must not be multiplied again.

The initial material choice is PLA. Additional materials require an owner-entered
cost and compatibility confirmation. Do not reuse the old material multipliers to
change physical weight. A1 build-volume limits are 256 × 256 × 256 mm. The Combo
includes AMS lite; its extra purge material and time need actual sliced totals.

## Pricing contract

For a job with confirmed or preliminary total hours H and total filament grams G:

- Material = G / 1,000 × filament cost per kg.
- Electricity = H × average job watts / 1,000 × tariff. An optional measured
  job-kWh value replaces this calculation, rather than adding to it.
- Depreciation = H × printer purchase cost / recovery hours.
- Maintenance = H × hourly maintenance allowance.
- Production cost = material + electricity + depreciation + maintenance.
- Reprint reserve = production cost × reserve percentage.
- Labour = handling minutes / 60 × labour hourly rate.
- Estimated print cost C = production cost + reserve + labour + packaging.
- Print price = max(minimum order price, C / (1 − target margin)).
- Customer total = print price + selected fulfilment charge.
- Estimated order profit = customer total − C − actual/estimated courier expense.

For example, C = S$12 and margin = 40% produces a S$20 print price. Collection
costs the customer S$20; delivery costs S$25. With S$5 courier expense, estimated
profit is S$8 in either case. A higher courier expense reduces delivery profit.

Keep calculation precision until the final monetary boundary. Convert results to
integer cents using explicit half-up rounding; store money as integer cents.
Displayed cost lines must reconcile with displayed totals through a documented
rounding adjustment if necessary. Validate inputs on client and server: finite,
nonnegative costs, positive recovery hours, positive integer quantity and positive
confirmed time/grams. Reject invalid margins, negative totals and incomplete jobs.

Do not automatically add GST to customer sales because the electricity tariff
includes GST. Business GST status is unconfirmed. Live payment activation requires
an explicit owner declaration of tax status. This first release supports a
non-GST-registered business; if the owner is GST-registered, live checkout stays
disabled pending a separately specified tax workflow. The initial preview does
not claim to issue tax invoices.

## Customer experience

1. Inspect the STL in the current viewer and open Quote & order.
2. Choose quantity and review material, estimate provenance and preliminary price.
3. Choose free self-collection or S$5 delivery. Delivery requires address and postal
   code. Collection displays configured instructions and an appointment requirement.
4. Supply name and contact method, then request a quote. Store an immutable snapshot
   of the submitted settings and inputs with an order reference.
5. Owner checks the model and enters/approves Bambu Studio job totals. Customer sees
   the confirmed amount, configuration and fulfilment. A revised quote requires
   customer acceptance before payment is requested.
6. After acceptance, display recipient name, registered PayNow mobile/UEN, payable
   amount, order reference and the owner's bank-issued QR image. Provide copy buttons
   for identifier, amount and reference. This is one payment method with two ways
   to pay, not two separate payment providers.
7. “I've paid” submits a payment claim and optional transfer reference. It displays
   Awaiting verification, never Paid. Customer status remains available on this
   browser session; cross-device account recovery is outside the first release.

Do not fabricate a QR, recipient or collection address. A static bank-issued QR
may require the customer to enter the displayed amount/reference in their bank app;
the interface must say so. Owner setup confirms the QR matches the displayed
recipient. Missing recipient details, QR or collection instructions are shown as
setup gaps; only configured payment presentations are enabled. No payment request
is available until the owner has completed live setup.

## Owner experience and order state

Protected owner settings contain the cost assumptions, PayNow details/QR, collection
instructions and courier expense. They are never editable by customers. Internal
costs, margin and profitability details are owner-only, not merely hidden with CSS.

Use separate fulfilment and payment states:

- Quote: requested → confirmed → accepted; revision creates a new version.
- Payment: not_requested → awaiting_payment → verification_pending → paid.
  A rejected claim returns to awaiting_payment with an owner explanation.
- Fulfilment: not_started → printing → ready → collected or dispatched → completed.
- Cancellation is supported before production. Paid cancellations require manual
  refund handling and a recorded refund status; never imply an automatic refund.

Only the authenticated owner can mark Paid after checking the bank transaction's
amount, recipient and order reference, or advance production. Record verifier UID,
time and transaction reference. Prevent duplicate claim submissions and accidental
reuse of a payment reference across orders. Record actual grams, machine time,
handling time, reprints and courier cost at completion to compare actual against
estimated profit and improve the assumptions.

## Architecture, persistence and access

Reuse React, shadcn/ui and Firebase rather than introducing a commerce platform.
Add a focused quote panel, checkout, owner order screen and owner configuration.
Keep the 3D scene independent of checkout and payment state.

Use Firebase Authentication (anonymous customer identity and authenticated owner),
Firestore for persistent orders/settings, callable server functions for trusted
price calculation and state transitions, and Storage for order model files and
bank-issued QR assets. Implement an explicit server-controlled owner allowlist or
claim. Customers cannot self-assign the owner role. Store public quote snapshots
separately from private cost breakdowns so document reads cannot expose margins.
Customers can read only their own orders; only the owner can read all orders.
Store customer and delivery information only with the order, not in public paths.

The existing Storage project is not evidence that Firestore, Authentication or
Functions are enabled. Implement and verify the first release using local Firebase
emulators. Production setup must explicitly configure the project, owner identity,
rules and payment details. Do not deploy to the existing project or enable paid
cloud services as an incidental part of this implementation. Local preview is
clearly labelled and cannot accept real payment claims as confirmed funds.

Retryable writes use an idempotency key to avoid duplicate orders. Server validation
owns all amounts and allowed state transitions. Confirmed quote versions preserve
prices when global costs change. Failed saves retain the form and show a retry;
failed payment claims do not advance status. No messages are sent to customers
without a separately authorized notification integration.

## Acceptance and verification

- Unit tests cover the S$12/40% example, minimum charge, collection vs delivery,
  courier-cost profit, batch quantity, support/purge non-duplication, measured-kWh
  override, invalid inputs, rounding and settings-version snapshots.
- Estimator tests cover empty geometry, missing bounds and clearly labelled
  preliminary results; incomplete slicer information cannot produce a confirmed quote.
- Emulator tests verify customer isolation, private costs, owner-only verification,
  server price validation, duplicate requests and prohibited state transitions.
- Browser checks cover the card-holder STL, quote selection, delivery validation,
  disabled unconfigured payments, static QR instructions and awaiting-verification
  status. No test transfers money or contacts customers.
- Reload retains submitted orders and settings; original viewer controls continue
  working with the left panel collapsed.
- Run build, TypeScript, pricing tests and relevant browser/emulator tests. Report
  existing unrelated lint failures separately; do not claim the whole repository
  is lint-clean.

## Source references

- SP tariff, effective 1 Oct–31 Dec 2026:
  https://www.spgroup.com.sg/our-services/utilities/tariff-information
- Bambu A1 specifications (1,300 W is maximum at 220 V):
  https://bambulab.com/pl/a1/tech-specs
- Bambu A1 Combo quick-start and material/AMS guidance:
  https://cdn1.bambulab.com/documentation/quick-start-a75adcb1d5d5e/Quick%20Start%20Guide%20for%20A1%20Combo.pdf
- ABS PayNow identifiers and QR:
  https://www.abs.org.sg/e-payments/pay-now

The 150 W average and all business cost defaults other than the dated tariff are
starter assumptions. They must not be presented as verified manufacturer values
or as the user's actual costs.
