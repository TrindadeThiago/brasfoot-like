import { advanceLeague, type SeasonHistoryEntry } from "@brasfoot-like/engine";
import { advanceCareerSeason, type SaveFile } from "@brasfoot-like/save";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { memoryRouter } from "../helpers/router";

/** Carreira depois de `seasons` temporadas simuladas pelo pacote save. */
function afterSeasons(save: SaveFile, seasons: number): SaveFile {
  let current = save;
  for (let index = 0; index < seasons; index++) {
    const played = advanceLeague(current.league, current.bank, { toEnd: true });
    if (!played.ok) throw new Error("falhou");
    const turned = advanceCareerSeason({ ...current, league: played.league }, current.savedAt);
    if (!turned.ok) throw new Error("falhou");
    current = turned.save;
  }
  return current;
}

function bodyRows(table: HTMLElement): HTMLElement[] {
  return within(within(table).getAllByRole("rowgroup")[1] as HTMLElement).getAllByRole("row");
}

function nameOf(save: SaveFile, clubId: string): string {
  return save.bank.clubs.find((club) => club.id === clubId)?.name ?? clubId;
}

describe("histórico (US5)", () => {
  it("primeira temporada: nenhuma temporada encerrada", async () => {
    const { store } = await storedCareer(1);
    renderApp("/jogo/historico?c=tela", store);
    expect(await screen.findByText(t("history.empty"))).toBeDefined();
  });

  it("três temporadas: uma linha por temporada, igual ao histórico, e o detalhe", async () => {
    const { store, save } = await storedCareer(1, (career) => afterSeasons(career, 3));
    expect(save.history).toHaveLength(3);
    renderApp("/jogo?c=tela", store);
    const user = userEvent.setup();
    await screen.findByRole("region", { name: t("home.nextMatch") });
    await user.keyboard("h");
    expect(memoryRouter.pathname()).toBe("/jogo/historico");
    const table = await screen.findByRole("table", { name: t("history.caption") });
    const rows = bodyRows(table);
    expect(rows).toHaveLength(3);
    const newestFirst = [...save.history].reverse();
    rows.forEach((row, index) => {
      const entry = newestFirst[index] as SeasonHistoryEntry;
      expect(row.textContent).toContain(t("history.season", { year: entry.year }));
      for (const division of entry.divisions) {
        expect(row.textContent).toContain(nameOf(save, division.championId));
      }
      const mine = entry.divisions
        .flatMap((division) =>
          division.standings.map((item) => ({ level: division.level, row: item })),
        )
        .find((item) => item.row.clubId === save.clubId);
      expect(row.textContent).toContain(
        t("history.myClub", {
          position: mine?.row.position ?? 0,
          division: mine?.level === 1 ? "Série A" : "Série B",
        }),
      );
    });

    const oldest = save.history[0] as SeasonHistoryEntry;
    await user.click(screen.getByRole("link", { name: t("history.open", { year: oldest.year }) }));
    expect(memoryRouter.searchParams().get("t")).toBe("1");
    for (const [level, division] of [
      [1, "Série A"],
      [2, "Série B"],
    ] as const) {
      const detail = await screen.findByRole("table", {
        name: t("history.standings", { division, year: oldest.year }),
      });
      const expected = oldest.divisions.find((item) => item.level === level);
      const detailRows = bodyRows(detail);
      expect(detailRows).toHaveLength(20);
      expect(detailRows[0]?.textContent).toContain(nameOf(save, expected?.championId ?? ""));
    }
  }, 120_000);
});
