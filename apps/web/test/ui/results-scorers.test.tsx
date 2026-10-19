import { topScorers } from "@brasfoot-like/engine";
import { userSeason } from "@brasfoot-like/save";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { memoryRouter } from "../helpers/router";

describe("resultados e artilharia (US5)", () => {
  it("abas da competição levam às três seções", async () => {
    const { store } = await storedCareer(3);
    renderApp("/jogo/competicao?c=tela", store);
    const tabs = await screen.findByRole("navigation", { name: t("competition.tabs") });
    const user = userEvent.setup();
    await user.click(within(tabs).getByRole("link", { name: t("competition.tab.results") }));
    expect(memoryRouter.pathname()).toBe("/jogo/competicao/resultados");
    await user.click(
      within(await screen.findByRole("navigation", { name: t("competition.tabs") })).getByRole(
        "link",
        {
          name: t("competition.tab.scorers"),
        },
      ),
    );
    expect(memoryRouter.pathname()).toBe("/jogo/competicao/artilharia");
  });

  it("mostra os 10 jogos da última rodada, abre o resumo e marca rodadas futuras", async () => {
    const { store, save } = await storedCareer(6);
    renderApp("/jogo/competicao/resultados?c=tela", store);
    const region = await screen.findByRole("region", { name: t("results.caption", { round: 5 }) });
    const items = within(region).getAllByRole("listitem");
    expect(items).toHaveLength(10);
    const record = userSeason(save).records.find((entry) => entry.round === 5);
    expect(items[0]?.textContent).toContain(`${record?.score.home} × ${record?.score.away}`);
    const user = userEvent.setup();
    await user.click(within(items[0] as HTMLElement).getByRole("button"));
    expect(within(screen.getByRole("dialog")).getByRole("article")).toBeDefined();
    await user.keyboard("{Escape}");
    await user.selectOptions(screen.getByLabelText(t("results.round")), "20");
    const future = screen.getByRole("region", { name: t("results.caption", { round: 20 }) });
    expect(within(future).getAllByText(t("results.notPlayed"))).toHaveLength(10);
  });

  it("artilharia igual aos números das partidas, com o clube do jogador destacado", async () => {
    const { store, save } = await storedCareer(8);
    renderApp("/jogo/competicao/artilharia?c=tela", store);
    const table = await screen.findByRole("table", { name: t("scorers.goals") });
    const rows = within(within(table).getAllByRole("rowgroup")[1] as HTMLElement).getAllByRole(
      "row",
    );
    const expected = topScorers(userSeason(save), 20).filter((row) => row.goals > 0);
    expect(rows).toHaveLength(expected.length);
    const first = expected[0];
    const name = save.bank.players.find((player) => player.id === first?.playerId)?.displayName;
    const cells = within(rows[0] as HTMLElement).getAllByRole("cell");
    expect(cells[0]?.textContent).toBe(name);
    expect(cells[2]?.textContent).toBe(String(first?.goals));
    const mine = expected.filter((row) => row.clubId === save.clubId).length;
    expect(rows.filter((row) => row.getAttribute("aria-current") === "true")).toHaveLength(mine);
  });
});
