import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { structureProblems } from "../test/helpers/structure";
import { createCareer } from "./helpers";
import { forEachScreen } from "./screens-list";

// 016 US4 (FR-017–FR-022, SC-004): varredura axe nas telas principais, nos dois temas. Falha com
// violações graves ou críticas.
async function scan(page: Page, label: string): Promise<string[]> {
  await page.waitForLoadState("networkidle");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  // Garante que a varredura rodou de fato sobre a página.
  expect(results.passes.length, label).toBeGreaterThan(0);
  return results.violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .map(
      (violation) =>
        `${label}: ${violation.id} (${violation.impact}) — ${violation.nodes
          .slice(0, 3)
          .map((node) => node.target.join(" "))
          .join(", ")}`,
    );
}

for (const theme of ["dark", "light"] as const) {
  test(`sem violações graves de acessibilidade no tema ${theme}`, async ({ page }) => {
    test.setTimeout(420_000);
    await page.addInitScript((value) => {
      const key = "brasfoot-like:preferences";
      const prefs = JSON.parse(localStorage.getItem(key) ?? "{}");
      localStorage.setItem(key, JSON.stringify({ ...prefs, theme: value }));
    }, theme);
    await createCareer(page, "Ana Souza", 1);
    const career = new URL(page.url()).searchParams.get("c") ?? "";
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);

    const problems: string[] = [];
    await forEachScreen(page, career, async (screen) => {
      problems.push(...(await scan(page, screen.label)));
      // Títulos, regiões e tabelas (032 US2): um h1, níveis sem salto, regiões com nome único.
      const structure = await page.evaluate(structureProblems);
      problems.push(...structure.map((problem) => `${screen.label}: ${problem}`));
    });

    expect(problems).toEqual([]);
  });
}
