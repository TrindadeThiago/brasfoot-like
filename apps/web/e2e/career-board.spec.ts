import { expect, test } from "@playwright/test";
import { createCareer, simulate, simulateSeason, t } from "./helpers";

test("diretoria: sem demissão na criação, metas, confiança e Carreira (012)", async ({ page }) => {
  await createCareer(page, "Ana Souza", 4, "Série A", { noFiring: true });

  const card = page.getByRole("region", { name: t("board.title") });
  await expect(card.getByText(t("board.goals"))).toBeVisible();
  await expect(card.getByText(t("board.noFiring"))).toBeVisible();
  await simulate(page, 3);
  await expect(card.getByText(t("board.noReasons"))).toHaveCount(0);

  await card.getByRole("link", { name: t("nav.career") }).click();
  await expect(page.getByRole("heading", { name: t("career.title") })).toBeVisible();
  await page.getByRole("tab", { name: t("career.tab.coaches") }).click();
  await expect(page.getByText(t("career.coaches.you", { name: "Ana Souza" }))).toBeVisible();
  await page.getByRole("tab", { name: t("career.tab.history") }).click();
  await expect(page.getByRole("table", { name: t("career.history.stints") })).toBeVisible();
});

// 029 US1, SC-001: a aba Diretoria mostra as metas e a confiança com seus motivos sem rolagem vertical.
test("Diretoria: metas e confiança com motivos sem rolagem da página em 1 440 × 900 (029)", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await createCareer(page, "Ana Souza", 4, "Série A", { noFiring: true });
  await simulate(page, 3);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/jogo/carreira/?c=${new URL(page.url()).searchParams.get("c")}`);
  const goals = page.getByRole("region", { name: t("board.goals") });
  const confidence = page.getByRole("region", { name: t("board.confidenceLabel"), exact: true });
  await expect(goals).toBeVisible();
  await expect(confidence).toBeVisible();
  await expect(goals.getByText(/Cumprindo|Em risco|Em andamento/).first()).toBeVisible();
  await expect(confidence.getByText(t("board.reasons"))).toBeVisible();
  // Tendência e nível em texto, não só em cor (FR-021).
  await expect(confidence.getByText(/Em alta|Em queda|Estável/)).toBeVisible();
  await expect(confidence.getByText(/Confiança (alta|média|baixa)/)).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight,
  );
  expect(overflow, "a página não rola na vertical").toBeLessThanOrEqual(0);
});

// 029 US3, critério de aceite 1: o jogador demitido avalia as propostas e aceita uma só com o teclado.
test("propostas: demitido aceita uma só com o teclado (029)", async ({ page }) => {
  test.setTimeout(240_000);
  // O último colocado da Série A é demitido na virada da temporada (seed fixa do e2e).
  const club = await createCareer(page, "Ana Souza", 19);
  await simulateSeason(page);
  await page
    .getByRole("button", { name: t("seasonEnd.next") })
    .first()
    .click();
  await expect(page.getByRole("status", { name: t("board.notice.firedTitle") })).toBeVisible();

  // Tudo daqui em diante só com foco e teclado.
  const career = page.getByRole("navigation", { name: t("nav.menu") }).getByRole("link", {
    name: new RegExp(t("nav.career")),
  });
  await career.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/carreira/);
  const offers = page.getByRole("tab", { name: new RegExp(`^${t("career.tab.offers")}`) });
  await offers.focus();
  await page.keyboard.press("Enter");
  const accept = page.getByRole("button", { name: t("career.offers.accept") }).first();
  await expect(accept).toBeVisible();
  await accept.focus();
  await expect(accept).toBeFocused();
  await page.keyboard.press("Enter");
  // O foco não se perde: vai ao título da tela, e o técnico passa a ter clube.
  await expect(page.getByRole("heading", { name: t("career.title") })).toBeFocused();
  await expect(page.getByRole("tab", { name: t("career.tab.board") })).toBeVisible();
  await page.getByRole("tab", { name: t("career.tab.board") }).click();
  await expect(page.getByRole("region", { name: t("board.goals") })).toBeVisible();
  expect(club).not.toBe("");
});
