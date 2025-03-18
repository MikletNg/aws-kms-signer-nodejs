// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import jestPlugin from "eslint-plugin-jest";

export default tseslint.config(eslint.configs.recommended, ...tseslint.configs.recommended, ...tseslint.configs.stylistic, {
  files: ["**/*.{test,spec}.{js,ts}"],
  plugins: {
    jest: jestPlugin,
  },
  languageOptions: {
    globals: {
      ...jestPlugin.configs.recommended.globals,
    },
  },
  rules: {
    ...jestPlugin.configs.recommended.rules,
    "jest/prefer-expect-assertions": "off",
    "jest/no-disabled-tests": "warn",
    "jest/no-focused-tests": "error",
    "jest/no-identical-title": "error",
    "jest/valid-expect": "error",
  },
});
