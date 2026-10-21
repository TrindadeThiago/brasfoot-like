import { readFileSync } from "node:fs";
import { defineProject } from "vitest/config";

const { version } = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
) as { version: string };

export default defineProject({
  test: {
    name: "web",
    environment: "happy-dom",
    include: ["test/**/*.test.{ts,tsx}"],
    setupFiles: ["test/setup.ts"],
    env: { NEXT_PUBLIC_APP_VERSION: version },
  },
});
