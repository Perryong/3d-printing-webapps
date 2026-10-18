# Singapore Print Pricing and PayNow Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the STL viewer with cost-aware SGD quotes, collection/S$5 delivery, persistent orders and manually verified PayNow payments.

**Architecture:** Share pure calculation and validation code between tests and Firebase callable functions. React consumes customer-safe quotes; authenticated owner screens separately retrieve private costs. Build against local emulators first, with production checkout disabled until explicitly configured and deployed.

**Tech Stack:** Existing React 18, TypeScript, Vite, Three.js, shadcn/ui, Zod and Firebase SDK; add Firebase Admin/Functions for the backend, Firebase CLI/rules test utilities for emulator tests, and Playwright for repeatable checkout tests. Retain Node's test runner and esbuild for pure tests. Resolve compatible maintained dependency versions and record lockfiles at implementation time.

**Spec:** [Approved specification](../specs/2026-10-18-singapore-print-pricing-checkout-design.md), committed as `31cd02f`.

## Global Constraints

- Preserve the enlarged STL viewer and collapsed controls. STEP/CAD is deferred.
- Currency SGD; free self-collection or S$5 delivery per order.
- Electricity S$0.3116/kWh, including GST, valid 1 Oct–31 Dec 2026; never silently update it.
- Provisional average power 150 W; PLA S$25/kg; printer S$700; recovery life 3,000 hours; maintenance S$0.20/hour.
- Labour S$15/hour, 15 minutes/order; packaging S$1/order; production-cost reprint reserve 10%.
- Target margin 40%; minimum print charge S$10/order; provisional courier expense S$5/delivery order.
- All business costs except the dated electricity tariff are editable assumptions, not verified actual costs.
- Confirmed sliced totals include supports/purge and the entire batch; do not multiply or add them twice.
- Integer cents at monetary boundaries; explicit half-up rounding; server-authoritative prices and transitions.
- Owner confirms sliced totals before customer acceptance and payment; customer claims never imply Paid.
- Bank-issued QR only. No invented bank details, automatic transfers, notifications or courier bookings.
- No live payments until owner identity, payment details, collection instructions and non-GST tax status are configured. GST-registered businesses remain blocked in this release.
- No production deployment, paid cloud-service activation or modification of existing cloud rules during implementation.

## Review Focus

1. Quantity changes after slice confirmation must invalidate the quote rather than double a batch total (tasks 1, 4).
2. Duplicate clicks/retries or an old browser tab must not create duplicate orders or accept stale prices (tasks 4, 6).
3. A changed/removed model or changed settings must not retain the previous model's quote (tasks 2, 6).
4. Knowing another order ID or manipulating a request must not expose costs or permit payment confirmation (tasks 3, 5).
5. A payment rejection, paid cancellation or courier expense above S$5 must not report misleading profit or refund success (tasks 5, 7).

## File and interface map

- `shared/pricing.ts`: pricing input/result schemas, defaults, pure calculation; no React/Firebase imports.
- `shared/orders.ts`: public/private order types, quote versions, transition validation and checkout schemas.
- `src/utils/printEstimator.ts`, `src/utils/gcodeAnalyzer.ts`: clearly preliminary estimates and provenance.
- `functions/src/index.ts`: callable exports; `pricingService.ts`, `orderService.ts`, `paymentService.ts`, `ownerService.ts`: focused server operations.
- `functions/package.json`, `functions/tsconfig.json`, `functions/build.mjs`: Node 22 backend package; bundle shared code into its deployment output.
- `firebase.json`, `firestore.rules`, `storage.rules`, `firestore.indexes.json`: emulator configuration and access policies.
- `src/lib/firebase.ts`, `src/services/checkoutService.ts`: environment-aware Firebase clients and typed callable wrappers.
- `src/components/checkout/QuotePanel.tsx`, `CheckoutForm.tsx`, `PaymentInstructions.tsx`, `OrderStatus.tsx`: customer flow.
- `src/components/owner/OwnerSettings.tsx`, `OwnerOrders.tsx`: protected settings and order management.
- `src/pages/Owner.tsx`, `src/App.tsx`: owner route and sign-in.
- Existing `STLViewer.tsx`, `PrintTimeDisplay.tsx`, `PricingDisplay.tsx`, `services/PricingCalculator.tsx`: wire the shared quote flow and remove obsolete price formulas.
- `tests/pricing.test.ts`, `estimates.test.ts`, `orders.test.ts`: pure regression cases.
- `tests/emulator/*.test.ts`: real rules/callable integration tests; `tests/checkout.spec.ts`: browser workflows.
- `scripts/test.mjs`: discover requested unit-test files; `scripts/seed-emulators.mjs`: synthetic owner/settings only.
- `.env.example`, `.gitignore`, `README.md`: local setup and explicit production gates.

