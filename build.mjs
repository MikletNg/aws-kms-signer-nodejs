import * as esbuild from "esbuild";
import { glob } from "glob";
import { execSync } from "child_process";

const commonConfig = {
  entryPoints: [...(await glob("src/**/*.ts"))],
  bundle: false,
  minify: false,
  sourcemap: true,
  target: ["es2020"],
  outbase: "src",
};

await esbuild.build({
  ...commonConfig,
  outdir: "dist/esm",
  platform: "node",
  format: "esm",
});

await esbuild.build({
  ...commonConfig,
  outdir: "dist/cjs",
  platform: "node",
  format: "cjs",
});

execSync("tsc --emitDeclarationOnly");