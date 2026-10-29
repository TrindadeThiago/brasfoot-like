// 028 US2: as quatro abas do Mercado (e o resumo da janela), com a contagem do que pede resposta.
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { marketTab } from "../helpers/market";
import { memoryRouter } from "../helpers/router";

vi.setConfig({ testTimeout: 30000 });

beforeEach(() => {
  localStorage.clear();
  memoryRouter.reset("/jogo/mercado?c=tela");
});

describe("abas do Mercado (028)", () => {
  it("tem Buscar, Negociações, Propostas recebidas, Contratos e o Resumo da janela, em Tabs", async () => {
    const { store } = await storedCareer(1);
    renderApp("/jogo/mercado?c=tela", store);
    await screen.findByRole("tablist", { name: t("market.tablist") });
    const names = screen.getAllByRole("tab").map((tab) => tab.textContent ?? "");
    for (const key of [
      "market.tab.search",
      "market.tab.negotiations",
      "market.tab.incoming",
      "market.tab.contracts",
      "market.tab.report",
    ]) {
      expect(names.some((name) => name.startsWith(t(key)))).toBe(true);
    }
  });

  it("Contratos traz a contagem dos que terminam a temporada, em texto no nome da aba", async () => {
    const { store, save } = await storedCareer(1, (career) => ({
      ...career,
      bank: {
        ...career.bank,
        players: career.bank.players.map((player, index) =>
          player.clubId === career.clubId &&
          index % 2 === 0 &&
          player.contract &&
          !player.contract.loan
            ? { ...player, contract: { ...player.contract, untilYear: career.league.year } }
            : player,
        ),
      },
    }));
    const expiring = save.bank.players.filter(
      (player) =>
        player.clubId === save.clubId &&
        !player.contract?.loan &&
        (player.contract?.untilYear ?? 0) <= save.league.year,
    ).length;
    renderApp("/jogo/mercado?c=tela", store);
    await screen.findByRole("tablist", { name: t("market.tablist") });
    expect(marketTab("market.tab.contracts").textContent).toBe(
      `${t("market.tab.contracts")} (${expiring})`,
    );
  });

  it("Contratos lista o elenco com a ação de renovar e o emprestado não renova", async () => {
    const { store } = await storedCareer(1);
    renderApp("/jogo/mercado?c=tela", store);
    const user = userEvent.setup({ delay: null });
    await screen.findByRole("tablist", { name: t("market.tablist") });
    await user.click(marketTab("market.tab.contracts"));
    const table = await screen.findByRole("table", { name: t("market.contracts.caption") });
    expect(
      within(table).getAllByRole("button", { name: t("market.action.renew") }).length,
    ).toBeGreaterThan(0);
  });

  it("?aba=report abre o resumo da janela", async () => {
    const { store } = await storedCareer(1);
    memoryRouter.reset("/jogo/mercado?c=tela&aba=report");
    renderApp("/jogo/mercado?c=tela&aba=report", store);
    await screen.findByRole("tablist", { name: t("market.tablist") });
    expect(marketTab("market.tab.report").getAttribute("aria-selected")).toBe("true");
  });

  it("Propostas recebidas: 'Ver detalhes' abre o jogador pedido, sem comparação", async () => {
    const { store, save } = await storedCareer(1, (career) => {
      const player = career.bank.players.find((entry) => entry.clubId === career.clubId);
      const buyer = career.bank.clubs.find((club) => club.id !== career.clubId);
      if (!player || !buyer) throw new Error("sem jogador");
      return {
        ...career,
        market: {
          ...career.market,
          nextSeq: 2,
          incoming: [
            {
              id: "off-0001",
              playerId: player.id,
              fromClubId: buyer.id,
              fee: 1_000_000,
              kind: "buy",
              expiresRound: 3,
            },
          ],
        },
      };
    });
    const name = save.bank.players.find(
      (entry) => entry.id === save.market.incoming[0]?.playerId,
    )?.displayName;
    renderApp("/jogo/mercado?c=tela", store);
    const user = userEvent.setup({ delay: null });
    await screen.findByRole("tablist", { name: t("market.tablist") });
    await user.click(marketTab("market.tab.incoming"));
    await user.click(
      await screen.findByRole("button", {
        name: t("market.incoming.detailsOf", { name: name ?? "" }),
      }),
    );
    const modal = await screen.findByRole("dialog", { name: name ?? "" });
    expect(within(modal).queryByRole("button", { name: t("market.modal.addCompare") })).toBeNull();
    expect(within(modal).queryByRole("button", { name: t("market.action.offer") })).toBeNull();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("Contratos: clicar no atleta abre os detalhes, e Renovar não abre o modal", async () => {
    const { store } = await storedCareer(1);
    renderApp("/jogo/mercado?c=tela", store);
    const user = userEvent.setup({ delay: null });
    await screen.findByRole("tablist", { name: t("market.tablist") });
    await user.click(marketTab("market.tab.contracts"));
    const table = await screen.findByRole("table", { name: t("market.contracts.caption") });
    await user.click(
      within(table).getAllByRole("button", { name: t("market.action.renew") })[0] as HTMLElement,
    );
    expect(await screen.findByRole("dialog", { name: /^Renovar|renov/i })).toBeDefined();
    await user.keyboard("{Escape}");
    await user.click(
      within(table).getAllByRole("button", { name: /^Detalhes de / })[0] as HTMLElement,
    );
    const modal = await screen.findByRole("dialog");
    expect(within(modal).getByText(t("player.contract"))).toBeDefined();
  });

  it("Movimentações da temporada são paginadas de 10 em 10", async () => {
    const { store } = await storedCareer(1, (career) => ({
      ...career,
      market: {
        ...career.market,
        log: Array.from({ length: 23 }, (_, index) => ({
          season: career.league.year,
          round: 1,
          playerId: `p-${index}`,
          displayName: `Jogador ${index}`,
          kind: "buy",
          fee: 1000 + index,
          fromClubId: career.clubId,
          toClubId:
            career.bank.clubs.find((club) => club.id !== career.clubId)?.id ?? career.clubId,
        })),
      },
    }));
    renderApp("/jogo/mercado?c=tela", store);
    const user = userEvent.setup({ delay: null });
    await screen.findByRole("tablist", { name: t("market.tablist") });
    await user.click(marketTab("market.tab.negotiations"));
    const log = await screen.findByRole("region", { name: t("market.log.title") });
    expect(within(log).getAllByRole("listitem")).toHaveLength(10);
    await user.click(within(log).getByRole("button", { name: t("pager.next") }));
    await user.click(within(log).getByRole("button", { name: t("pager.next") }));
    expect(within(log).getAllByRole("listitem")).toHaveLength(3);
  });
});
