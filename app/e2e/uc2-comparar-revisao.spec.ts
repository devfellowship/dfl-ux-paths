import { test, expect } from "@playwright/test";

// UC2 — "refatorar UI — antiga × nova mantendo requisitos (não 1:1)",
// Revisão lens (ADR-2/ADR-9). Loads 2 REAL fixture flows.json and asserts
// paired/added/removed counts + side-by-side render, pairing by screen.id
// (the sticky 1:1 join key, ADR-3).
//
// Ground truth (see public/fixtures/*.json):
//   lesson-studio-web screen ids: studio_projects_list, studio_editor, studio_preview, studio_settings (4)
//   learn-mobile-studio screen ids: studio_projects_list, studio_editor, studio_preview (3)
// Shared ids: studio_projects_list, studio_editor, studio_preview (3) —
// studio_settings exists only on the web side. Union = 4 ids.
const WEB = { repo: "demo/lesson-studio-web", path: "lesson-studio-web.flows.json" };
const MOBILE = { repo: "demo/learn-mobile-studio", path: "learn-mobile-studio.flows.json" };

function deepLink(a: typeof WEB, b: typeof WEB) {
  return (
    "/?mode=comparar" +
    `&a_repo=${a.repo}&a_path=${a.path}` +
    `&b_repo=${b.repo}&b_path=${b.path}`
  );
}

test.describe("UC2 — Comparar (Revisão lens)", () => {
  test("web (A, baseline) vs mobile (B, new) — flags studio_settings as removed", async ({ page }) => {
    await page.goto(deepLink(WEB, MOBILE));

    await expect(page.getByTestId("compare-view")).toBeVisible();
    await expect(page.getByTestId("stat-total")).toContainText("4");
    await expect(page.getByTestId("stat-paired")).toContainText("3");
    await expect(page.getByTestId("stat-changed")).toContainText("0"); // TODO hook, ADR-9 — not computed yet
    await expect(page.getByTestId("stat-added")).toContainText("0");
    await expect(page.getByTestId("stat-removed")).toContainText("1");

    await expect(page.getByTestId("compare-pair")).toHaveCount(4);

    const pairedRow = page.locator('[data-testid="compare-pair"][data-screen-id="studio_editor"]');
    await expect(pairedRow).toHaveAttribute("data-status", "paired");
    await expect(pairedRow.getByTestId("pair-side")).toHaveCount(2); // both sides render

    const removedRow = page.locator('[data-testid="compare-pair"][data-screen-id="studio_settings"]');
    await expect(removedRow).toHaveAttribute("data-status", "removed");
    await expect(removedRow.getByTestId("pair-side-empty")).toHaveCount(1);
  });

  test("mobile (A, baseline) vs web (B, new) — flags studio_settings as added", async ({ page }) => {
    await page.goto(deepLink(MOBILE, WEB));

    await expect(page.getByTestId("stat-total")).toContainText("4");
    await expect(page.getByTestId("stat-paired")).toContainText("3");
    await expect(page.getByTestId("stat-added")).toContainText("1");
    await expect(page.getByTestId("stat-removed")).toContainText("0");

    const addedRow = page.locator('[data-testid="compare-pair"][data-screen-id="studio_settings"]');
    await expect(addedRow).toHaveAttribute("data-status", "added");
  });

  // Regression (P0 fix, 2026-07-08): navigating to Comparar via the tab (NOT
  // a deep link) and hitting "Load" with the default RepoPicker state used to
  // throw `SyntaxError: Unexpected token '<'` — the default `path` for a demo
  // repo was hardcoded to the *real*-repo convention
  // (".dfl-ux-paths/flows.json"), which 404s for a fixture repo and falls
  // through to the SPA catch-all (HTML), which the client then tried to
  // JSON.parse. See lib/api.ts DEMO_FIXTURE_PATHS + defaultPathFor.
  test("clicking the Comparar tab + Load with default state does not throw — loads demo fixtures", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("tab-comparar").click();

    await expect(page.getByTestId("a-path")).toHaveValue("lesson-studio-web.flows.json");
    await expect(page.getByTestId("b-path")).toHaveValue("learn-mobile-studio.flows.json");

    await page.getByTestId("a-load").click();
    await page.getByTestId("b-load").click();

    await expect(page.getByTestId("compare-status-error")).toHaveCount(0);
    await expect(page.getByTestId("compare-view")).toBeVisible();
    await expect(page.getByTestId("stat-total")).toContainText("4");
  });
});