**Core contracts:**

`PricingSettings`: `{version, tariffPerKwh, tariffValidUntil, averageWatts, filamentPerKg, printerCost, recoveryHours, maintenancePerHour, labourPerHour, handlingMinutes, packagingCost, reserveRate, marginRate, minimumPrintCharge, deliveryCharge, courierCost}`. Currency-valued settings are decimal SGD; rates are fractions; persisted invoice amounts are integer cents. Dates use ISO strings; money inputs accept decimal strings and validate before conversion.

`JobTotals`: `{source: 'preliminary'|'bambu-studio-confirmed', hours, grams, quantity, scope: 'per-item'|'batch', measuredKwh?: number}`. Confirmed totals require batch scope; all consumed material is included in grams. If scope is per-item, hours, grams and any measuredKwh are each multiplied by quantity exactly once before costing. `calculateQuote(job: JobTotals, settings: PricingSettings, fulfilment: 'collection'|'delivery'): PrivateQuote` returns cost lines, rounding adjustment, print price, fulfilment charge, total, cost, profit (all in cents), settings version and provenance. `publicQuote(privateQuote): PublicQuote` explicitly allowlists customer fields; never spreads private records.

`Order`: public customer-owned record with `id, customerUid, modelRevision, quantity, material, fulfilment, contact, deliveryAddress?, quoteVersion, quoteState, paymentState, fulfilmentState, refundState, acceptedQuote?, timestamps`. `PrivateOrder`: same ID, cost/settings snapshots, actual costs and verification audit. Quote, payment and fulfilment states are those in the spec. `refundState: 'none'|'required'|'recorded'` reflects manually recorded refunds only.

Callables require Firebase Auth; owner operations also require server-set `owner: true` claim. All mutation payloads carry `requestId`; quote/payment operations carry `expectedQuoteVersion`. Public functions return safe records or IDs, never private costs. Errors use stable Firebase codes with actionable UI copy.

## Execution preparation

- [ ] Read the spec and repository instructions; inspect status. The working tree already contains the approved viewer changes and tests, beyond committed HEAD. Preserve these when preparing isolation; do not start from HEAD alone or stash/reset user work. Follow using-git-worktrees at execution time.
- [ ] Run `npm test`, `npm run build`, `npx tsc --noEmit -p tsconfig.app.json` and `npm run lint`; record the baseline (previously 14 unrelated lint errors/11 warnings). Do not repair unrelated files.
- [ ] Verify Node 22 availability and Firebase emulator Java prerequisites before emulator work. Add pinned dev tooling only when its task needs it; keep all tests pointed at a `demo-` project.

### Task 1: One cost and margin engine

**Files:** Create `shared/pricing.ts`, `tests/pricing.test.ts`; modify `scripts/test.mjs`, root TypeScript configuration as needed.
**Consumes:** Spec formulas/defaults. **Produces:** `PricingSettings`, `JobTotals`, `PrivateQuote`, `PublicQuote`, `calculateQuote`, `publicQuote` and validated `DEFAULT_PRICING_SETTINGS`.

- [ ] Write failing tests with hand-calculated expectations:
  ```ts
  // Fixture overrides: no electricity/machine/labour/packaging/reserve;
  // filament S$20/kg, 600g batch, margin .4, minimum S$10.
  assert.equal(calculateQuote(job600g, settings, 'collection').totalCents, 2000);
  assert.equal(calculateQuote(job600g, settings, 'delivery').totalCents, 2500);
  assert.equal(calculateQuote(job600g, settings, 'delivery').profitCents, 800);
  ```
  Add minimum-charge, S$7 courier/profit S$6, half-cent rounding, measured-kWh replacing estimated energy, batch quantity not multiplied, per-item quantity multiplied once, no duplicate purge, expired-tariff warning, NaN/negative values and margin ≥1 rejection cases. Assert public results have no cost/settings/profit fields.
