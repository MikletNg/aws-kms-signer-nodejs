import * as esbuild from "esbuild";
import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";
import { NodeModulesPolyfillPlugin } from "@esbuild-plugins/node-modules-polyfill";

const commonConfig = {
  entryPoints: ["index.ts"],
  bundle: true,
  minify: true,
  sourcemap: true,
  target: ["es2020"],
};

await esbuild.build({
  ...commonConfig,
  outfile: "dist/node/bundle.mjs",
  platform: "node",
  format: "esm",
  loader: {
    ".node": "copy",
  },
});

await esbuild.build({
  ...commonConfig,
  outfile: "dist/node/bundle.cjs",
  platform: "node",
  format: "cjs",
  loader: {
    ".node": "copy",
  },
});

await esbuild.build({
  ...commonConfig,
  outfile: "dist/browser/bundle.mjs",
  platform: "browser",
  format: "esm",
  define: {
    global: "globalThis",
  },
  plugins: [
    NodeGlobalsPolyfillPlugin({
      process: true,
      buffer: true,
    }),
    NodeModulesPolyfillPlugin(),
  ],
});

await esbuild.build({
  ...commonConfig,
  outfile: "dist/browser/bundle.js",
  platform: "browser",
  format: "iife",
  globalName: "AwsKmsSigner",
  define: {
    global: "globalThis",
  },
  plugins: [
    NodeGlobalsPolyfillPlugin({
      process: true,
      buffer: true,
    }),
    NodeModulesPolyfillPlugin(),
  ],
});
