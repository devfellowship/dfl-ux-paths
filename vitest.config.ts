import { defineConfig } from "vitest/config";

// Vitest's default include glob is repo-wide, which (now that this is a pnpm
// workspace, see pnpm-workspace.yaml) would also pick up app/e2e/*.spec.ts —
// those are Playwright specs (test.describe from @playwright/test), not
// Vitest tests, and collide when Vitest tries to run them. Scope the CLI's
// own `pnpm test` to its own test dir and explicitly exclude app/.
export default defineConfig({
  test: {
    include: ["cli/**/*.{test,spec}.ts"],
    exclude: ["**/node_modules/**", "app/**"],
  },
});
