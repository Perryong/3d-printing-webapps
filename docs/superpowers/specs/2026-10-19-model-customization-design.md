# Model customization and photo-assisted design

Status: Release 1 implemented locally on codex/model-customization; independent review completed and its relocking-proportions finding fixed. Stage 2, including templates, is excluded from this release.

## Goal
Customers can attach reference photos, resize their uploaded STL in millimetres, preview and download the resulting STL, then request a quote for exactly that revision. A later template-based CAD service serves customers who have photos but no source model.

## Input contract
- STL: keep the original immutable. Offer overall dimensions and uniform scaling, not inferred parametric CAD features.
- G-code: read-only preliminary analysis. Explain that toolpaths cannot reliably recover the original CAD; request the original STL, STEP or 3MF before customization. Do not scale or execute uploaded G-code.
- Photos: JPEG/PNG, up to 3 files, 5 MiB each and 20 megapixels each. Reference only in release 1; no promise of automatic reconstruction. State explicitly that photos are not printable geometry.
- Photo-only users can prepare a reference draft and see the missing-model explanation, but cannot request a manufacturing quote until a model exists. Full design-request management belongs to stage 2.

## Release 1 experience
1. Upload STL or G-code. Show separate photo attachment controls, reference notes (max 1,000 characters), and a measured-reference field (label max 80 characters; positive mm value).
2. For STL, display original and edited X/Y/Z dimensions in the model's printer-coordinate frame: X width, Y depth, Z height. These are independent of camera position and placed rotation.
3. Lock proportions by default. Editing one dimension scales all three by the same factor. Unlocking enables independent axis scaling after a visible warning that holes, walls and clearances deform too.
4. Use a draft dimension form with Apply and Reset to original. Reject blank, non-finite, zero, negative and zero-extent inputs. Locked models cannot be edited. Disable quote submission while edits are unapplied or export is running.
5. Show world/placed build bounds separately. Dimensions above 256 mm may be inspected and downloaded but cannot enter this A1 quote flow until resized; do not silently clamp.
6. Export a binary STL using exactly the same snapshot as the estimate and quote upload. Explicitly state STL units are treated as mm. Do not export grid, edges, annotations or another selected model.
7. Quote review shows final dimensions, original filename, photos and notes. The owner downloads the generated STL and sees the requested measurements. Existing slicing confirmation remains mandatory.
8. Existing confirmed/accepted orders are immutable. A new edit creates a new revision/request; it never rewrites a paid order.

## Revisions and storage
Extract current STLViewer export logic into one snapshot helper. Compute SHA-256 over exported bytes for geometry identity; use a separate request fingerprint for print settings, quantity, fulfilment and reference attachments. Keep the existing modelRevision contract string-compatible. Camera, grid, shading and transparency must not invalidate geometry.

Upload attachments only on explicit quote submission. Use the dedicated checkout bucket under references/{uid}/{requestId}/{uuid}.jpg or .png. Enforce ownership, immutable creates, size/content type rules and authenticated reads; do not publish permanent download tokens for photos. Validate file signatures, decoded dimensions and owned paths on the server; browser accept/MIME is not validation. Store bounded reference metadata on the order and source/edit metadata on the private order. Use optional schema fields so existing orders remain readable.

Retries reuse a request identity and uploaded assets. Failed submissions leave a recoverable draft, not a partial order. Removed draft attachments stay local unless already uploaded; an authenticated cleanup callable may delete unreferenced assets owned by the caller. Any scheduled orphan cleanup must first check committed order references and must be limited to the references prefix.

## Stage 2: photo-assisted parametric generation
Start with an original D-shaft-knob template, not arbitrary image-to-CAD. The image suggests dimensions/features; users must supply or confirm critical measurements. Preserve assumptions separately from measured values. Use validated parameters to build a solid with build123d in an isolated Python worker. Preserve parameter JSON, template version and STEP; export STL for the existing viewer/quote flow. STEP does not preserve the template's full feature history; keep source and parameters.

No arbitrary AI-generated Python execution in the first version. No automatic pricing from a photo. Geometry validation is not proof of mechanical fit; owner review and test fits remain necessary. Provider integration, AI inference, design fees and unsliced 3MF/STEP import require a separate reviewed implementation plan.

## Acceptance
A 20×10×5 mm cube resized uniformly by setting X=40 exports and quotes 40×20×10 mm. Unlocked Z=8 yields 20×10×8 mm. Camera changes preserve exported bytes. A submitted model matches downloaded bytes, and photo access is denied to unrelated users. G-code and photo-only drafts cannot produce an STL quote. Previously accepted orders and payment/receipt behavior remain unchanged.
