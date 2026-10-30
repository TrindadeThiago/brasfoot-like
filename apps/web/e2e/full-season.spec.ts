import { expect, test } from "@playwright/test";
import { createCareer, simulateSeason, t } from "./helpers";

test("temporada inteira simulada direto até o campeão (SC-001)", async ({ page }) => {
  test.setTimeout(180_000);
  await createCareer(page, "Ana Souza", 7);
  await simulateSeason(page);
  await expect(page).toHaveURL(/fim-de-temporada/);
  for (const division of ["Série A", "Série B"]) {
    await expect(
      page.getByRole("region", { name: t("seasonEnd.champion", { division }) }),
    ).toBeVisible();
  }
  await expect(
    page
      .getByRole("region", { name: t("seasonEnd.relegatedTo", { division: "Série B" }) })
      .getByRole("listitem"),
  ).toHaveCount(4);

  // 030: o título com o botão na mesma linha, o resultado do clube e as seções do resumo.
  const title = page.getByRole("heading", { level: 2, name: /^Temporada \d+ encerrada$/ });
  await expect(title).toBeVisible();
  await expect(
    title.locator("..").getByRole("button", { name: t("seasonEnd.next") }),
  ).toBeVisible();
  await expect(page.getByRole("region", { name: t("seasonEnd.result") })).toBeVisible();
  const campaign = page.getByRole("region", { name: t("seasonEnd.campaign") });
  await expect(campaign.getByRole("table", { name: t("seasonEnd.campaign.table") })).toBeVisible();
  await expect(page.getByRole("region", { name: t("seasonEnd.champions") })).toBeVisible();
  await expect(page.getByRole("region", { name: t("seasonEnd.moves") })).toBeVisible();
  // A classificação final vem recolhida e Próxima temporada também está no fim da página.
  const table = page.getByText(t("seasonEnd.finalTable")).locator("..");
  await expect(table).not.toHaveAttribute("open", "");
  await expect(page.getByRole("button", { name: t("seasonEnd.next") })).toHaveCount(2);
});