- [ ] Extend the existing runner to accept test paths (`npm test -- tests/pricing.test.ts`) and discover all unit `*.test.ts` files when no path is passed, excluding emulator tests. Run the new test; verify failure is missing pricing behaviour, not a test-loader error.
- [ ] Implement calculation using fixed-point decimal arithmetic for financial operations (integer scaled values/BigInt with explicit decimal parsing and half-up division). Keep intermediate precision; return a rounding adjustment so rounded lines sum to rounded cost. Apply minimum once per order, delivery once, and reserve only to production costs.
- [ ] Run `npm test`; confirm pricing and viewer tests pass. Commit only task files: `feat: add shared SGD job pricing engine`.

### Task 2: Honest estimates and reliable quote inputs

**Files:** Modify `src/utils/printEstimator.ts`, `gcodeAnalyzer.ts`, `PrintTimeDisplay.tsx`; create `tests/estimates.test.ts`.
**Consumes:** `JobTotals`. **Produces:** `toPreliminaryJob(estimate: PrintEstimate, quantity: number): JobTotals`; estimate metadata `{source, requiresConfirmation: true, warnings: string[]}`.

- [ ] Write tests for geometry with no cached bounds, empty/degenerate geometry, positive layer/nozzle/speed validation and a layer-path example: infill area 100mm² / extrusion width .5mm / speed 100mm/s = 2 seconds. Assert unsupported G-code cannot be labelled confirmed, and displayed material is the estimator's filament grams rather than solid-model volume × density.
- [ ] Run `npm test -- tests/estimates.test.ts`; confirm expected failures.
- [ ] Re-read bounds after computing them; calculate approximate infill path length before dividing by speed. Retain explicit warnings about bounding-box approximation, supports and purge. Make G-code analysis preliminary, requiring manual Bambu totals for confirmation; do not expand this task into a full slicer/parser rewrite. Use one conversion to `JobTotals` and invalidate it on model/settings changes.
- [ ] Run all unit tests and TypeScript. Commit: `fix: distinguish preliminary print estimates from confirmed totals`.

### Task 3: Isolated persistence and authorization

**Files:** Create Firebase/backend config files, `shared/orders.ts`, `functions/src/index.ts`, `src/services/checkoutService.ts`, emulator test/seed scripts; modify `src/lib/firebase.ts`, `.env.example`, `.gitignore`, package manifests.
**Consumes:** Task 1 types. **Produces:** Auth/Firestore/Storage/Functions clients; customer session via `ensureCustomerSession(): Promise<string>`; owner sign-in/out; protected schemas and emulator commands.

- [ ] Write emulator rules tests: customer A cannot read B's order; no customer can read private orders/settings or write owner claims, prices, statuses; no unauthenticated private reads; owner access requires a server-issued claim. Deny direct client order mutations; allow only server callables. Storage permits bounded STL upload under authenticated customer paths, owner access to order models, owner-only QR uploads and access to configured public QR assets.
- [ ] Add scripts `test:emulator` (Firebase emulators:exec for auth/firestore/functions/storage), `dev:emulator` and `seed:emulator`. Seed a synthetic owner only when all emulator host variables exist. Run tests against `demo-print-checkout`; verify denials fail until rules are implemented.
- [ ] Implement configuration using `VITE_CHECKOUT_MODE=disabled|emulator|live` (default disabled). Emulator mode never falls back to a production endpoint. Keep the existing Storage configuration unchanged for legacy flows; the new order upload requires deliberate customer submission. Bundle shared modules into Node 22 Functions output; keep browser code free of Admin SDK.
- [ ] Enforce STL extension, binary/text content checks, a documented 50MiB limit and owned storage paths before order association; owner QR accepts PNG/JPEG up to 2MiB. Deny broad public listing. Add tests for oversized/non-STL and cross-customer path association.
- [ ] Run emulator rules tests and backend build; verify no production requests. Commit: `feat: add emulator-backed protected order storage`.

### Task 4: Quote request, review and acceptance

**Files:** Create `functions/src/pricingService.ts`, `orderService.ts`, `tests/orders.test.ts`, `tests/emulator/orders.test.ts`; extend `shared/orders.ts`, callable exports/client wrappers.
**Produces callables:** `previewQuote({job,fulfilment}) → PublicQuote`; `requestQuote({requestId,modelPath,modelRevision,job,contact,fulfilment,deliveryAddress?}) → {orderId}`; owner-only `confirmQuote({requestId,orderId,expectedQuoteVersion,job,buildBoundsMm:{x:number,y:number,z:number}}) → PublicQuote`; `acceptQuote({requestId,orderId,expectedQuoteVersion}) → Order`.

