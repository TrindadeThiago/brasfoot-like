import { fitnessRules } from "../fitness/rules";
import { deciderFor } from "../knockout/tie";
import { advanceMatch, startMatch } from "../match/engine";
import { matchResult } from "../match/result";
import { summarizeMatch } from "../match/summary";
import type { Side } from "../match/types";
import type { CompletedBank } from "../model/types";
import type { SeasonError } from "./errors";
import { prepareFixture, squadsByClub } from "./fixture";
import { applyRoundResults, type RoundResult } from "./live-round";
import { toMatchRecord, toSummaryRecord } from "./record";
import type { Season, SeasonWarning } from "./types";

/**
 * Rodada da simulação resumida (020 R3): fecha a próxima rodada da temporada de uma só vez, sem
 * rodada ao vivo. Os jogos de mata-mata (com decisor: prorrogação e pênaltis) usam a simulação
 * completa; os demais, a resumida, com registro compacto. Os efeitos na temporada são os mesmos
 * da rodada completa. Não altera a entrada.
 */
export function playSummaryRound(
  season: Season,
  world: CompletedBank,
): { ok: true; season: Season } | { ok: false; error: SeasonError } {
  const round = season.calendar[season.nextRound - 1];
  if (!round) throw new Error("temporada encerrada");
  const squads = squadsByClub(world);
  const { drainPer90, penaltyBpPerPoint } = fitnessRules(world, season.competitionId);
  const fatigue = { drainPer90, penaltyBpPerPoint };
  const results: RoundResult[] = [];
  for (const fixture of round.fixtures) {
    const decider = fixture.tie ? deciderFor(world, season, fixture) : undefined;
    const prepared = prepareFixture(season, fixture, squads, undefined, decider, fatigue);
    if (!prepared.ok) return prepared;
    const { input, sides } = prepared.value;
    const absences = { home: sides.home.absences, away: sides.away.absences };
    const warnings = [sides.home.warning, sides.away.warning].filter(
      (warning): warning is SeasonWarning => warning !== undefined,
    );
    const playerSides: Record<string, Side> = {};
    for (const player of input.home.squad) playerSides[player.id] = "home";
    for (const player of input.away.squad) playerSides[player.id] = "away";
    if (fixture.tie) {
      const started = startMatch(input);
      if (!started.ok) {
        throw new Error(`escalação automática inválida: ${JSON.stringify(started.errors)}`);
      }
      const done = matchResult(advanceMatch(started.state, { toEnd: true }));
      results.push({
        record: toMatchRecord(
          fixture.round,
          fixture.home,
          fixture.away,
          done,
          playerSides,
          absences,
        ),
        warnings,
      });
      continue;
    }
    const result = summarizeMatch(input);
    const fullTime = Math.max(
      0,
      ...Object.values(result.players).map((line) => line.minutesPlayed),
    );
    const record = toMatchRecord(
      fixture.round,
      fixture.home,
      fixture.away,
      result,
      playerSides,
      absences,
    );
    results.push({
      record: toSummaryRecord(
        record,
        {
          home: Object.values(input.home.lineup.starters),
          away: Object.values(input.away.lineup.starters),
        },
        fullTime,
      ),
      warnings,
    });
  }
  return applyRoundResults(season, world, results);
}
