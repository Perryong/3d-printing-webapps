# Model Customization Implementation Plan

> Scope update: photo references, photo notes/measurements, image upload/read Functions and their dependency have been removed at the user's request. The historical plan below describes the earlier scope; the active release is STL dimension editing, binary export and quote integration only. Existing order/storage records are not deleted.


> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add photo references, editable overall STL dimensions and regenerated STL export tied to the existing quote flow, with an explicit boundary for G-code and photo-only inputs.

**Architecture:** Reuse the React/Three.js viewer, immutable geometry snapshots and existing Firebase callable quote lifecycle. Keep photo drafts local until submission, then persist protected reference assets alongside the generated model. Deliver release 1 first; stage 2 is a separate CAD-generation subsystem, outlined below but not authorized by this document's existence.

**Tech Stack:** Existing React, TypeScript, Three.js STLLoader/STLExporter, Web Crypto, Firebase Storage/Firestore/Functions. A maintained server image decoder is needed to validate dimensions and signatures; evaluate sharp against the existing Node 22 runtime before adding it. No CAD kernel or AI provider is needed in release 1.

**Spec:** [Model customization design](../specs/2026-10-19-model-customization-design.md)

## Global constraints
- Existing original checkout has uncommitted work: do not modify it. Reuse the clean managed worktree at /Users/perry/.codex/worktrees/singapore-checkout/3d-printing-webapps and create codex/model-customization from current origin/main at implementation time.
- STL units are treated as millimetres. Keep original bytes/geometry immutable; export only the selected part.
- Lock proportions by default; independent scaling requires a visible warning. Zero-extent axes cannot be resized.
- G-code stays read-only; photos are references, not reconstructed CAD, in release 1.
- Photo limits: 3 files, 5 MiB each, 20 megapixels each, JPEG/PNG only; notes 1,000 characters; reference label 80 characters.
- Existing A1 limit remains 256×256×256 mm. Oversize models remain downloadable but cannot be quoted.
- Never change live payment/order data for testing. Use emulators and isolated fixtures.
- Deploy checkout rules only through firebase.production.json and the print-checkout target. Never overwrite the shared project's legacy bucket rules.
- No implementation, dependency installation, production deployment or customer uploads are performed by this planning task.

## Repository evidence
- src/components/STLViewer.tsx currently clones the selected mesh, applies matrixWorld, converts Y-up display to Z-up, estimates it, exports binary STL and regenerates a random modelRevision.
- src/utils/modelManager.ts owns model transforms; src/components/ModelTransformControls.tsx exposes scale factors.
- src/components/checkout/QuotePanel.tsx invalidates estimates and uploads checkoutFile through uploadModel.
- functions/src/orderService.ts validates model storage ownership and creates versioned orders; shared/orders.ts has a strict request schema.
- storage.rules currently covers models and payment-qr only; reference-image support must be explicit and scoped.

## Review focus
- Rotated/off-centre models: edited model-local dimensions must not be confused with camera/world bounds (tasks 1–2).
- Rapid edits or file switching: stale exports and quotes must never win a race (tasks 1, 4).
- Disguised/decompression-heavy images and foreign storage paths must be rejected server-side (task 3).
- A successful upload followed by a failed request must retry without duplicate orders or missing references (tasks 3–4).
- Old accepted/paid orders must remain immutable and readable after schema rollout (tasks 4–5).

## Task 1: Reusable geometry snapshot and revision
**Files:** Create src/utils/modelSnapshot.ts and tests/modelSnapshot.test.ts; modify src/components/STLViewer.tsx.
**Interfaces:** `createModelSnapshot(mesh: THREE.Mesh): Promise<{file: File; revision: string; boundsMm: {x:number;y:number;z:number}; geometry: THREE.BufferGeometry}>`. Caller owns disposal of the returned geometry. Exported bytes and bounds are in printer Z-up coordinates; revision is SHA-256 of bytes.
- [ ] Write tests asserting a selected transformed cube exports correct bounds, original vertices remain unchanged, export excludes overlays/other meshes, and reparsing exported bytes gives matching dimensions within 0.001 mm.
- [ ] Run `npm test tests/modelSnapshot.test.ts` and observe missing implementation failures.
- [ ] Extract the existing transform/export path; implement hashing and file construction without mutating source geometry. Separate mesh identity from print-setting identity.
- [ ] Guard async completion with a generation token; dispose superseded results and clear stale checkoutFile during rebuilds.
- [ ] Re-run the test plus `npm test`; commit the snapshot extraction.

