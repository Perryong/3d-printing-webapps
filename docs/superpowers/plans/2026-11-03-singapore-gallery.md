# Singapore Product Gallery

Goal: Display seven Singapore-inspired designs in a new /singapore-gallery page with actual rotatable meshes and downloadable files.

Completed:
- Seven printable prototypes: Lapis Bloom, Tutu Keychain, CHOPE Desk Marker, HDB Block Pencil Pot, Kopitiam Paperclip Cup, Peranakan Tile Coaster and Ice Cream Wafer Coin Collector.
- Each product has a self-contained WebGL viewer, Blender file and rendered image fallback.
- Lapis Bloom has seven sculpted bands and floral relief. Tutu Keychain has a reinforced eyelet.
- Standalone asset check: `node --test tests/gallery-assets.test.mjs`.
- Build: `npm run build`.

Models are prototype geometry, not physically tested prints. STL files contain geometry only; Blender files preserve illustrative colours. No printer jobs are sent. Existing unrelated local viewer changes are not part of this gallery commit.
