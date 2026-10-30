import { expect, firefox, test } from "@playwright/test";
import { createCareer, simulate, t } from "./helpers";

// 031 SC-003: exportar a carreira num navegador (Chromium) e importá-la em outro (Firefox) devolve a
// carreira na mesma rodada. Pula se o Firefox não estiver instalado (`pnpm exec playwright install firefox`).
test("exportar no Chromium e importar no Firefox devolve a carreira na mesma rodada (031 SC-003)", async ({
  page,
  baseURL,
}) => {
  test.setTimeout(120_000);
  let browser: Awaited<ReturnType<typeof firefox.launch>>;
  try {
    browser = await firefox.launch();
  } catch {
    test.skip(true, "Firefox não instalado");
    return;
  }
  try {
    const club = await createCareer(page, "Ana Souza", 3);
    await simulate(page, 2);
    const round = (await page.getByText(/rodada \d+ de 38/).textContent()) ?? "";

    await page.goto("/carreiras/");
    const downloadEvent = page.waitForEvent("download");
    await page
      .getByRole("button", { name: t("saves.exportLabel", { manager: "Ana Souza" }) })
      .click();
    const file = await (await downloadEvent).path();

    const other = await browser.newContext({ baseURL: baseURL ?? "http://localhost:4173" });
    const tab = await other.newPage();
    await tab.addInitScript(() =>
      localStorage.setItem(
        "brasfoot-like:preferences",
        JSON.stringify({ tips: { dismissed: [], skipAll: true } }),
      ),
    );
    await tab.goto("/carreiras/");
    await expect(tab.getByText(t("saves.empty"), { exact: true })).toBeVisible();
    await tab.getByLabel(t("saves.import")).setInputFiles(file);
    await expect(
      tab.getByText(t("saves.importDone", { manager: "Ana Souza", club })),
    ).toBeVisible();
    await tab.getByRole("link", { name: t("saves.continue") }).click();
    await expect(tab.getByRole("heading", { name: club })).toBeVisible();
    await expect(tab.getByText(/rodada \d+ de 38/)).toHaveText(round);
    await other.close();
  } finally {
    await browser.close();
  }
});
