import { build } from "esbuild";
await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  outfile: "lib/index.cjs",
  external: ["sharp", "firebase-admin/*", "firebase-functions/*"],
});
