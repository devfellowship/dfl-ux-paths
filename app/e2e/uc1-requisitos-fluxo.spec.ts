import { test, expect } from "@playwright/test";

// UC1 — "criar UI nova de requisitos (baixa-fi) → mostrar ao cliente o fluxo
// + telas fictícias", Roteiro lens (ADR-2). Fase 1 scope: fixture-driven
// viewer only (LLM/MCP generation is Fase 3, ADR-5/6) — this exercises the
// Requisitos→Fluxo coverage matrix + gap detection, and the Roteiro
// present-mode stepper, against public/fixtures/requisitos-demo.flows.json
// (has requirements[] + fidelity: fictional/sketch, the v1.3 forward-looking
// additive fields — see src/lib/types.ts).
const DEEP_LINK =
  "/?mode=requisitos&repo=demo/requisitos-demo&path=requisitos-demo.flows.json";

test.describe("UC1 — Requisitos→Fluxo (Roteiro lens)", () => {
  test("coverage matrix renders requirements, links to screens, and flags a gap", async ({ page }) => {
    await page.goto(DEEP_LINK);

    await expect(page.getByTestId("requirements-view")).toBeVisible();
    await expect(page.getByTestId("requirements-count")).toContainText("4 requirements");
    await expect(page.getByTestId("fictional-count")).toContainText("4 fictional/sketch screens");

    const rows = page.getByTestId("requirement-row");
    await expect(rows).toHaveCount(4);

    // The referral-incentive requirement covers a screen id that doesn't
    // exist in this fixture — must be flagged as a gap.
    const gapRow = page.locator('[data-testid="requirement-row"][data-state="gap"]');
    await expect(gapRow).toHaveCount(1);
    await expect(page.getByTestId("gap-count")).toContainText("1 gaps");

    // requirement -> screen link: the value-prop requirement chips the
    // onboarding_welcome screen id.
    const okRow = page.locator('[data-testid="requirement-row"][data-requirement-id="req_value_prop"]');
    await expect(okRow.getByText("onboarding_welcome")).toBeVisible();
  });

  test("Roteiro present-mode steps through the fictional/sketch screens", async ({ page }) => {
    await page.goto("/?mode=roteiro&repo=demo/requisitos-demo&path=requisitos-demo.flows.json");

    await expect(page.getByTestId("roteiro-view")).toBeVisible();
    await expect(page.getByTestId("roteiro-step-indicator")).toHaveText("step 1 / 4");
    await expect(page.getByTestId("roteiro-slide")).toHaveAttribute("data-screen-id", "onboarding_welcome");

    await page.getByTestId("roteiro-next").click();
    await expect(page.getByTestId("roteiro-step-indicator")).toHaveText("step 2 / 4");
    await expect(page.getByTestId("roteiro-slide")).toHaveAttribute("data-screen-id", "onboarding_signup");

    // Export is an honest disabled stub in Fase 1 (ADR-7/Q6 lands Fase 4).
    await expect(page.getByTestId("roteiro-export-stub")).toBeDisabled();
  });
});
