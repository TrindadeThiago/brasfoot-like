import type { LeagueSeason } from "../career/types";
import type { Season } from "../season/types";
import { cupChampion, cupReached, tieState } from "./tie";
import type { TieDecidedBy } from "./types";

/** Uma edição encerrada da copa, para o histórico (018 data-model.md). */
export interface CupHistoryEntry {
  number: number;
  year: number;
  competitionId: string;
  championId: string;
  runnerUpId: string;
  /** A final: mandante da ida, visitante da ida, placar do jogo e como foi decidida. */
  final: {
    home: string;
    away: string;
    score: { home: number; away: number };
    decidedBy: TieDecidedBy;
    shootout?: { home: number; away: number };
  };
  /** Fase mais alta alcançada por cada clube (o campeão vale `phases.length`). */
  reached: Record<string, number>;
}

/** A `Season` eliminatória de uma competição, se ela for uma copa. */
export function cupSeasonOf(league: LeagueSeason): Season | undefined {
  const season = league.divisions[0];
  return season?.bracket ? season : undefined;
}

/** Entrada de histórico da edição encerrada; undefined se a copa não terminou. */
export function cupEntry(league: LeagueSeason): CupHistoryEntry | undefined {
  const season = cupSeasonOf(league);
  const result = season ? cupChampion(season) : undefined;
  const phases = season?.bracket?.phases ?? [];
  const last = phases.at(-1);
  const tie = last?.ties[0];
  if (!season || !result || !last || !tie) return undefined;
  const state = tieState(season, last.index, tie.id);
  const record = season.records.find(
    (entry) => last.rounds.includes(entry.round) && entry.decision !== undefined,
  );
  return {
    number: league.number,
    year: league.year,
    competitionId: league.competitionId,
    championId: result.championId,
    runnerUpId: result.runnerUpId,
    final: {
      home: tie.home,
      away: tie.away,
      score: { home: state.goals.home, away: state.goals.away },
      decidedBy: state.decidedBy ?? "aggregate",
      ...(record?.decision?.shootout
        ? { shootout: record.decision.shootout.score as { home: number; away: number } }
        : {}),
    },
    reached: cupReached(season),
  };
}
