import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "web",
    environment: "happy-dom",
    include: ["test/**/*.test.{ts,tsx}"],
    setupFiles: ["test/setup.ts"],
  },
});
