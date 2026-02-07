import { defineConfig } from "eslint/config";

import { baseConfig } from "@acme/eslint-config/base";

export default defineConfig(
  {
    ignores: ["dist/**"],
  },
  baseConfig,
  {
    rules: {
      "@typescript-eslint/no-unsafe-return": "off", // Honoでは例外的にオフで。
    },
  },
);
