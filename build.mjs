import * as esbuild from "esbuild";
import { glob } from "glob";

const commonConfig = {
  entryPoints: [...(await glob("src/**/*.ts"))],
  bundle: false,
  minify: false,
  sourcemap: true,
  target: ["es2020"],
  outbase: "src",
};

// Build ESM version
await esbuild.build({
  ...commonConfig,
  outdir: "dist/esm",
  platform: "node",
  format: "esm",
});

// Build CJS version
await esbuild.build({
  ...commonConfig,
  outdir: "dist/cjs",
  platform: "node",
  format: "cjs",
});

// Generate TypeScript declaration files
await esbuild.build({
  ...commonConfig,
  outdir: "dist/types",
  platform: "neutral",
  format: "esm",
  outExtension: { ".js": ".d.ts" },
  metafile: true,
});
