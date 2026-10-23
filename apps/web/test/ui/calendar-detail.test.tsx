import { clubFixtures } from "@brasfoot-like/engine";
import { seasonStateOf } from "@brasfoot-like/save";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
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
    const table = await screen.findByRole("table");
    expect(
      within(table).getByRole("columnheader", { name: t("calendar.col.highlights") }),
    ).toBeTruthy();
    expect(within(table).getAllByText(new RegExp(scorerName)).length).toBeGreaterThan(0);

    const user = userEvent.setup({ delay: null });
    const [first] = within(table).getAllByRole("button", { name: /^Ver resumo de / });
    if (!first) throw new Error("sem botão de resumo");
    await user.click(first);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("article")).toBeTruthy();
  });

  it("jogo a disputar não tem botão de resumo", async () => {
    const { store, save } = await storedCareer(1);
    renderApp("/jogo/calendario?c=tela", store);
    const table = await screen.findByRole("table");
    expect(within(table).queryAllByRole("button", { name: /^Ver resumo de / })).toHaveLength(0);
    expect(save.clubId).toBeTruthy();
  });
});
