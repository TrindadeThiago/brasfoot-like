import { describe, expect, it } from "vitest";
import { advanceLeague } from "../../src/career/league-round";
import { leagueCalendar } from "../../src/career/season-state";
import { DEFAULT_MARKET, marketRules } from "../../src/market/rules";
import {
  currentWindowEnd,
  isWindowOpen,
  nextWindowRound,
  roundsPlayed,
  transferWindows,
  windowDates,
} from "../../src/market/windows";
import { midSeasonRound } from "../../src/renewal/evolution";
import { competitionId, editedWorld } from "../career/helpers";
import { contractWorld, newLeague } from "./helpers";

const world = contractWorld();
const league = newLeague("janelas", {}, world);
const mid = midSeasonRound(league);

function after(rounds: number) {
  if (rounds === 0) return league;
  const result = advanceLeague(league, world, { rounds });
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.league;
}

describe("janelas de transferência (FR-006, R5)", () => {
  it("padrão: início e redor da rodada central", () => {
    expect(transferWindows(league, DEFAULT_MARKET)).toEqual([
      { fromRound: 0, toRound: 3 },
      { fromRound: mid - 1, toRound: mid + 2 },
    ]);
  });

  it("abre no início e fecha depois da quarta rodada", () => {
    expect(isWindowOpen(after(0), DEFAULT_MARKET)).toBe(true);
    expect(isWindowOpen(after(3), DEFAULT_MARKET)).toBe(true);
    expect(isWindowOpen(after(4), DEFAULT_MARKET)).toBe(false);
  });

  it("abre de novo no meio da temporada", () => {
    expect(isWindowOpen(after(mid - 2), DEFAULT_MARKET)).toBe(false);
    expect(isWindowOpen(after(mid - 1), DEFAULT_MARKET)).toBe(true);
    expect(isWindowOpen(after(mid + 2), DEFAULT_MARKET)).toBe(true);
    expect(isWindowOpen(after(mid + 3), DEFAULT_MARKET)).toBe(false);
  });

  it("próxima abertura e fim da janela atual", () => {
    expect(nextWindowRound(after(4), DEFAULT_MARKET)).toBe(mid - 1);
    expect(nextWindowRound(after(mid + 3), DEFAULT_MARKET)).toBeUndefined();
    expect(currentWindowEnd(after(1), DEFAULT_MARKET)).toBe(3);
    expect(currentWindowEnd(after(5), DEFAULT_MARKET)).toBeUndefined();
    expect(roundsPlayed(after(5))).toBe(5);
  });

  it("janelas do mod substituem o padrão", () => {
    const custom = editedWorld((draft) => {
      const competition = draft.competitions[0];
      if (competition) competition.market = { windows: [{ fromRound: 5, toRound: 6 }] };
    });
    const rules = marketRules(custom, competitionId(custom));
    expect(isWindowOpen(after(0), rules)).toBe(false);
    expect(isWindowOpen(after(5), rules)).toBe(true);
    expect(nextWindowRound(after(0), rules)).toBe(5);
  });
});

describe("datas das janelas (017 R8, FR-031, FR-032)", () => {
  const calendar = leagueCalendar(world, league);
  const id = competitionId(world);

  it("as janelas padrão abrem e fecham nas datas das rodadas da liga", () => {
    const windows = transferWindows(league, DEFAULT_MARKET);
    const [first, second] = windowDates(calendar, id, windows);
    // Primeira rodada: domingo 2027-01-03; a janela de início fecha ao jogar a 4ª rodada.
    expect(first).toEqual({ opensOn: "2027-01-01", closesOn: "2027-01-24" });
    expect(second?.opensOn).toBe(calendar.days[mid - 2]?.date);
    expect(second?.closesOn).toBe(calendar.days[mid + 2]?.date);
  });

  it("janelas de mod em rodadas da liga viram datas e continuam válidas", () => {
    const [window] = windowDates(calendar, id, [{ fromRound: 5, toRound: 8 }]);
    expect(window).toEqual({ opensOn: calendar.days[4]?.date, closesOn: calendar.days[8]?.date });
  });

  it("janela que passa da última rodada termina na última data da liga", () => {
    const [window] = windowDates(calendar, id, [{ fromRound: 30, toRound: 60 }]);
    expect(window?.closesOn).toBe(calendar.days.at(-1)?.date);
  });
});
