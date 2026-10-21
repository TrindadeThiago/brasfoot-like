import type { DayMatch } from "../career/season-state";
import type { CompletedBank } from "../model/types";
import type { Season } from "../season/types";
import { knockoutFormat } from "./rules";
import { cupChampion, cupReached, tieState } from "./tie";

/** Fato de copa de um dia: eliminação ou título (fonte de torcida, diretoria e manchetes). */
export interface CupEvent {
  clubId: string;
  kind: "out" | "title";
  /** Fase em que o confronto foi decidido (0 = primeira). */
  phase: number;
  phases: number;
  /** Adversário do confronto (quem eliminou, ou o vice no título). */
  opponentId: string;
  /** Nível de divisão de cada lado na principal não é conhecido aqui; as manchetes o consultam. */
  tie: string;
}

/** Fim da copa: fase mais alta alcançada por clube e o total de fases. */
export interface CupEnd {
  competitionId: string;
  reached: Record<string, number>;
  phases: number;
  championId: string;
  runnerUpId: string;
}

/** Eliminações e título dos confrontos decididos nos jogos do dia (018 R13). */
export function cupEvents(
  world: Pick<CompletedBank, "competitions">,
  season: Season,
  matches: readonly DayMatch[],
): CupEvent[] {
  const events: CupEvent[] = [];
  const phases = knockoutFormat(world, season.competitionId).phases.length;
  for (const match of matches) {
    const info = match.fixture.tie;
    if (match.competitionId !== season.competitionId || !info || info.leg !== info.legs) continue;
    const state = tieState(season, info.phase, info.id);
    if (!state.decided || !state.winner || !state.loser) continue;
    events.push({
      clubId: state.loser,
      kind: "out",
      phase: info.phase,
      phases,
      opponentId: state.winner,
      tie: info.id,
    });
    if (info.phase === phases - 1) {
      events.push({
        clubId: state.winner,
        kind: "title",
        phase: info.phase,
        phases,
        opponentId: state.loser,
        tie: info.id,
      });
    }
  }
  return events;
}

/** A copa terminou neste dia? Devolve o desfecho. */
export function cupEnd(
  world: Pick<CompletedBank, "competitions">,
  season: Season,
  matches: readonly DayMatch[],
): CupEnd | undefined {
  const phases = knockoutFormat(world, season.competitionId).phases.length;
  const finalPlayed = matches.some(
    (match) =>
      match.competitionId === season.competitionId && match.fixture.tie?.phase === phases - 1,
  );
  const champion = cupChampion(season);
  if (!finalPlayed || !champion) return undefined;
  return {
    competitionId: season.competitionId,
    reached: cupReached(season),
    phases,
    championId: champion.championId,
    runnerUpId: champion.runnerUpId,
  };
}
