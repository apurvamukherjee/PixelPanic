import { defineConfig } from "vitest/config";

// Root-level runner covering pure, deterministic logic in server/, shared/
// and the client's canvas helpers. No component-testing infra — this is
// scoped to logic, not UI.
export default defineConfig({
  test: {
    include: ["server/src/**/*.test.ts", "shared/src/**/*.test.ts", "client/src/**/*.test.ts"],
    environment: "node",
  },
});
