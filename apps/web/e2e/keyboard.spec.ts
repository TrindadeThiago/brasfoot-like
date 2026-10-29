import { expect, type Locator, type Page, test } from "@playwright/test";
import { createCareer, skipTips, t } from "./helpers";

// 016 US4 (FR-019, SC-004): o fluxo principal inteiro só com o teclado, sempre vendo o foco.

/** O elemento em foco tem indicação visível (contorno ou anel). */
async function expectFocusVisible(page: Page, step: string): Promise<void> {
  const style = await page.evaluate(() => {
    const element = document.activeElement;
    if (!element || element === document.body) return undefined;
    const computed = getComputedStyle(element);
    return {
      outline: computed.outlineStyle,
      width: Number.parseFloat(computed.outlineWidth),
      shadow: computed.boxShadow,
    };
  });
  expect(style, step).toBeDefined();
  const visible =
    (style?.outline !== "none" && (style?.width ?? 0) >= 2) || (style?.shadow ?? "none") !== "none";
  expect(visible, `${step}: ${JSON.stringify(style)}`).toBe(true);
}

/** Tab até o alvo receber o foco, conferindo o foco visível a cada parada. */
async function tabTo(page: Page, target: Locator, step: string, max = 200): Promise<void> {
  await expect(target).toBeVisible();
  for (let index = 0; index < max; index++) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((element) => element === document.activeElement)) {
      await expectFocusVisible(page, step);
      return;
    }
  }
  throw new Error(`${step}: alvo não alcançado com Tab`);
}

for (const theme of ["dark", "light"] as const) {
  test(`fluxo principal só com o teclado, tema ${theme} (SC-004)`, async ({ page }) => {
    test.setTimeout(120_000);
    await skipTips(page);
    await page.addInitScript((value) => {
      const key = "brasfoot-like:preferences";
      const prefs = JSON.parse(localStorage.getItem(key) ?? "{}");
      localStorage.setItem(key, JSON.stringify({ ...prefs, theme: value }));
    }, theme);
    await page.goto("/");

    await tabTo(page, page.getByRole("link", { name: t("opening.newCareer") }), "nova carreira");
    await page.keyboard.press("Enter");

    await tabTo(page, page.getByLabel(t("newCareer.managerName")), "nome do técnico");
    await page.keyboard.type("Ana Souza");
    const table = page.getByRole("table", {
      name: t("newCareer.clubsCaption", { division: "Série A" }),
    });
    const row = table.locator("tbody tr").first();
    const club = (await row.getByRole("img").getAttribute("aria-label")) ?? "";
    await tabTo(page, row, "clube");
    await page.keyboard.press("Enter");
    await tabTo(page, page.getByRole("button", { name: t("newCareer.confirm") }), "confirmar");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: club })).toBeVisible();

    // Escalação pelo atalho, escalação automática, de volta ao início.
    await page.keyboard.press("3");
    await expect(page).toHaveURL(/\/jogo\/escalacao\//);
    await page.keyboard.press("a");
    await tabTo(page, page.getByRole("link", { name: t("nav.home") }), "início");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/jogo\/\?/);

    // Rodada direta pelo botão.
    await tabTo(page, page.getByRole("button", { name: t("home.simulate") }), "simular");
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("region", { name: t("home.lastRound", { round: 1 }) }),
    ).toBeVisible();

    // Tabela e mercado.
    await tabTo(page, page.getByRole("link", { name: t("nav.competition") }), "competição");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/jogo\/competicao\//);
    await expect(page.getByRole("table").first()).toBeVisible();
    await page.keyboard.press("m");
    await expect(page).toHaveURL(/\/jogo\/mercado\//);
    await page.keyboard.press("Tab");
    await expectFocusVisible(page, "mercado");

    // Sair do jogo e exportar a carreira.
    await tabTo(page, page.getByRole("link", { name: t("nav.opening") }), "menu inicial");
    await page.keyboard.press("Enter");
    await tabTo(page, page.getByRole("link", { name: t("opening.savedCareers") }), "carreiras");
    await page.keyboard.press("Enter");
    await tabTo(
      page,
      page.getByRole("button", { name: t("saves.exportLabel", { manager: "Ana Souza" }) }),
      "exportar",
    );
    const download = page.waitForEvent("download");
    await page.keyboard.press("Enter");
    expect((await download).suggestedFilename()).toMatch(/\.blsave$/);
  });
}

// 025 US4: o Tab percorre a barra lateral inteira, na ordem das telas, antes do conteúdo.
test("Tab percorre a barra lateral na ordem das telas e chega ao rodapé (025)", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await createCareer(page, "Ana Souza", 1);
  const keys = [
    "nav.home",
    "nav.squad",
    "nav.lineup",
    "nav.competition",
    "nav.calendar",
    "nav.finance",
    "nav.history",
    "nav.market",
    "nav.career",
    "nav.news",
    "nav.opening",
    "nav.settings",
  ];
  for (const key of keys) {
    await tabTo(page, page.getByRole("link", { name: new RegExp(`^${t(key)}`) }).first(), key);
  }
  await tabTo(page, page.getByRole("button", { name: t("nav.help") }), "atalhos");
});

// 026 US4: no Elenco, Enter no nome abre o modal, Esc fecha e o foco volta ao nome; as ações abrem
// o diálogo por cima e Esc fecha só ele.
test("Elenco: Enter no nome abre o modal do jogador e o foco volta ao fechar (026)", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await createCareer(page, "Ana Souza", 1);
  await page.keyboard.press("2");
  await expect(page).toHaveURL(/\/jogo\/elenco\//);
  const name = page.getByRole("button", { name: /^Detalhes de / }).first();
  await tabTo(page, name, "nome do jogador");
  await page.keyboard.press("Enter");
  const modal = page.getByRole("dialog");
  await expect(modal).toBeVisible();
  const sell = modal.getByRole("button", { name: /^Vender / });
  await tabTo(page, sell, "vender");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toHaveCount(2);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(sell).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(name).toBeFocused();
});

// 027 US5: cartões de competição por teclado e grade do calendário com setas.
test("Competição: Tab chega aos cartões; Calendário: setas movem entre os dias (027)", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await createCareer(page, "Ana Souza", 1);
  await page.keyboard.press("4");
  await expect(page).toHaveURL(/\/jogo\/competicao\//);
  await expect(page.getByRole("tab", { name: t("competition.mine") })).toBeVisible();
  await page.keyboard.press("5");
  await expect(page).toHaveURL(/\/jogo\/calendario\//);
  const grid = page.getByRole("table", { name: /^Calendário de / });
  await expect(grid).toBeVisible();
  const day = grid.locator('button[tabindex="0"]');
  await day.focus();
  const before = await day.getAttribute("data-date");
  await page.keyboard.press("ArrowRight");
  const after = await page.evaluate(() => document.activeElement?.getAttribute("data-date"));
  expect(after).toBeTruthy();
  expect(after).not.toBe(before);
  await expectFocusVisible(page, "dia do calendário");
  await page.keyboard.press("PageDown");
  await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible();
});