- [ ] Test these outcomes:
  ```ts
  assert.equal(secondRequest.orderId, firstRequest.orderId); // identical requestId
  assert.equal(confirmed.paymentState, 'not_requested');
  assert.equal(accepted.paymentState, 'awaiting_payment');
  ```
  Also assert stale version rejection, different payload with reused key rejection, server ignoring/rejecting client totals, owner confirmation requiring batch totals, changed quantity/model invalidating acceptance, preserved historical settings and incomplete setup blocking payment, and a confirmed build extent of 257mm rejected against the A1's 256mm limit.
- [ ] Run unit/emulator tests to observe the absent behaviour.
- [ ] Use Firestore transactions for idempotency, quote version checks and transitions. Store private calculation inputs/snapshot in a separate document; customer documents contain only public amounts. `previewQuote` remains preliminary and cannot enable payment. Validate metadata and owned model path; owner must inspect/slice and provide the occupied plate bounds before `confirmQuote`; validate each positive bound is at most 256mm. Generate nonsequential references and make repeated identical requests return the original result.
- [ ] Run all unit and emulator tests. Commit: `feat: persist versioned print quotes and customer acceptance`.

### Task 5: Payment claims, verification and fulfilment

**Files:** Create `functions/src/paymentService.ts`, `tests/emulator/payments.test.ts`; extend order service/types/client wrappers.
**Produces callables:** `claimPayment({requestId,orderId,expectedQuoteVersion,transferReference?})`; owner-only `verifyPayment({requestId,orderId,expectedQuoteVersion,decision:'approve'|'reject',bankReference?,reason?})`; `advanceFulfilment({requestId,orderId,nextState})`; `cancelOrder({requestId,orderId,reason})`; owner-only `recordRefund({requestId,orderId,reference})`.

- [ ] Write tests proving a customer claim sets `verification_pending`, never `paid`; only owner approval sets `paid` and audit fields; rejection returns to `awaiting_payment`; printing requires paid; collection/dispatched transitions match fulfilment choice. Add concurrent verification, duplicate bank-reference use, pending verification during quote revision and paid-cancellation/refund-required tests.
- [ ] Run emulator tests and confirm each new behaviour fails.
- [ ] Implement atomic verification with audit `{ownerUid,verifiedAt,bankReference,amountCents,quoteVersion}` and unique reference registry within the configured receiving account. Reject duplicate reference reuse across orders. Freeze quote revisions once payment is claimed/paid; resolve claim before cancellation/revision. Customer cancellation is allowed only before printing; paid cancellation records refund required, never refunded automatically.
- [ ] Run unit/emulator tests. Commit: `feat: add manual PayNow verification and fulfilment states`.

### Task 6: Customer quote and checkout UI

**Files:** Create four checkout components from the file map and `tests/checkout.spec.ts`, `playwright.config.ts`; modify `STLViewer.tsx`, `PrintTimeDisplay.tsx`, `PricingDisplay.tsx`, `services/PricingCalculator.tsx`, client service and root scripts.
**Consumes:** Public quote/order types and customer callables. **Produces:** `QuotePanel({job,modelFile,modelRevision})`, `CheckoutForm({quote,onSubmit})`, `PaymentInstructions({order,paymentConfig})`, `OrderStatus({orderId})`. `paymentConfig` contains only active recipient name/identifier and QR asset URL plus instructions, never cost settings.

- [ ] Add browser tests (synthetic STL/emulator only): open quote with controls still collapsed; quantity changes clear the old quote; collection has no delivery address; delivery adds exactly 500 cents; six-digit Singapore postal code/address required; failed save retains inputs; retry creates one order; “I've paid” yields Awaiting verification; refreshed page recovers the order for its authenticated UID. Assert costs/margins absent from customer DOM and API payloads.
- [ ] Add `test:e2e` and run these tests against seeded emulators to verify failures before UI implementation.
- [ ] Build the four components using existing UI primitives. Replace both existing independent price formulas with the public quote workflow, retaining compatible callers. Keep owner assumptions out of browser payloads. Display currency with SGD formatting and provenance copy. Handle missing setup with explicit disabled payment UI; static QR copy says to enter the amount/reference in the bank app. Render copyable PayNow identifier, amount and reference; do not generate a fake payment QR.
- [ ] Persist order reference/session through Auth and Firestore, not localStorage PII. Show clear recovery guidance if the anonymous session is lost. Confirm payment setup from the server before showing a payment request. Retain model state and dimensions when opening/closing checkout.
- [ ] Run `npm run test:e2e` plus all unit tests; verify narrow and desktop layouts. Commit: `feat: add customer quote delivery and PayNow checkout`.

