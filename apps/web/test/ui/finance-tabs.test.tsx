// 028 US4: Finanças em abas, com resumo fixo e gráficos (que só aparecem com dado conciliado).
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { t } from "../../src/i18n";
import { OverviewTab } from "../../src/ui/finance/OverviewTab";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { memoryRouter } from "../helpers/router";

beforeEach(() => {
  localStorage.clear();
  memoryRouter.reset("/jogo/financas?c=tela");
});

const tab = (key: string) => screen.getByRole("tab", { name: t(key) });

describe("Finanças em abas (028)", () => {
  it("tem o resumo fixo e as seis abas", async () => {
    const { store } = await storedCareer(6);
    renderApp("/jogo/financas?c=tela", store);
    const user = userEvent.setup({ delay: null });
    await screen.findByRole("tablist", { name: t("finance.tablist") });
    for (const key of ["overview", "flow", "gate", "stadium", "credit", "history"]) {
      expect(tab(`finance.tab.${key}`)).toBeDefined();
    }
    for (const label of [
      t("finance.balance"),
      t("finance.result"),
      t("finance.debt"),
      t("finance.capacity"),
    ]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    // O resumo continua à vista em qualquer aba.
    await user.click(tab("finance.tab.credit"));
    expect(screen.getByText(t("finance.result"))).toBeDefined();
  });

  it("a Visão geral mostra os gráficos de saldo e de receitas e despesas com resumo e legenda", async () => {
    const { store } = await storedCareer(6);
    renderApp("/jogo/financas?c=tela", store);
    await screen.findByRole("tablist", { name: t("finance.tablist") });
    const balance = await screen.findByRole("img", { name: /^Saldo de / });
    expect(balance).toBeDefined();
    expect(
      screen.getByRole("list", { name: /Legenda de Saldo ao longo da temporada/ }),
    ).toBeDefined();
    expect(
      screen.getByRole("table", { name: /Valores de Saldo ao longo da temporada/ }),
    ).toBeDefined();
    expect(screen.getByRole("img", { name: /com movimento; receitas de/ })).toBeDefined();
  });

  it("Receitas e despesas mostra as duas roscas com legenda de valor e percentual", async () => {
    const { store } = await storedCareer(6);
    renderApp("/jogo/financas?c=tela", store);
    const user = userEvent.setup({ delay: null });
    await screen.findByRole("tablist", { name: t("finance.tablist") });
    await user.click(tab("finance.tab.flow"));
    const origin = await screen.findByRole("table", { name: /Legenda de Receitas por origem/ });
    expect(within(origin).getAllByText(/%$/).length).toBeGreaterThan(0);
    expect(screen.getByRole("table", { name: /Legenda de Despesas por destino/ })).toBeDefined();
  });

  it("dado adulterado: o gráfico some e a aba mostra o aviso e a tabela dos valores", async () => {
    const { save } = await storedCareer(6);
    const tampered = {
      ...save,
      finances: {
        ...save.finances,
        ledger: [
          ...save.finances.ledger,
          {
            clubId: save.clubId,
            season: save.league.number,
            round: 1,
            category: "gate" as const,
            amount: 4321,
          },
        ],
      },
    };
    render(<OverviewTab save={tampered} />);
    expect(screen.queryByRole("img", { name: /^Saldo de / })).toBeNull();
    expect(screen.getByText(t("finance.chart.unavailable"))).toBeDefined();
    expect(
      screen.getByRole("region", { name: t("finance.season", { year: save.league.year }) }),
    ).toBeDefined();
  });

  it("Bilheteria sem jogos em casa mostra o estado vazio, sem gráfico", async () => {
    const { store } = await storedCareer(1);
    renderApp("/jogo/financas?c=tela", store);
    const user = userEvent.setup({ delay: null });
    await screen.findByRole("tablist", { name: t("finance.tablist") });
    await user.click(tab("finance.tab.gate"));
    expect(await screen.findByText(t("finance.games.empty"))).toBeDefined();
    expect(screen.queryByRole("img", { name: /jogos? em casa/ })).toBeNull();
  });

  it("Crédito sem dívida desativa Amortizar e Quitar e diz por quê", async () => {
    const { store } = await storedCareer(1);
    renderApp("/jogo/financas?c=tela", store);
    const user = userEvent.setup({ delay: null });
    await screen.findByRole("tablist", { name: t("finance.tablist") });
    await user.click(tab("finance.tab.credit"));
    expect(
      (screen.getByRole("button", { name: t("finance.credit.repay") }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: t("finance.credit.settle") }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(screen.getByText(t("finance.credit.noDebt"))).toBeDefined();
  });

  it("durante a rodada ao vivo as ações ficam travadas com o aviso escrito", async () => {
    const { store } = await storedCareer(1);
    renderApp("/jogo/financas?c=tela", store);
    await screen.findByRole("tablist", { name: t("finance.tablist") });
    expect(screen.queryByText(t("finance.liveLocked"))).toBeNull();
  });
});

describe("Bilheteria: competição e fase de cada jogo (028)", () => {
  it("a tabela traz competição e fase/rodada e o gráfico compara público e renda", async () => {
    const { store } = await storedCareer(6);
    renderApp("/jogo/financas?c=tela", store);
    const user = userEvent.setup({ delay: null });
    await screen.findByRole("tablist", { name: t("finance.tablist") });
    await user.click(tab("finance.tab.gate"));
    const games = await screen.findByRole("table", { name: t("finance.games.title") });
    const headers = within(games)
      .getAllByRole("columnheader")
      .map((header) => header.textContent?.replace(/[▲▼]/g, "").trim());
    expect(headers).toContain(t("finance.games.competition"));
    expect(headers).toContain(t("finance.games.phase"));
    expect(within(games).getAllByText(/^Rodada \d+$/).length).toBeGreaterThan(0);
    const list = screen.getByRole("list", { name: /Legenda de Público presente/ });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
  });
});
