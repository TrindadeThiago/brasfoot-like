import type { Decider, Side } from "../match/types";
import type { CompletedBank } from "../model/types";
import type { Fixture, MatchRecord, Season } from "../season/types";
import { cupView } from "../stages/cup-view";
import { cupFormat, phaseOf } from "./rules";
import type { TieState } from "./types";

/** O registro da partida de uma fixture, se já foi jogada. */
function recordOf(season: Season, fixture: Fixture): MatchRecord | undefined {
  return season.records.find(
    (record) => record.round === fixture.round && record.home === fixture.home,
  );
}

/** Fixtures (pernas) do confronto, em ordem de rodada. */
function legsOf(season: Season, phaseIndex: number, tieId: string): Fixture[] {
  const phase = season.bracket?.phases[phaseIndex];
  if (!phase) throw new Error(`fase inexistente: ${phaseIndex}`);
  return phase.rounds.flatMap((round) =>
    (season.calendar[round - 1]?.fixtures ?? []).filter((fixture) => fixture.tie?.id === tieId),
  );
}

/** Situação do confronto, derivada dos registros da temporada (018 R5). */
export function tieState(season: Season, phaseIndex: number, tieId: string): TieState {
  const phase = season.bracket?.phases[phaseIndex];
  const tie = phase?.ties.find((entry) => entry.id === tieId);
  if (!phase || !tie) throw new Error(`confronto inexistente: ${tieId}`);
  const fixtures = legsOf(season, phaseIndex, tieId);
  const legs = (fixtures[0]?.tie?.legs ?? 1) as 1 | 2;
  const goals: Record<Side, number> = { home: 0, away: 0 };
  let played = 0;
  let last: MatchRecord | undefined;
  for (const fixture of fixtures) {
    const record = recordOf(season, fixture);
    if (!record) continue;
    played += 1;
    last = record;
    goals[fixture.home === tie.home ? "home" : "away"] += record.score.home;
    goals[fixture.home === tie.home ? "away" : "home"] += record.score.away;
  }
  const base: TieState = {
    id: tie.id,
    home: tie.home,
    away: tie.away,
    legs,
    played,
    goals,
    decided: false,
  };
  if (played < legs || !last) return base;
  let winner: string | undefined;
  let decidedBy: TieState["decidedBy"];
  if (last.decision) {
    winner = last.decision.winner === "home" ? last.home : last.away;
    decidedBy = last.decision.by;
  } else if (goals.home !== goals.away) {
    winner = goals.home > goals.away ? tie.home : tie.away;
    decidedBy = "aggregate";
  }
  if (!winner) return base;
  return {
    ...base,
    decided: true,
    winner,
    loser: winner === tie.home ? tie.away : tie.home,
    ...(decidedBy ? { decidedBy } : {}),
  };
}

/** Todos os confrontos da fase foram sorteados e decididos. */
export function phaseDecided(season: Season, phaseIndex: number): boolean {
  const phase = season.bracket?.phases[phaseIndex];
  if (!phase?.drawn) return false;
  return phase.ties.every((tie) => tieState(season, phaseIndex, tie.id).decided);
}

/** Vencedores dos confrontos já decididos da fase, na ordem do sorteio. */
export function phaseWinners(season: Season, phaseIndex: number): string[] {
  const phase = season.bracket?.phases[phaseIndex];
  if (!phase) return [];
  const winners: string[] = [];
  for (const tie of phase.ties) {
    const winner = tieState(season, phaseIndex, tie.id).winner;
    if (winner) winners.push(winner);
  }
  return winners;
}

/** Campeão e vice, quando a final foi decidida. */
export function cupChampion(
  season: Season,
): { championId: string; runnerUpId: string } | undefined {
  const phases = season.bracket?.phases ?? [];
  const last = phases.at(-1);
  const tie = last?.ties[0];
  if (!last || !tie) return undefined;
  const state = tieState(season, last.index, tie.id);
  if (!state.decided || !state.winner || !state.loser) return undefined;
  return { championId: state.winner, runnerUpId: state.loser };
}

/** Fase mais alta alcançada por clube: o campeão vale `phases.length`. */
export function cupReached(season: Season): Record<string, number> {
  const reached: Record<string, number> = {};
  for (const phase of season.bracket?.phases ?? []) {
    for (const tie of phase.ties) {
      for (const clubId of [tie.home, tie.away]) reached[clubId] = phase.index;
    }
  }
  const champion = cupChampion(season);
  if (champion) reached[champion.championId] = season.bracket?.phases.length ?? 0;
  return reached;
}

/**
 * Regra de decisão da partida (018 R5): só a última perna do confronto decide; traz os gols das
 * pernas anteriores do ponto de vista dos lados desta partida.
 */
export function deciderFor(
  world: Pick<CompletedBank, "competitions">,
  season: Season,
  fixture: Fixture,
): Decider | undefined {
  const info = fixture.tie;
  if (!info || info.leg !== info.legs) return undefined;
  // Numa divisão em fases o confronto vive no chaveamento da fase eliminatória (019 R3).
  const source: Season =
    fixture.stage && season.stages && !season.cupView
      ? cupView(season, world, fixture.stage.index)
      : season;
  const format = cupFormat(world, source);
  const phase = phaseOf(format, info.phase);
  const before: Decider["before"] = {
    home: { goals: 0, awayGoals: 0 },
    away: { goals: 0, awayGoals: 0 },
  };
  for (const earlier of legsOf(source, info.phase, info.id)) {
    if (earlier.round === fixture.round) continue;
    const record = recordOf(source, earlier);
    if (!record) continue;
    // Gols de cada clube na perna anterior, mapeados para o lado que ele ocupa agora.
    for (const side of ["home", "away"] as const) {
      const clubId = fixture[side];
      const wasHome = earlier.home === clubId;
      const scored = wasHome ? record.score.home : record.score.away;
      before[side].goals += scored;
      if (!wasHome) before[side].awayGoals += scored;
    }
  }
  return {
    before,
    awayGoals: phase.tiebreakers.includes("away-goals"),
    extraTime: phase.tiebreakers.includes("extra-time"),
  };
}
