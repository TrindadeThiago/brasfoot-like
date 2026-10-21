import { expect, test } from "@playwright/test";
import { createCareer, simulateSeason, t } from "./helpers";

test("Série B: temporada direto, resumo, próxima temporada e rodada ao vivo (SC-004, SC-005)", async ({
  page,
}) => {
  test.setTimeout(240_000);
  // Sem demissão: o teste é da virada; uma demissão (012/013) mudaria a Início.
  await createCareer(page, "Bia Lima", 0, "Série B", { noFiring: true });
  await expect(
    page.getByText(t("header.progress", { year: 2027, round: 1, total: 38, division: "Série B" })),
  ).toBeVisible();
  await simulateSeason(page);
  await expect(page).toHaveURL(/fim-de-temporada/);
  await expect(
    page
      .getByRole("region", { name: t("seasonEnd.promotedTo", { division: "Série A" }) })
      .getByRole("listitem"),
  ).toHaveCount(4);

  const started = Date.now();
  await page.getByRole("button", { name: t("seasonEnd.next") }).click();
  await expect(page.getByText(/temporada 2028 · rodada 1 de 38/)).toBeVisible();
  expect(Date.now() - started).toBeLessThan(2_000);
  await expect(
    page.getByRole("region", { name: t("renewal.notice.title", { year: 2028 }) }),
  ).toBeVisible();

  await page.getByRole("button", { name: t("home.playLive") }).click();
  await expect(page).toHaveURL(/rodada/);
  await page.getByRole("button", { name: t("round.finishNow") }).click();
  await expect(page.getByText(t("home.lastRound", { round: 1 }))).toBeVisible();
  await page.getByRole("link", { name: t("round.toHome") }).click();
  await expect(page.getByText(/temporada 2028 · rodada 2 de 38/)).toBeVisible();
});
