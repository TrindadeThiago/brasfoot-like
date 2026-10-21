import { expect, test } from "@playwright/test";
import { createCareer, t } from "./helpers";

test("nenhuma requisição sai para outra origem ao criar carreira e jogar uma rodada (FR-037, SC-010)", async ({
  page,
  baseURL,
}) => {
  const site = new URL(baseURL ?? "http://localhost:4173").origin;
  const foreign: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.protocol === "data:" || url.protocol === "blob:") return;
    if (url.origin !== site) foreign.push(request.url());
  });

  await createCareer(page, "Ana Souza", 1);
  await page.getByRole("button", { name: t("home.playLive") }).click();
  await page.getByLabel(t("round.speed")).selectOption("fast");
  await page.getByRole("button", { name: t("round.finishNow") }).click();
  await expect(page.getByRole("region", { name: t("home.lastRound", { round: 1 }) })).toBeVisible();
  for (const screen of ["nav.competition", "nav.market", "nav.career"]) {
    await page.getByRole("link", { name: t(screen) }).click();
  }
  await page.goto("/sobre/");
  await page.goto("/configuracoes/");

  expect(foreign).toEqual([]);
});
