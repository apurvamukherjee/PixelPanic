import { defineConfig } from "vitest/config";

// Root-level runner covering the pure, deterministic functions in server/
// and shared/ — the highest-value, lowest-effort test target per
// PHASE3-PLAN.md's production-readiness section. No client tests yet (no
// component-testing infra set up); this is scoped to logic, not UI.
export default defineConfig({
  test: {
    include: ["server/src/**/*.test.ts", "shared/src/**/*.test.ts"],
    environment: "node",
  },
});
