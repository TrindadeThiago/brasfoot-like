import { expect, type Locator, type Page, test } from "@playwright/test";
import { createCareer, simulate, skipTips, t } from "./helpers";

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

// 028 US5: abas do Mercado e das Finanças por setas, e o foco volta ao fechar modal e diálogo.
test("Mercado e Finanças: setas nas abas e foco devolvido ao fechar (028)", async ({ page }) => {
  test.setTimeout(120_000);
  await createCareer(page, "Ana Souza", 1);
  await page.keyboard.press("m");
  await expect(page).toHaveURL(/mercado/);
  const search = page.getByRole("tab", { name: new RegExp(`^${t("market.tab.search")}`) });
  await search.focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: new RegExp(`^${t("market.tab.negotiations")}`) }),
  ).toBeFocused();
  await page.keyboard.press("Home");
  await expect(search).toBeFocused();
  const name = page.getByRole("button", { name: /^Detalhes de / }).first();
  await name.focus();
  await page.keyboard.press("Enter");
  const modal = page.getByRole("dialog");
  await modal.getByRole("button", { name: t("market.action.offer") }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toHaveCount(2);
  await page.keyboard.press("Escape");
  await expect(modal.getByRole("button", { name: t("market.action.offer") })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(name).toBeFocused();

  await page.keyboard.press("6");
  await expect(page).toHaveURL(/financas/);
  const overview = page.getByRole("tab", { name: t("finance.tab.overview") });
  await overview.focus();
  await page.keyboard.press("End");
  await expect(page.getByRole("tab", { name: t("finance.tab.history") })).toBeFocused();
  await expectFocusVisible(page, "aba de finanças");
});

// 029: abas da Carreira e setas de rodada das Notícias só com o teclado, com foco visível.
test("Carreira e Notícias: setas nas abas, setas de rodada e foco visível (029)", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await createCareer(page, "Ana Souza", 1);
  await simulate(page, 2);
  const career = new URL(page.url()).searchParams.get("c") ?? "";
  await page.goto(`/jogo/carreira/?c=${career}`);
  const board = page.getByRole("tab", { name: t("career.tab.board") });
  await board.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: t("career.tab.fans") })).toBeFocused();
  await expectFocusVisible(page, "aba da carreira");
  await page.keyboard.press("End");
  await expect(page.getByRole("tab", { name: t("career.tab.coaches") })).toBeFocused();

  await page.goto(`/jogo/noticias/?c=${career}`);
  // Na rodada mais nova a seta "próxima" está desativada; a "anterior" recebe o foco e navega.
  await expect(page.getByRole("button", { name: t("news.next") })).toBeDisabled();
  const previous = page.getByRole("button", { name: t("news.prev") });
  await previous.focus();
  await expect(previous).toBeFocused();
  await expectFocusVisible(page, "seta de rodada");
  const select = page.getByRole("combobox", { name: t("news.select") });
  const latest = await select.inputValue();
  await page.keyboard.press("Enter");
  expect(await select.inputValue()).not.toBe(latest);
});

