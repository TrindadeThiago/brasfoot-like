// 029 US1: a Carreira em abas e a aba Diretoria (metas com situação, confiança com nível e tendência).
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { unemployed, withPendingOffer, withRegionalGoal } from "../helpers/career-board";
import { memoryRouter } from "../helpers/router";

vi.setConfig({ testTimeout: 30000 });

beforeEach(() => {
  localStorage.clear();
  memoryRouter.reset("/jogo/carreira?c=tela");
});

const tab = (key: string) => screen.getByRole("tab", { name: new RegExp(`^${t(key)}`) });

describe("Carreira em abas (029)", () => {
  it("tem as cinco abas em Tabs e as setas movem entre elas", async () => {
    const { store } = await storedCareer(4);
    renderApp("/jogo/carreira?c=tela", store);
    const user = userEvent.setup({ delay: null });
    const list = await screen.findByRole("tablist", { name: t("career.tablist") });
    const names = within(list)
      .getAllByRole("tab")
      .map((entry) => entry.textContent);
    expect(names).toEqual([
      t("career.tab.board"),
      t("career.tab.fans"),
      t("career.tab.offers"),
      t("career.tab.history"),
      t("career.tab.coaches"),
    ]);
    tab("career.tab.board").focus();
    await user.keyboard("{ArrowRight}");
    expect(tab("career.tab.fans").getAttribute("aria-selected")).toBe("true");
    await user.keyboard("{End}");
    expect(tab("career.tab.coaches").getAttribute("aria-selected")).toBe("true");
  });

  it("?aba=offers abre a aba Propostas", async () => {
    const { store } = await storedCareer(4);
    memoryRouter.reset("/jogo/carreira?c=tela&aba=offers");
    renderApp("/jogo/carreira?c=tela&aba=offers", store);
    await screen.findByRole("tablist", { name: t("career.tablist") });
    expect(tab("career.tab.offers").getAttribute("aria-selected")).toBe("true");
  });

  it("a aba Propostas leva a contagem das propostas pendentes", async () => {
    const { store } = await storedCareer(4, withPendingOffer);
    renderApp("/jogo/carreira?c=tela", store);
    await screen.findByRole("tablist", { name: t("career.tablist") });
    expect(tab("career.tab.offers").textContent).toBe(`${t("career.tab.offers")} (1)`);
  });

  it("a dica de primeiro acesso encontra a barra de abas pela âncora", async () => {
    const { store } = await storedCareer(4);
    const { container } = renderApp("/jogo/carreira?c=tela", store);
    await screen.findByRole("tablist", { name: t("career.tablist") });
    const anchor = container.querySelector("[data-tip-anchor='board']");
    expect(anchor?.querySelector("[role='tablist']")).not.toBeNull();
  });
});

describe("Diretoria (029)", () => {
  it("cada meta tem a situação em texto e o símbolo fica fora da leitura", async () => {
    const { store } = await storedCareer(4);
    renderApp("/jogo/carreira?c=tela", store);
    const card = await screen.findByRole("region", { name: t("board.goals") });
    const items = within(card).getAllByRole("listitem");
    expect(items.length).toBeGreaterThanOrEqual(2);
    for (const item of items) {
      expect(item.textContent).toMatch(/Cumprindo|Em risco|Em andamento|Cumprida|Não cumprida/);
      for (const symbol of item.querySelectorAll("[aria-hidden='true']")) {
        expect(symbol.textContent).toMatch(/^[✓!…✕] ?$/);
      }
    }
  });

  it("a meta do estadual sem resultado está em andamento; decidida, cumprida ou não cumprida", async () => {
    const user = userEvent.setup({ delay: null });
    for (const [result, text] of [
      [undefined, t("board.status.inProgress")],
      ["met", t("board.status.met")],
      ["missed", t("board.status.missed")],
    ] as const) {
      localStorage.clear();
      memoryRouter.reset("/jogo/carreira?c=tela");
      const { store } = await storedCareer(4, (save) => withRegionalGoal(save, result));
      const { unmount } = renderApp("/jogo/carreira?c=tela", store);
      const card = await screen.findByRole("region", { name: t("board.goals") });
      expect(within(card).getByText(text)).toBeDefined();
      unmount();
      void user;
    }
  });

  it("a confiança mostra o valor, o nível e a tendência em texto e até três motivos com o efeito", async () => {
    const { store, save } = await storedCareer(6);
    const club = save.board.clubs[save.clubId];
    if (!club) throw new Error("sem diretoria");
    renderApp("/jogo/carreira?c=tela", store);
    const card = await screen.findByRole("region", { name: t("board.confidenceLabel") });
    expect(within(card).getByText(String(club.confidence))).toBeDefined();
    const level = club.confidence >= 60 ? "high" : club.confidence >= 30 ? "medium" : "low";
    expect(within(card).getByText(t("board.level", { level }))).toBeDefined();
    expect(within(card).getByText(/Em alta|Em queda|Estável/)).toBeDefined();
    const reasons = within(card).getAllByRole("listitem");
    expect(reasons.length).toBeGreaterThan(0);
    expect(reasons.length).toBeLessThanOrEqual(3);
  });

  it("as mudanças por rodada vêm da mais nova para a mais antiga, num quadro com nome", async () => {
    const { store, save } = await storedCareer(6);
    const club = save.board.clubs[save.clubId];
    renderApp("/jogo/carreira?c=tela", store);
    const region = await screen.findByRole("region", { name: t("board.history") });
    const rounds = within(region)
      .getAllByRole("listitem")
      .map((item) => Number(/Rodada (\d+)/.exec(item.textContent ?? "")?.[1]));
    expect(rounds).toEqual([...rounds].sort((a, b) => b - a));
    expect(rounds.length).toBe(club?.recent.length);
    expect(region.getAttribute("tabindex")).toBe("0");
  });

  it("mostra a reputação e, na carreira sem demissão, o aviso", async () => {
    const { store, save } = await storedCareer(4, (current) => ({
      ...current,
      board: { ...current.board, manager: { ...current.board.manager, noFiring: true } },
    }));
    renderApp("/jogo/carreira?c=tela", store);
    const card = await screen.findByRole("region", { name: t("board.goals") });
    expect(
      within(card).getByText(t("career.reputation", { value: save.board.manager.reputation })),
    ).toBeDefined();
    expect(within(card).getByText(t("board.noFiring"))).toBeDefined();
  });

  it("sem mudanças ainda: estado vazio nos motivos", async () => {
    const { store } = await storedCareer(1, (current) => {
      const clubId = current.board.manager.clubId as string;
      const club = current.board.clubs[clubId];
      if (!club) throw new Error("sem diretoria");
      return {
        ...current,
        board: {
          ...current.board,
          clubs: { ...current.board.clubs, [clubId]: { ...club, recent: [] } },
        },
      };
    });
    renderApp("/jogo/carreira?c=tela", store);
    const card = await screen.findByRole("region", { name: t("board.confidenceLabel") });
    expect(within(card).getByText(t("board.noReasons"))).toBeDefined();
  });

  it("clube desempregado: estado de desempregado com a reputação", async () => {
    const { store, save } = await storedCareer(4, unemployed);
    renderApp("/jogo/carreira?c=tela", store);
    expect(await screen.findByText(t("career.unemployed"))).toBeDefined();
    expect(
      screen.getByText(t("career.reputation", { value: save.board.manager.reputation })),
    ).toBeDefined();
    expect(screen.queryByRole("region", { name: t("board.goals") })).toBeNull();
  });
});
