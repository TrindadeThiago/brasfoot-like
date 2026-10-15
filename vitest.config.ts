import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["packages/engine", "packages/i18n", "tools"],
  },
});
