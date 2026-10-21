import { currentPosition, divisionExpectations, expectationOf } from "../board/goals";
import { clubDivision } from "../career/league";
import { standings } from "../season/standings";
import type { MatchRecord } from "../season/types";
import { idolEvents } from "./idols";
import { rivalryOf } from "./rivalries";
import { type FansRules, fansRules } from "./rules";
import type { FansContext, FansState, MoodBand, MoodChange, MoodFactor } from "./types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Faixa do humor pelos limites `bands` (research.md R3). */
export function moodBand(rules: FansRules, mood: number): MoodBand {
  const [furious, unhappy, neutral, happy] = rules.bands;
  if (mood < furious) return "furious";
  if (mood < unhappy) return "unhappy";
  if (mood <= neutral) return "neutral";
  if (mood <= happy) return "happy";
  return "euphoric";
}

/** Fator do humor no público: 1 no neutro, de 1 − swing a 1 + swing nos extremos (R5). */
export function gateMoodFactor(rules: FansRules, mood: number): number {
  return 1 + ((mood - 50) * rules.gateSwingPct) / 5000;
}

/** Multiplicador (×100) do resultado de um clássico: 100 + intensidade × derbyPct. */
export function derbyMultiplierPct(derbyPct: number, intensity: number | undefined): number {
  return intensity === undefined ? 100 : 100 + intensity * derbyPct;
}

/** Resultado do clube na rodada e a intensidade do clássico, se for um. */
export function roundResult(
  context: Pick<FansContext, "league" | "world">,
  clubId: string,
  round: number,
): { result: "win" | "draw" | "loss"; intensity?: number } | undefined {
  const season = clubDivision(context.league, clubId);
  const record = season?.records.find(
    (entry) => entry.round === round && (entry.home === clubId || entry.away === clubId),
  );
  if (!record) return undefined;
  const own = record.home === clubId ? record.score.home : record.score.away;
  const other = record.home === clubId ? record.score.away : record.score.home;
  const result = own > other ? "win" : own < other ? "loss" : "draw";
  const rivalry = rivalryOf(context.world, record.home, record.away);
  return rivalry ? { result, intensity: rivalry.intensity } : { result };
}

/** Fator de humor de um resultado, com o peso extra de clássico. */
export function resultFactor(
  rules: FansRules,
  played: { result: "win" | "draw" | "loss"; intensity?: number },
): { kind: MoodFactor; amount: number } {
  const base =
    played.result === "win" ? rules.win : played.result === "loss" ? -rules.loss : rules.draw;
  const amount = Math.trunc((base * derbyMultiplierPct(rules.derbyPct, played.intensity)) / 100);
  const kind: MoodFactor =
    played.intensity !== undefined
      ? played.result === "win"
        ? "derbyWin"
        : played.result === "loss"
          ? "derbyLoss"
          : "derbyDraw"
      : played.result;
  return { kind, amount };
}

/**
 * Mudança de humor da torcida do clube na rodada (research.md R4, R6): resultado (com peso de
 * clássico), distância da posição esperada ou volta ao neutro, e ídolos. Fica em [0, 100].
 */
/** Posição atual e expectativa de cada clube, calculadas uma vez por rodada. */
export interface TableSnapshot {
  position: Map<string, number>;
  expectation: Map<string, number>;
}

export function tableSnapshot(context: Pick<FansContext, "world" | "league">): TableSnapshot {
  const position = new Map<string, number>();
  const expectation = new Map<string, number>();
  for (const season of context.league.divisions) {
    for (const row of standings(season, context.world)) position.set(row.clubId, row.position);
    for (const [clubId, rank] of divisionExpectations(context, season.clubIds)) {
      expectation.set(clubId, rank);
    }
  }
  return { position, expectation };
}

