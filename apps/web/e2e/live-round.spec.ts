import { expect, test } from "@playwright/test";
import { createCareer, t } from "./helpers";

const FIRST_CUP_PHASE = "Fase de 32";

/** Joga as rodadas da liga até o próximo jogo ser o da copa (a seed fixa decide se vai a pênaltis). */
async function untilCup(page: import("@playwright/test").Page): Promise<void> {
  const card = page.getByRole("region", { name: t("home.nextMatch") });
  for (let step = 0; step < 8; step++) {
    if ((await card.textContent())?.includes(FIRST_CUP_PHASE)) break;
    await page.getByRole("button", { name: t("home.simulate") }).click();
    await expect(page.getByRole("button", { name: t("home.simulate") })).toBeEnabled();
  }
  await expect(card).toContainText(FIRST_CUP_PHASE);
}

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
    page.getByText(t("header.progress", { year: 2027, round: 2, total: 38, division: "Série A" })),
  ).toBeVisible();
});

// 030: sair no meio da rodada pede confirmação num diálogo (cancelar mantém a rodada, confirmar sai).
test("rodada ao vivo: sair pede confirmação num diálogo", async ({ page }) => {
  await createCareer(page, "Ana Souza", 2);
  await page.getByRole("button", { name: t("home.playLive") }).click();
  await expect(page.getByRole("region", { name: t("round.myMatch") })).toBeVisible();

  const leave = page.getByRole("button", { name: t("round.leave") });
  await leave.click();
  const dialog = page.getByRole("dialog", { name: t("round.leaveTitle") });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(t("round.confirmLeave"));
  await expect(dialog.getByRole("button", { name: t("round.leaveStay") })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(leave).toBeFocused();
  await expect(page.getByRole("region", { name: t("round.myMatch") })).toBeVisible();

  // O link Voltar passa pelo mesmo diálogo; confirmar leva à Início e a rodada se perde.
  await page.getByRole("link", { name: t("nav.home") }).click();
  await expect(page.getByRole("dialog", { name: t("round.leaveTitle") })).toBeVisible();
  await page
    .getByRole("dialog", { name: t("round.leaveTitle") })
    .getByRole("button", { name: t("round.leaveConfirm") })
    .click();
  await expect(page).toHaveURL(/\/jogo\/\?c=/);
  await expect(page.getByRole("button", { name: t("home.playLive") })).toBeVisible();
});

// 030 US4: pênaltis ao vivo. A seed "pen-4" leva o primeiro jogo da copa a pênaltis (achada por busca).
test("rodada ao vivo: pênaltis do jogo da copa, cobrança a cobrança, e o resultado final", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await createCareer(page, "Ana Souza", 1, "Série A", { noFiring: true, seed: "pen-4" });
  await untilCup(page);
  await page.getByRole("button", { name: t("home.playLive") }).click();
  await expect(page.getByRole("region", { name: t("round.myMatch") })).toBeVisible();
  await page.getByLabel(t("round.autoPause")).uncheck();
  await page.getByLabel(t("round.speed")).selectOption("fast");
  const shootout = page.getByRole("region", { name: t("cup.shootout.title") });
  await expect(shootout).toBeVisible({ timeout: 60_000 });
  await expect(shootout.getByRole("listitem").first()).toBeVisible();
  // A prorrogação veio antes, e o estado do jogo mostra os pênaltis em texto.
  await expect(
    page.getByRole("region", { name: t("round.myMatch") }).getByText(t("round.penalties")),
  ).toBeVisible();
  // Ao fim da série a rodada termina sozinha e o resumo mostra as cobranças e o resultado final.
  await expect(page.getByRole("article", { name: /^Resumo:/ })).toBeVisible();
  await expect(
    page
      .getByRole("article", { name: /^Resumo:/ })
      .getByRole("region", { name: t("cup.shootout.title") }),
  ).toBeVisible();
});

// 030 SC-002: uma rodada de 10 jogos em velocidade rápida termina e nenhuma tarefa de interface passa de 200 ms.
test("rodada de 10 jogos em velocidade rápida termina sem tarefa longa de interface", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await createCareer(page, "Ana Souza", 2);
  await page.getByRole("button", { name: t("home.playLive") }).click();
  await expect(page.getByRole("region", { name: t("round.myMatch") })).toBeVisible();
  await expect(
    page.getByRole("region", { name: t("round.otherMatches") }).getByRole("listitem"),
  ).toHaveCount(9);
  await page.getByLabel(t("round.autoPause")).uncheck();
  await page.getByLabel(t("round.speed")).selectOption("fast");
  await page.evaluate(() => {
    const store: number[] = [];
    (window as unknown as { __long: number[] }).__long = store;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) store.push(entry.duration);
    }).observe({ entryTypes: ["longtask"] });
  });
  // A interface continua respondendo durante a rodada.
  await expect(page.getByRole("button", { name: t("round.pause") })).toBeEnabled();
  await expect(page.getByRole("region", { name: t("home.lastRound", { round: 1 }) })).toBeVisible({
    timeout: 120_000,
  });
  const long = await page.evaluate(() => (window as unknown as { __long: number[] }).__long);
  expect(Math.max(0, ...long), `tarefas longas: ${JSON.stringify(long)}`).toBeLessThan(200);
});