### Task 7: Owner setup, review and actual profitability

**Files:** Create owner components/route, `functions/src/ownerService.ts`, `tests/emulator/owner.test.ts`; extend browser tests, route configuration and client service.
**Produces callables:** owner-only `saveSettings({requestId,expectedVersion,settings,businessConfig})`, `getPrivateOrder({orderId})`, `recordActualCosts({requestId,orderId,job,handlingMinutes,reprintsCostCents,courierCostCents})`; customer-safe `getPaymentConfig()`.

- [ ] Test defaults exactly match the spec; expired tariffs warn; unknown/GST-registered status or missing recipient/collection instructions prevent live activation; settings changes leave accepted quotes unchanged. Verify actual courier cost S$7 reduces an S$8 estimate to S$6 with all other costs equal. Assert a customer cannot call any owner operation or read its result.
- [ ] Run tests to observe expected failures.
- [ ] Implement owner sign-in and server-protected screens with editable costs, source labels, bank-issued QR upload, recipient-match confirmation and collection details. Require non-GST declaration for live activation. Provide quote confirmation with explicit batch totals and quantity, payment approval/rejection and allowed fulfilment actions. No visible owner control is a substitute for server authorization.
- [ ] Store actual cost totals separately from estimates. Replace estimated production/labour/courier values with actual values when reporting actual profit; use recorded reprint expense instead of adding the original reserve again. Mark incomplete actual records as partial, not final profit. Freeze the relevant settings snapshot for comparisons.
- [ ] Test owner/customer isolation, actual-cost calculations and the full UI flow. Commit: `feat: add owner configuration order review and profit tracking`.

### Task 8: End-to-end validation and operational handoff

**Files:** Update `README.md`, `.env.example`, integration/browser tests; no production deployment.
**Consumes:** All preceding features. **Produces:** Repeatable local demo, verified acceptance results and explicit live-setup checklist.

- [ ] Add final regression scenarios: two customers ordering concurrently; duplicate submit/claim; stale accepted quote; rejected payment then valid retry; paid cancellation requiring manual refund; model swap and rotated viewer with checkout open. Demonstrate server rejection of a forged price/paid status using the emulator API.
- [ ] Run `npm test`, `npm run test:emulator`, `npm run test:e2e`, `npm run build`, `npm --prefix functions run build`, `npx tsc --noEmit -p tsconfig.app.json`, `npm run lint` and `git diff --check`. Expect all new feature checks green; separately enumerate baseline lint failures and any environment blockers.
- [ ] Inspect desktop/narrow screenshots of quote, delivery, missing-setup and payment-verification states. Use a synthetic QR labelled emulator-only, never a plausible real receiving account. Preserve the user's STL locally; no uploads to the live Storage project during tests.
- [ ] Document exact local commands, synthetic owner credentials location (untracked), rates and assumptions, outstanding bank/collection/tax configuration, real-vs-demo status and deployment steps requiring a separate user request. Explain that automatic bank verification and GST sales are unsupported.
- [ ] Request a focused independent review of pricing, authorization and payment transitions. Fix confirmed important findings and rerun affected checks. Commit only task files: `test: verify Singapore print checkout and document setup`.

## Plan self-review

- Spec coverage: cost assumptions/calculation → task 1; estimator honesty → task 2; persistence/security → task 3; quote lifecycle → task 4; payment/cancellation → task 5; customer UX → task 6; owner setup/actual profit → task 7; validation/handoff → task 8.
- All five Review Focus conditions have named tests in their owning tasks.
- Public/private interfaces are explicitly separated; confirmed batch totals and quote versions are consistent across tasks.
- Unknown real bank details, owner identity and cloud enablement are configuration gates, not invented implementation inputs.
- This is one dependent implementation plan: later checkout work relies on the shared pricing and protected order contracts. Each task has its own testable deliverable and commit.

## Execution choice

Recommended: **Native execution** in this chat, task-by-task, with one independent
whole-change review. The eight tasks share tightly coupled quote/state contracts;
keeping one implementer reduces integration overhead. Subagent-driven execution is
also available for fresh implementation/review contexts per task, at greater cost.
Do not implement until the user reviews this plan and chooses the execution method.
