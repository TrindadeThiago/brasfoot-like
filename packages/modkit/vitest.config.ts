import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "modkit",
    include: ["test/**/*.test.ts"],
  },
});
