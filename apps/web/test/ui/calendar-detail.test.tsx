import { clubFixtures } from "@brasfoot-like/engine";
import { seasonStateOf } from "@brasfoot-like/save";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderApp } from "../helpers/app";
import { eachFixture, monthGrid } from "../helpers/calendar";
import { storedCareer } from "../helpers/career";

describe("calendário detalhado", () => {
  it("mostra gols e cartões do jogo disputado e abre o resumo", async () => {
    const { store, save } = await storedCareer(4);
    const played = clubFixtures(seasonStateOf(save), save.clubId).filter((f) => f.record);
    expect(played.length).toBeGreaterThan(0);
    const withGoal = played.find((fixture) =>
      fixture.record?.events.some((event) => event.type === "shot" && event.outcome === "goal"),
    );
    if (!withGoal?.record) throw new Error("nenhum jogo com gol nas 3 primeiras rodadas");
    const scorer = withGoal.record.events.find(
      (event) => event.type === "shot" && event.outcome === "goal",
    );
    if (scorer?.type !== "shot") throw new Error("sem gol");
    const scorerName = save.bank.players.find((p) => p.id === scorer.playerId)?.displayName ?? "";

    renderApp("/jogo/calendario?c=tela", store);
    await monthGrid();

    const user = userEvent.setup({ delay: null });
    // O painel do dia traz os gols e cartões; percorre os jogos até achar o gol e abre o resumo.
    let opened = false;
    await eachFixture(user, async ({ item }) => {
      if (!new RegExp(scorerName).test(item.textContent ?? "")) return undefined;
      const [button] = within(item).getAllByRole("button", { name: /^Ver resumo de / });
      if (!button) throw new Error("sem botão de resumo");
      await user.click(button);
      opened = true;
      return "stop";
    });
    expect(opened).toBe(true);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("article")).toBeTruthy();
  });

  it("jogo a disputar não tem botão de resumo", async () => {
    const { store, save } = await storedCareer(1);
    renderApp("/jogo/calendario?c=tela", store);
    await monthGrid();
    let summaries = 0;
    await eachFixture(userEvent.setup({ delay: null }), ({ item }) => {
      summaries += within(item).queryAllByRole("button", { name: /^Ver resumo de / }).length;
    });
    expect(summaries).toBe(0);
    expect(save.clubId).toBeTruthy();
  });
});