## Task 2: Editable dimensions and download
**Files:** Create src/components/ModelDimensionsEditor.tsx and src/utils/modelDimensions.ts; modify src/utils/modelManager.ts and src/components/STLViewer.tsx; add tests/modelDimensions.test.ts and tests/customization.spec.ts.
**Interfaces:** `scaleForDimensions(originalMm: XYZ, targetMm: XYZ, editedAxis: 'x'|'y'|'z', lockRatio: boolean): XYZ`, where XYZ has finite positive x/y/z. Original bounds refer to normalized immutable model-local printer coordinates. Update the selected model through existing ModelManager APIs.
- [ ] Write failing tests for 20×10×5 → X40 locked = 40×20×10, unlocked Z8 = 20×10×8, repeated Apply without cumulative drift, blank/nonfinite/nonpositive values, planar geometry, locked models and rotated imports.
- [ ] Run `npm test tests/modelDimensions.test.ts` to verify failure.
- [ ] Implement a labelled mm editor, proportion lock, nonuniform-scale warning, Apply/Reset, original-versus-current dimensions and separate placed bounds. Preserve existing scaling controls as another entry point to the same geometry state.
- [ ] Add Download edited STL using the current snapshot file; revoke temporary URLs. Keep checkout disabled for pending draft changes or oversize placed bounds; allow download.
- [ ] Add browser checks for selection changes, keyboard entry, mobile layout, reset and download/reimport. Verify camera/display changes preserve revision.
- [ ] Run unit tests and the targeted browser suite through emulator configuration; commit.

## Task 3: Private photo references
**Files:** Create src/components/customization/ReferencePhotos.tsx, src/components/customization/referenceDraft.ts, shared/references.ts and functions/src/referenceService.ts; modify src/services/checkoutService.ts, functions/src/index.ts, storage.rules and functions/package.json only if required; add tests/references.test.ts and tests/emulator/references.test.ts.
**Interfaces:** `ReferenceDraft = {files: File[]; notes: string; measurement?: {label: string; valueMm: number}}`; `ReferenceAsset = {path:string; originalName:string; bytes:number; contentType:'image/jpeg'|'image/png'}`. `uploadReferences(draft, requestId): Promise<ReferenceAsset[]>`; server `validateReferences(uid, assets): Promise<void>`.
- [ ] Write failing unit/rules tests for count/size/format limits, misleading extensions, huge decoded dimensions, nonpositive measurements, unauthorized reads, foreign-owned paths and path-prefix traversal.
- [ ] Verify failures in unit and emulator runners. Extend scripts/emulator-tests.mjs to include the new test if discovery is explicit.
- [ ] Implement local previews with object URL cleanup, remove/retry controls and explicit upload-on-submission copy. Do not auto-upload on file selection.
- [ ] Add immutable reference storage rules scoped to the dedicated checkout bucket. On server, validate signatures and decoded image dimensions within byte/resource limits before accepting a quote request. Treat filenames/notes as plain text.
- [ ] Provide authenticated customer/owner image reads without persistent public download tokens. Configure bucket CORS narrowly if authenticated browser byte reads require it.
- [ ] Test upload failure/retry and cleanup ownership. Keep any orphan cleanup separate from order creation; never delete referenced assets.
- [ ] Run `npm test` and `npm run test:emulator`; commit.

## Task 4: Quote the exact edited revision
**Files:** Modify src/components/checkout/QuotePanel.tsx, src/services/checkoutService.ts, shared/orders.ts, functions/src/orderService.ts and src/components/owner/OwnerOrders.tsx; extend tests/checkout.spec.ts and tests/emulator/orders.test.ts.
**Interfaces:** Extend request schema with optional `references: ReferenceAsset[]`, `referenceNotes: string`, `referenceMeasurement`, and `customization: {sourceName:string; originalBoundsMm:XYZ; editedBoundsMm:XYZ; scale:XYZ; proportionsLocked:boolean}`. Bound and validate all fields server-side. Existing orders default references to []. Client metadata is informational; STL geometry and owner slicing remain authoritative.
- [ ] Write failing tests proving generated uploaded bytes equal downloaded bytes; changing geometry invalidates preliminary pricing; adding/changing reference context invalidates the request fingerprint; quantity/fulfilment changes recalculate pricing without changing geometry identity.
- [ ] Add race tests: change model while estimate/upload is pending; prevent submitting a mixed old/new snapshot. Freeze the submitted snapshot and references together.
- [ ] Validate attachment paths before transaction; reuse stable requestId for retries. Persist only bounded metadata and retain immutable source/edit context in privateOrders.
- [ ] Add customer review and owner reference panels with original filename, measured bounds, notes and attachment thumbnails. Distinguish customer-requested dimensions from owner-confirmed print totals.
- [ ] Ensure accepted orders keep their prior files and quote. A customization after submission starts a new draft, not an update to that order.
- [ ] Run checkout unit/emulator/browser tests and commit.

