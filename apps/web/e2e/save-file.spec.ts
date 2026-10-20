import { expect, test } from "@playwright/test";
import { createCareer, simulate, t } from "./helpers";

test("exportar, apagar e importar a carreira volta na mesma rodada (015 US1)", async ({ page }) => {
  const club = await createCareer(page, "Ana Souza", 3);
  await simulate(page, 2);
  const round = await page.getByText(/rodada \d+ de 38/).textContent();

  await page.goto("/carreiras/");
  const downloadEvent = page.waitForEvent("download");
  await page
    .getByRole("button", { name: t("saves.exportLabel", { manager: "Ana Souza" }) })
    .click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toMatch(/\.blsave$/);
  const file = await download.path();

  await page.getByRole("button", { name: t("saves.delete") }).click();
  await page
    .getByRole("dialog", { name: t("saves.confirmDeleteTitle") })
    .getByRole("button", { name: t("saves.delete") })
    .click();
  await expect(page.getByText(t("saves.empty"))).toBeVisible();

  await page.getByLabel(t("saves.import")).setInputFiles(file);
  await expect(page.getByText(t("saves.importDone", { manager: "Ana Souza", club }))).toBeVisible();
  await page.getByRole("link", { name: t("saves.continue") }).click();
  await expect(page.getByRole("heading", { name: club })).toBeVisible();
  await expect(page.getByText(/rodada \d+ de 38/)).toHaveText(round ?? "");
});
