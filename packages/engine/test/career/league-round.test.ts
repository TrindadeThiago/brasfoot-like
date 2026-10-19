import { describe, expect, it } from "vitest";
import { divisionSeason, isLeagueSeasonOver, leagueRound } from "../../src/career/league";
import {
  advanceLeague,
  completeLeagueRound,
  startLeagueRound,
} from "../../src/career/league-round";
import type { LeagueSeason } from "../../src/career/types";
import { managerAutoLineup } from "../../src/lineup/auto";
import type { CompletedBank } from "../../src/model/types";
import {
  advanceRound,
  applyRoundChange,
  completeRound,
  finishRound,
  type LiveRound,
  matchOf,
} from "../../src/season/live-round";
import { bankDivision, editedWorld, newLeague, testWorld } from "./helpers";

function started(league: LeagueSeason, world: CompletedBank = testWorld()): LiveRound {
  const result = startLeagueRound(league, world);
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.round;
}

function completed(league: LeagueSeason, round: LiveRound): LeagueSeason {
  const result = completeLeagueRound(league, testWorld(), round);
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.league;
}

describe("rodada da liga (R2)", () => {
  it("monta uma única rodada com as 20 partidas, Série A primeiro", () => {
    const round = started(newLeague("rodada"));
    expect(round.round).toBe(1);
    expect(round.matches).toHaveLength(20);
    expect(round.matches.slice(0, 10).every((match) => match.divisionLevel === 1)).toBe(true);
    expect(round.matches.slice(10).every((match) => match.divisionLevel === 2)).toBe(true);
    const serieB = new Set(bankDivision(2));
    for (const match of round.matches.slice(10)) {
      expect(serieB.has(match.sides.home)).toBe(true);
      expect(serieB.has(match.sides.away)).toBe(true);
    }
  });

  it("fecha cada divisão exatamente como completeRound faria", () => {
    const league = newLeague("fechar");
    const round = finishRound(started(league));
    const next = completed(league, round);
    expect(leagueRound(next)).toBe(2);
    for (const level of [1, 2]) {
      const before = divisionSeason(league, level);
      if (!before) throw new Error("sem divisão");
      const own = {
        ...round,
        matches: round.matches.filter((match) => match.divisionLevel === level),
      };
      const alone = completeRound(before, testWorld(), own);
      expect(alone.ok).toBe(true);
      if (!alone.ok) return;
      expect(divisionSeason(next, level)).toEqual(alone.season);
      expect(divisionSeason(next, level)?.records).toHaveLength(10);
    }
  });

  it("advanceLeague usa o mesmo caminho da rodada ao vivo", () => {
    const league = newLeague("equivalencia");
    const live = completed(league, finishRound(advanceRound(started(league), 13)));
    const direct = advanceLeague(league, testWorld(), { rounds: 1 });
    expect(direct.ok).toBe(true);
    if (!direct.ok) return;
    expect(direct.league).toEqual(live);
  });

  it("usa a escalação externa de um clube da Série B", () => {
    const league = newLeague("escalacao-b");
    const serieB = divisionSeason(league, 2);
    const clubId = serieB?.calendar[0]?.fixtures[0]?.home;
    if (!serieB || !clubId) throw new Error("sem jogo");
    const squad = testWorld().players.filter((player) => player.clubId === clubId);
    const { lineup } = managerAutoLineup(squad, "4-3-3", "attacking", []);
    const result = startLeagueRound(league, testWorld(), { [clubId]: lineup });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const found = matchOf(result.round, clubId);
    expect(found?.match.divisionLevel).toBe(2);
    expect(found?.match.state.input[found.side].lineup).toEqual(lineup);
  });

  it("recusa escalação de clube que não joga a rodada", () => {
    const result = startLeagueRound(newLeague("fora"), testWorld(), {
      "clube-999": { formation: "4-4-2", posture: "balanced", starters: {}, bench: [] },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("season.lineup_not_playing");
  });

  it("a decisão do jogador só muda a partida dele", () => {
    const league = newLeague("decisao");
    const clubId = divisionSeason(league, 2)?.calendar[0]?.fixtures[0]?.home;
    if (!clubId) throw new Error("sem jogo");
    const at30 = advanceRound(started(league), 30);
    const changed = applyRoundChange(at30, clubId, { type: "posture", posture: "attacking" });
    expect(changed.ok).toBe(true);
    if (!changed.ok) return;
    const withDecision = completed(league, finishRound(changed.round));
    const without = completed(league, finishRound(at30));
    const others = (value: LeagueSeason) =>
      value.divisions
        .flatMap((season) => season.records)
        .filter((record) => record.home !== clubId && record.away !== clubId);
    expect(others(withDecision)).toEqual(others(without));
    expect(others(withDecision)).toHaveLength(19);
  });

  it("joga a temporada inteira das duas divisões", () => {
    const result = advanceLeague(newLeague("inteira"), testWorld(), { toEnd: true });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(isLeagueSeasonOver(result.league)).toBe(true);
    expect(leagueRound(result.league)).toBe(39);
    for (const season of result.league.divisions) {
      expect(season.nextRound).toBe(39);
      expect(season.records).toHaveLength(380);
    }
  }, 30000);

  it("com divisões de tamanhos diferentes, a mais curta termina antes", () => {
    const world = editedWorld((w) => {
      const serieB = w.competitions[0]?.divisions.find((division) => division.level === 2);
      if (serieB) serieB.clubIds = serieB.clubIds.slice(0, 18);
    });
    const league = newLeague("curta", {}, world);
    const result = advanceLeague(league, world, { rounds: 34 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(divisionSeason(result.league, 2)?.nextRound).toBe(35);
    expect(leagueRound(result.league)).toBe(35);
    expect(isLeagueSeasonOver(result.league)).toBe(false);
    const round35 = startLeagueRound(result.league, world);
    expect(round35.ok).toBe(true);
    if (!round35.ok) return;
    expect(round35.round.round).toBe(35);
    expect(round35.round.matches.every((match) => match.divisionLevel === 1)).toBe(true);
    const end = advanceLeague(result.league, world, { toEnd: true });
    expect(end.ok).toBe(true);
    if (!end.ok) return;
    expect(isLeagueSeasonOver(end.league)).toBe(true);
    expect(divisionSeason(end.league, 1)?.nextRound).toBe(39);
  }, 30000);
});
