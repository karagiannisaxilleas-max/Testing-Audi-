import { defineConfig } from "vitest/config";

// The coverage-engine is pure TypeScript with no DOM dependencies, so the
// default node environment is all we need for the golden geometry tests.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
