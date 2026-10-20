import { expect, test } from "@playwright/test";
import { t } from "./helpers";

test("baixar o mod de exemplo, carregá-lo e jogar uma rodada em Norvália (015 US2/US3)", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: t("nav.mods") }).click();
  await expect(page.getByRole("heading", { name: t("mods.title"), exact: true })).toBeVisible();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("link", { name: t("mods.example") }).click();
  const file = await (await downloadEvent).path();

  await page.getByLabel(t("mods.load")).setInputFiles(file);
  await expect(page.getByText(t("mods.loaded", { name: "Norvália (exemplo)" }))).toBeVisible();
  await expect(
    page.getByRole("region", { name: t("mods.list") }).getByText("Norvália (exemplo)"),
  ).toBeVisible();

  await page.goto("/nova-carreira/");
  await page.getByLabel(t("newCareer.bank")).selectOption({ label: "Norvália (exemplo)" });
  await page.getByLabel(t("newCareer.managerName")).fill("Ana Souza");
  const table = page.getByRole("table", {
    name: t("newCareer.clubsCaption", { division: "Primeira Divisão" }),
  });
  const row = table.locator("tbody tr").first();
  const club = (await row.getByRole("img").getAttribute("aria-label")) ?? "";
  await row.click();
  await page.getByRole("button", { name: t("newCareer.confirm") }).click();
  await expect(page.getByRole("heading", { name: club })).toBeVisible();
  await expect(page.getByText(/rodada 1 de 22/)).toBeVisible();
  await page.getByRole("button", { name: t("home.simulate") }).click();
  await expect(page.getByText(/rodada 2 de 22/)).toBeVisible();
});