// 030 critério 1: substituir, trocar a posição de dois jogadores e voltar à rodada, só com o teclado.
// O substituto obrigatório (lesão ou goleiro expulso) não dá para provocar numa rodada real; a escolha
// do pendente e do reserva, também só pelo teclado, está nos testes de componente (`live-team.test.tsx`).
test("rodada ao vivo só com o teclado: substituir e trocar a posição de dois jogadores (030)", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await createCareer(page, "Ana Souza", 1);
  const play = page.getByRole("button", { name: t("home.playLive") });
  await play.focus();
  await page.keyboard.press("Enter");
  const mine = page.getByRole("region", { name: t("round.myMatch") });
  await expect(mine).toBeVisible();
  // A partida precisa ter começado para aceitar mudanças.
  await expect(mine.getByText(/^([5-9]|[1-9]\d)'$/)).toBeVisible({ timeout: 20_000 });

  const pause = page.getByRole("button", { name: t("round.pause") });
  await pause.focus();
  await page.keyboard.press("Enter");
  const panel = page.getByRole("region", { name: t("round.panel") });
  await expect(panel).toBeVisible();
  const onField = panel.getByRole("list").nth(0).getByRole("button");
  const bench = panel.getByRole("list").nth(1).getByRole("button");

  // Substituição: escolhe um titular (Enter) e um reserva (Enter).
  await onField.nth(2).focus();
  await expectFocusVisible(page, "titular do painel");
  await page.keyboard.press("Enter");
  await bench.first().focus();
  await page.keyboard.press("Enter");
  await expect(panel.getByText(t("round.substitutionsLeft", { used: 1, limit: 5 }))).toBeVisible();
  await expect(panel.getByRole("status")).toContainText("entrou no lugar de");

  // Troca de posição: dois titulares, sem gastar substituição.
  await onField.nth(3).focus();
  await page.keyboard.press("Enter");
  await onField.nth(4).focus();
  await page.keyboard.press("Enter");
  await expect(panel.getByRole("status")).toContainText("trocaram de posição");
  await expect(panel.getByText(t("round.substitutionsLeft", { used: 1, limit: 5 }))).toBeVisible();

  // Retomar pelo teclado: o painel some e o foco volta ao botão da barra de controle.
  const resume = page.getByRole("button", { name: t("round.resume") });
  await resume.focus();
  await page.keyboard.press("Enter");
  await expect(panel).toBeHidden();
  await expect(page.getByRole("button", { name: t("round.pause") })).toBeFocused();
});

// 032 US2 (FR-004): ordem de tabulação. Nenhuma tela usa `tabindex` positivo, e cada parada do Tab
// cai num elemento visível, dentro da janela na horizontal; o conteúdo (`main`) é alcançado depois da
// barra lateral e o foco não fica preso (a sequência anda).
test("ordem de tabulação sem tabindex positivo e sem paradas invisíveis nas telas de duas colunas (032)", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await createCareer(page, "Ana Souza", 1);
  const career = new URL(page.url()).searchParams.get("c") ?? "";
  for (const path of [
    "/jogo/",
    "/jogo/competicao/",
    "/jogo/carreira/",
    "/jogo/mercado/",
    "/jogo/noticias/",
    "/jogo/escalacao/",
  ]) {
    await page.goto(`${path}?c=${career}`);
    await expect(page.getByRole("navigation", { name: t("nav.menu") })).toBeVisible();
    expect(
      await page
        .locator("[tabindex]")
        .evaluateAll(
          (elements) =>
            elements.filter((element) => Number(element.getAttribute("tabindex")) > 0).length,
        ),
      `${path}: tabindex positivo`,
    ).toBe(0);
    const stops: string[] = [];
    let reachedMain = false;
    for (let index = 0; index < 60; index++) {
      await page.keyboard.press("Tab");
      const info = await page.evaluate(() => {
        const element = document.activeElement as HTMLElement | null;
        if (!element || element === document.body) return undefined;
        const box = element.getBoundingClientRect();
        return {
          id: `${element.tagName}:${(element.getAttribute("aria-label") ?? element.textContent ?? "").trim().slice(0, 24)}`,
          visible: box.width > 0 && box.height > 0,
          inside: box.right <= document.documentElement.clientWidth + 1 && box.left >= -1,
          inMain: Boolean(element.closest("main")),
        };
      });
      if (!info) continue;
      expect(info.visible, `${path}: parada invisível ${info.id}`).toBe(true);
      expect(info.inside, `${path}: parada fora da janela ${info.id}`).toBe(true);
      if (info.inMain) reachedMain = true;
      stops.push(info.id);
    }
    // Uma tela sem controles no conteúdo (Notícias antes da primeira manchete) não tem aonde chegar.
    const interactiveInMain = await page
      .locator("main a[href], main button, main input, main select, main [tabindex='0']")
      .count();
    if (interactiveInMain > 0) {
      expect(reachedMain, `${path}: o Tab não chegou ao conteúdo`).toBe(true);
    }
    expect(new Set(stops).size, `${path}: o foco anda`).toBeGreaterThan(5);
  }
});
