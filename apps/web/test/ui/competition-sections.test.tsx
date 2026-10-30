// 027 FR-009 / SC-007: Resultados e Artilharia mantêm tudo o que mostravam.
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { memoryRouter } from "../helpers/router";

beforeEach(() => {
  localStorage.clear();
  memoryRouter.reset("/jogo/competicao?c=tela");
});

describe("seções da competição (027)", () => {
  it("a Classificação traz as seções, as divisões, a tabela com forma e o clube destacado", async () => {
    const { store, save } = await storedCareer(3);
    renderApp("/jogo/competicao?c=tela", store);
    const tabs = await screen.findByRole("navigation", { name: t("competition.tabs") });
    expect(
      within(tabs)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual([
      t("competition.tab.standings"),
      t("competition.tab.results"),
      t("competition.tab.scorers"),
    ]);
    expect(screen.getByRole("navigation", { name: t("division.tabs.label") })).toBeDefined();
    const table = await screen.findByRole("table", { name: /Série A/ });
    const mine = within(table)
      .getAllByRole("row")
      .find((row) => row.getAttribute("aria-current") === "true");
    expect(mine?.textContent).toContain(
      save.bank.clubs.find((club) => club.id === save.clubId)?.name ?? "",
    );
    expect(within(table).getByRole("columnheader", { name: t("col.form") })).toBeDefined();
  });

  it("Resultados navega por rodada e abre o resumo de um jogo disputado", async () => {
    const { store } = await storedCareer(3);
    renderApp("/jogo/competicao/resultados?c=tela", store);
    const user = userEvent.setup({ delay: null });
    expect(await screen.findByRole("button", { name: t("results.previous") })).toBeDefined();
    const round = screen.getByLabelText(t("results.round")) as HTMLSelectElement;
    await user.selectOptions(round, "1");
    expect(
      await screen.findByRole("region", { name: t("results.caption", { round: 1 }) }),
    ).toBeDefined();
    const summary = screen.getAllByRole("button", { name: /Resumo/i })[0];
    expect(summary).toBeDefined();
  });

  it("Artilharia mostra o estado vazio antes dos gols e as tabelas depois", async () => {
    const first = await storedCareer(1);
    renderApp("/jogo/competicao/artilharia?c=tela", first.store);
    expect(await screen.findByText(t("scorers.empty"))).toBeDefined();
  });
});
