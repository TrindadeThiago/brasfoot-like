import { expect, test } from "@playwright/test";
import { createCareer, t } from "./helpers";

test("rodada ao vivo: relógio corre, pausa com substituição, termina e mostra o resumo", async ({
  page,
}) => {
  await createCareer(page, "Ana Souza", 2);
  await page.getByRole("button", { name: t("home.playLive") }).click();
  const mine = page.getByRole("region", { name: t("round.myMatch") });
  await expect(mine).toBeVisible();
  await page.getByLabel(t("round.speed")).selectOption("fast");
  await page.getByLabel(t("round.autoPause")).uncheck();
  await expect(mine.getByText(/^(1\d|[2-9]\d)'$/)).toBeVisible({ timeout: 15_000 });

  await page.getByRole("button", { name: t("round.pause") }).click();
  const panel = page.getByRole("region", { name: t("round.panel") });
  await expect(panel).toBeVisible();
  const lists = panel.getByRole("list");
  await lists.nth(0).getByRole("button").nth(3).click();
  await lists.nth(1).getByRole("button").first().click();
  await expect(panel.getByText(t("round.substitutionsLeft", { used: 1, limit: 5 }))).toBeVisible();
  await page.getByRole("button", { name: t("round.resume") }).click();

  await page.getByRole("button", { name: t("round.finishNow") }).click();
  await expect(page.getByRole("region", { name: t("home.lastRound", { round: 1 }) })).toBeVisible();
  const summary = page.getByRole("article", { name: /^Resumo:/ });
  await expect(summary).toBeVisible();
  await expect(summary.getByRole("region", { name: t("summary.substitutions") })).toContainText(
    "sai",
  );
  await page.getByRole("link", { name: t("round.toHome") }).click();
  await expect(
    page.getByText(t("header.progress", { year: 2027, round: 2, total: 38 })),
  ).toBeVisible();
});
