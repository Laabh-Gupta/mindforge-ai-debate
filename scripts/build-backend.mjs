import { build } from "esbuild";
await build({
  entryPoints: ["backend/src/index.ts"],
  outfile: "backend/dist/index.mjs",
  bundle: true,
  packages: "external",
  platform: "node",
  target: "node22",
  format: "esm",
  tsconfig: "tsconfig.json",
});