## Task 5: Unsupported inputs, regression and rollout
**Files:** Modify src/components/STLViewer.tsx, README.md and tests/customization.spec.ts; update playwright.config.ts to include the new suite.
- [ ] Add failing browser tests: G-code shows analysis plus “Upload the original model to customize”; no STL export or quote from G-code. Photo-only drafts show “Reference photo only — upload an STL to request a print quote.”
- [ ] Implement these states without discarding draft photos when an STL is subsequently selected. Handle file parse/export errors without leaving a stale selectable quote.
- [ ] Run `npm test`, `npx tsc --noEmit`, `npm --prefix functions run build`, `npm run test:emulator`, `npm run test:e2e`, and `VITE_CHECKOUT_MODE=live npm run build`. Resolve occupied emulator/dev ports without stopping unrelated user sessions.
- [ ] Verify with the supplied card-holder STL using local/emulator data only: resize, download, reimport, attach photo, request quote, owner download, and unchanged manual PayNow verification.
- [ ] Review security rules, revision identity and byte equivalence independently before release. Record test results and limitations in the PR.
- [ ] After implementation review, deploy optional-field-compatible backend/rules first, then frontend. Use `npm run deploy:checkout` for scoped backend deployment. Keep a rollback deployment and do not test by modifying real orders.

## Stage 2 proposal: photos to editable CAD (separate implementation plan)
1. Add a design-request lifecycle separate from print orders: draft → needs measurements → generating → review → approved → failed/cancelled. Owner can resolve missing measurements before generation.
2. Start with a deterministic D-shaft-knob template; parameterize outer diameter, height, shaft diameter, flat width, insertion depth and clearance. Build original geometry, not copied third-party design code.
3. Collect/confirm parameters; photo interpretation may suggest values but must not invent confirmed dimensions. An AI service is optional and never required for manual parameter entry.
4. Run validated template inputs in a resource-limited Python/build123d worker behind authenticated asynchronous jobs, not in the browser. Enforce per-user ownership, quotas, timeout and idempotent retries. Do not execute arbitrary customer/AI Python.
5. Store template version, parameters, assumptions, STEP, STL and measured checks per immutable revision. Validate solid/body count, positive volume, hole dimensions and build bounds; test parameter endpoints and cross-parameter combinations.
6. Preview generated STL through the existing viewer and feed the approved revision into release-1 quote integration. Preserve CAD source/parameters for re-editing; do not claim arbitrary imported STL is parametric.
7. Establish design/revision fees and customer approval before adding paid generation. Evaluate a hosted CAD provider only after verifying API/embedding terms, privacy, cost and export capabilities.

## Completion boundary
Release 1 delivers genuine STL resizing/export and photo-supported quoting. It does not reconstruct CAD from G-code or arbitrary photos, infer holes/walls from a triangle mesh, or automatically slice/send prints. This plan is a proposal for user review, not a claim those features already exist.

## Implementation verification — 19 October 2026

Release 1 is implemented on `codex/model-customization`. Independent review found one important edge case: relocking proportions after an independent edit used the original shape. The fix preserves the currently applied proportions. Both unit and browser tests reproduced the bug before the fix and passed afterward.

- 25 unit tests; 3 emulator integration suites; 10 desktop/mobile browser tests passed.
- App and Functions TypeScript checks, Functions bundle and production-mode frontend build passed. Existing frontend bundle-size warning remains.
- Browser tests compare downloaded and uploaded STL bytes, exercise delayed requests, reset, independent scaling/relocking, unsupported inputs, oversize restrictions and the existing manual payment flow.
- Supplied card holder resized from approximately 60 × 14.47 × 103 mm to 66 × 15.91 × 113.30 mm. Local demo order SG-A8E07668F80C4D4C contains the exact downloaded bytes and one reference photo; payment remains not_requested.
- Production deployment, merge and live-order mutations were not performed.

Implementation decisions: authenticated callable image transfer replaces browser Storage upload/CORS to avoid permanent photo download tokens (some callable transfer overhead); bounded model metadata is visible in the customer order and also copied to the private order (small storage duplication); changes were consolidated into an implementation commit and review-fix commit (less per-task history). Knob templates and photo-to-CAD remain outside this release. Production load is not measured; abandoned-reference cleanup remains deferred to avoid deleting committed assets, so abandoned uploads may retain storage cost.
