import type { CareerSeasonState } from "../../src/career/season-state";
import { ensurePhaseDrawn } from "../../src/knockout/bracket";
import { cupEntry } from "../../src/knockout/history";
import { knockoutFormat, phaseRounds } from "../../src/knockout/rules";
import type { CompletedBank } from "../../src/model/types";
import { completeRound, finishRound, startRound } from "../../src/season/live-round";
import type { Season } from "../../src/season/types";

function ok<T extends { ok: boolean }>(result: T): Extract<T, { ok: true }> {
  if (!result.ok) throw new Error(JSON.stringify(result));
  return result as Extract<T, { ok: true }>;
}

/** Joga (direto) a próxima rodada da copa, sorteando a fase se preciso. */
export function playNextRound(world: CompletedBank, season: Season): Season {
  const format = knockoutFormat(world, season.competitionId);
  const rounds = phaseRounds(format);
  const phase = rounds.findIndex((list) => list.includes(season.nextRound));
  const drawn = ensurePhaseDrawn(season, world, phase);
  const started = ok(startRound(drawn, world));
  return ok(completeRound(drawn, world, finishRound(started.round))).season;
}

/** Joga a copa inteira (direto) e devolve a temporada final. */
export function playCup(world: CompletedBank, season: Season): Season {
  let current = season;
  while (current.nextRound <= current.calendar.length) current = playNextRound(world, current);
  return current;
}

/** Entrada de histórico da copa de um estado de carreira (a copa ainda sem virada). */
export function cupHistoryEntryOf(state: CareerSeasonState, competitionId: string) {
  const league = state.competitions.find((entry) => entry.competitionId === competitionId);
  return league ? cupEntry(league) : undefined;
}
