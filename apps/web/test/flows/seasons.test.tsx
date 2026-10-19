import {
  advanceLeague,
  ageOn,
  divisionSeason,
  type LeagueSeason,
  nextComposition,
  standings,
} from "@brasfoot-like/engine";
import { initialLineup, type SaveFile, userDivisionLevel, userSeason } from "@brasfoot-like/save";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { loadSaved } from "../helpers/live";
import { memoryRouter } from "../helpers/router";
import { careerSave } from "../helpers/saves";

let finished: LeagueSeason | undefined;
/** Liga da carreira de teste jogada até o fim (o resultado não depende do clube do jogador). */
function finishedLeague(): LeagueSeason {
  if (!finished) {
    const save = careerSave("base");
    const played = advanceLeague(save.league, save.bank, { toEnd: true });
    if (!played.ok) throw new Error("falhou");
    finished = played.league;
  }
  return finished;
}

/** Carreira no fim da temporada com o clube escolhido. */
async function endOfSeason(clubId?: string) {
  return storedCareer(1, (save) => {
    const club = clubId ?? save.clubId;
    const league = structuredClone(finishedLeague());
    const next: SaveFile = { ...save, league, clubId: club };
    return { ...next, lineup: initialLineup(save.bank, userSeason(next), club) };
  });
}

function clubName(save: SaveFile, clubId: string): string {
  return save.bank.clubs.find((club) => club.id === clubId)?.name ?? clubId;
}

describe("virada de temporada no navegador (US2, US3)", () => {
  it("do resumo para a próxima temporada: ano + 1, rodada 1, divisão certa, idades + 1", async () => {
    const { store, save } = await endOfSeason();
    const view = renderApp("/jogo/fim-de-temporada?c=tela", store);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: t("seasonEnd.next") }));
    await waitFor(() => expect(memoryRouter.pathname()).toBe("/jogo"));

    const expectedLevel = nextComposition(save.league, save.bank).composition[1]?.includes(
      save.clubId,
    )
      ? 1
      : 2;
    const division = expectedLevel === 1 ? "Série A" : "Série B";
    expect(
      await screen.findByText(t("header.progress", { year: 2028, round: 1, total: 38, division })),
    ).toBeDefined();

    const saved = await loadSaved(store);
    expect(saved.league.number).toBe(2);
    expect(saved.history).toHaveLength(1);
    expect(userDivisionLevel(saved)).toBe(expectedLevel);
    expect(standings(userSeason(saved), saved.bank).every((row) => row.played === 0)).toBe(true);

    memoryRouter.push("/jogo/elenco?c=tela");
    const player = saved.bank.players.find((entry) => entry.clubId === saved.clubId);
    if (!player) throw new Error("sem jogador");
    const row = (await screen.findAllByRole("row")).find((entry) =>
      entry.textContent?.includes(player.displayName),
    );
    const age = ageOn(player.birthDate, "2028-01-01");
    expect(age).toBe(ageOn(player.birthDate, "2027-01-01") + 1);
    expect(within(row as HTMLElement).getByText(String(age))).toBeDefined();

    view.unmount();
    renderApp("/jogo?c=tela", store);
    expect(
      await screen.findByText(t("header.progress", { year: 2028, round: 1, total: 38, division })),
    ).toBeDefined();
  }, 60_000);

  it("o resumo mostra os campeões, os 4 que sobem e os 4 que descem", async () => {
    const { store, save } = await endOfSeason();
    renderApp("/jogo/fim-de-temporada?c=tela", store);
    for (const [level, division] of [
      [1, "Série A"],
      [2, "Série B"],
    ] as const) {
      const season = divisionSeason(save.league, level);
      if (!season) throw new Error("sem divisão");
      const leader = standings(season, save.bank)[0]?.clubId ?? "";
      const region = await screen.findByRole("region", {
        name: t("seasonEnd.champion", { division }),
      });
      expect(within(region).getByText(clubName(save, leader))).toBeDefined();
    }
    const moves = nextComposition(save.league, save.bank);
    const up = screen.getByRole("region", {
      name: t("seasonEnd.promotedTo", { division: "Série A" }),
    });
    const down = screen.getByRole("region", {
      name: t("seasonEnd.relegatedTo", { division: "Série B" }),
    });
    expect(within(up).getAllByRole("listitem")).toHaveLength(4);
    expect(within(down).getAllByRole("listitem")).toHaveLength(4);
    for (const clubId of moves.promoted[2] ?? []) {
      expect(within(up).getByText(new RegExp(clubName(save, clubId)))).toBeDefined();
    }
    for (const clubId of moves.relegated[1] ?? []) {
      expect(within(down).getByText(new RegExp(clubName(save, clubId)))).toBeDefined();
    }
  }, 60_000);

  it.each([
    ["rebaixado", "relegated", 1],
    ["promovido", "promoted", 2],
  ] as const)(
    "destaca o clube %s e N começa a próxima temporada",
    async (_label, situation, level) => {
      const moves = nextComposition(finishedLeague(), careerSave("base").bank);
      const clubId = (situation === "relegated" ? moves.relegated[1] : moves.promoted[2])?.[0];
      if (!clubId) throw new Error("sem clube");
      const { store, save } = await endOfSeason(clubId);
      renderApp("/jogo/fim-de-temporada?c=tela", store);
      const season = divisionSeason(save.league, level);
      const position =
        standings(season as NonNullable<typeof season>, save.bank).find(
          (row) => row.clubId === clubId,
        )?.position ?? 0;
      expect(
        await screen.findByText(
          t(`seasonEnd.mine.${situation}`, {
            club: clubName(save, clubId),
            position,
            division: situation === "relegated" ? "Série B" : "Série A",
          }),
        ),
      ).toBeDefined();
      const user = userEvent.setup();
      await user.keyboard("n");
      await waitFor(() => expect(memoryRouter.pathname()).toBe("/jogo"));
      const saved = await loadSaved(store);
      expect(userDivisionLevel(saved)).toBe(situation === "relegated" ? 2 : 1);
    },
    60_000,
  );
});
