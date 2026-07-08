import { test, expect } from "@playwright/test";

// UC3 — "refatorar UI — antiga × referência nova (não 1:1)", Atlas lens
// (ADR-2 default for Explorar). Asserts the React Flow canvas renders the
// expected nodes/edges for a single flows.json (lesson-studio-web fixture).
//
// Ground truth (public/fixtures/lesson-studio-web.flows.json): 4 screens
// (studio_projects_list, studio_editor, studio_preview, studio_settings) = 4
// nodes. Edges = actions with a resolvable, non-self next_screen:
//   studio_projects_list --open_project--> studio_editor
//   studio_projects_list --create_project--> studio_editor
//   studio_editor --open_preview--> studio_preview   (add_block/save_lesson are self-loops, excluded)
//   studio_preview --publish_lesson--> studio_editor
// = 4 edges (studio_settings' rename_project action is a self-loop, excluded).
const DEEP_LINK = "/?mode=explorar&repo=demo/lesson-studio-web&path=lesson-studio-web.flows.json";

test.describe("UC3 — Explorar (Atlas lens)", () => {
  test("React Flow canvas renders the expected screen nodes and action edges", async ({ page }) => {
    await page.goto(DEEP_LINK);

    await expect(page.getByTestId("atlas-canvas")).toBeVisible();

    const nodes = page.getByTestId("atlas-node");
    await expect(nodes).toHaveCount(4);
    await expect(page.locator('[data-testid="atlas-node"][data-screen-id="studio_editor"]')).toBeVisible();

    const edges = page.locator(".react-flow__edge");
    await expect(edges).toHaveCount(4);

    // Screen list below the canvas preserves source_ref + action chips +
    // screenshot gallery (ADR-3 parity).
    await expect(page.getByTestId("screen-list")).toBeVisible();
    await expect(page.getByTestId("screen-card")).toHaveCount(4);
    await expect(page.getByTestId("source-ref").first()).toBeVisible();
  });
});