export function moodChange(
  context: FansContext,
  clubId: string,
  round: number,
  snapshot?: TableSnapshot,
): MoodChange {
  const rules = fansRules(context.world, context.league.competitionId);
  const mood = context.fans.clubs[clubId]?.mood ?? rules.neutral;
  const factors: { kind: MoodFactor; amount: number }[] = [];
  const played = roundResult(context, clubId, round);
  if (played) factors.push(resultFactor(rules, played));
  if (played && round >= rules.checkFromRound) {
    const gap =
      (snapshot?.position.get(clubId) ?? currentPosition(context, clubId)) -
      (snapshot?.expectation.get(clubId) ?? expectationOf(context, clubId));
    const target =
      gap > 0
        ? rules.neutral - gap * rules.gapWeight
        : rules.neutral + Math.min(rules.aheadCap, -gap * rules.aheadWeight);
    const drift = Math.trunc((clamp(target, 0, 100) - mood) / rules.driftDivisor);
    factors.push({ kind: drift > 0 ? "aheadOfExpectation" : "belowExpectation", amount: drift });
  } else {
    factors.push({ kind: "calm", amount: Math.trunc((rules.neutral - mood) / rules.calmDivisor) });
  }
  const idols = idolEvents(context, clubId, round, rules.idolCount);
  if (idols.lost > 0) factors.push({ kind: "idolLost", amount: -idols.lost * rules.idolLoss });
  if (idols.signed > 0) {
    factors.push({ kind: "starSigned", amount: idols.signed * rules.starSigning });
  }
  const kept = factors.filter((factor) => factor.amount !== 0 || isResult(factor.kind));
  const total = kept.reduce((sum, factor) => sum + factor.amount, 0);
  const value = clamp(mood + total, 0, 100);
  return { season: context.league.number, round, delta: value - mood, value, factors: kept };
}

function isResult(kind: MoodFactor): boolean {
  return kind === "draw" || kind === "derbyDraw";
}

/** Humor de todos os clubes depois de uma rodada fechada (clubes em ordem de id). */
export function fansAfterRound(
  context: FansContext,
  round: number,
  managerClubId: string,
): FansState {
  const rules = fansRules(context.world, context.league.competitionId);
  const next = clone(context.fans);
  const clubIds = context.league.divisions.flatMap((season) => season.clubIds).sort();
  const snapshot = tableSnapshot(context);
  for (const clubId of clubIds) {
    const change = moodChange(context, clubId, round, snapshot);
    const club = next.clubs[clubId] ?? { mood: rules.neutral, recent: [] };
    club.mood = change.value;
    club.recent = clubId === managerClubId ? [...club.recent, change].slice(-rules.keepRecent) : [];
    next.clubs[clubId] = club;
  }
  return next;
}

/** Resultado de um jogo para um dos lados e a intensidade do clássico, se for um. */
export function matchResultFor(
  world: FansContext["world"],
  record: Pick<MatchRecord, "home" | "away" | "score">,
  clubId: string,
): { result: "win" | "draw" | "loss"; intensity?: number } {
  const own = record.home === clubId ? record.score.home : record.score.away;
  const other = record.home === clubId ? record.score.away : record.score.home;
  const result = own > other ? "win" : own < other ? "loss" : "draw";
  const rivalry = rivalryOf(world, record.home, record.away);
  return rivalry ? { result, intensity: rivalry.intensity } : { result };
}

/**
 * Humor depois dos jogos de outras competições num dia (017 FR-029): cada lado reage ao resultado,
 * com o peso de clássico, sem a deriva de tabela da liga principal. `round` é a rodada da liga
 * principal em que o dia cai (para a lista de motivos recentes). Não altera a entrada.
 */
export function fansAfterExtraMatches(
  context: FansContext,
  matches: readonly { record: MatchRecord }[],
  round: number,
  managerClubId: string,
): FansState {
  if (matches.length === 0) return context.fans;
  const rules = fansRules(context.world, context.league.competitionId);
  const next = clone(context.fans);
  for (const { record } of matches) {
    for (const clubId of [record.home, record.away]) {
      const club = next.clubs[clubId];
      if (!club) continue;
      const factor = resultFactor(rules, matchResultFor(context.world, record, clubId));
      const value = clamp(club.mood + factor.amount, 0, 100);
      if (clubId === managerClubId) {
        club.recent = [
          ...club.recent,
          {
            season: context.league.number,
            round,
            delta: value - club.mood,
            value,
            factors: [factor],
          },
        ].slice(-rules.keepRecent);
      }
      club.mood = value;
    }
  }
  return next;
}
