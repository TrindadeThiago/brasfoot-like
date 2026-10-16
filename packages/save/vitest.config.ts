import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "save",
    include: ["test/**/*.test.ts"],
  },
});
