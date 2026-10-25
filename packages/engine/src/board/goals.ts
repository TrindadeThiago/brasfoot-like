import { seasonDate } from "../calendar/date";
import {
  clubDivision,
  divisionZones,
  isLeagueSeasonOver,
  leagueRound,
  leagueTotalRounds,
} from "../career/league";
import type { LeagueSeason } from "../career/types";
import { annualWageBill } from "../finance/create";
import type { CompletedBank } from "../model/types";
import { clubStrength } from "../season/credibility";
import { standings } from "../season/standings";
import { boardRules } from "./rules";
import type { BoardContext, FinanceGoalKind, GoalProgress, GoalTierId, SeasonGoals } from "./types";

/** Nível de meta e a posição que ele exige; `competitionId` só na meta de classificação (021). */
export interface GoalTier {
  tier: GoalTierId;
  position: number;
  competitionId?: string;
}

/** Rodadas já jogadas na temporada da liga. */
export function playedRounds(league: LeagueSeason): number {
  return isLeagueSeasonOver(league) ? leagueTotalRounds(league) : leagueRound(league) - 1;
}

/**
 * Níveis possíveis na divisão, do mais ao menos exigente, cada um com a posição exigida (R4).
 * Níveis que exigiriam a mesma posição de um mais exigente são descartados.
 */
export function goalTiersFor(
  world: CompletedBank,
  league: LeagueSeason,
  level: number,
): GoalTier[] {
  const season = league.divisions.find((entry) => entry.divisionLevel === level);
  const size = season?.clubIds.length ?? 0;
  const zones = divisionZones(world, league.competitionId, level);
  const rules = boardRules(world, league.competitionId);
  const candidates: GoalTier[] = [{ tier: "title", position: 1 }];
  if (zones.promotion > 0) candidates.push({ tier: "promotion", position: zones.promotion });
  candidates.push({ tier: "top4", position: 4 });
  candidates.push({ tier: "topHalf", position: Math.ceil(size / 2) });
  if (zones.relegation > 0) {
    candidates.push({ tier: "avoidRelegation", position: size - zones.relegation });
  } else {
    candidates.push({ tier: "avoidBottom", position: size - rules.bottomSlots });
  }
  // Vagas em outras competições (021): uma meta "classificar para X" por destino, no lugar que a
  // posição pede entre os níveis existentes (que seguem na ordem de antes).
  for (const zone of zones.berths) {
    const at = candidates.findIndex((entry) => entry.position > zone.to);
    candidates.splice(at < 0 ? candidates.length : at, 0, {
      tier: "qualify",
      position: zone.to,
      competitionId: zone.competitionId,
    });
  }
  const tiers: GoalTier[] = [];
  for (const candidate of candidates) {
    const last = tiers.at(-1);
    if (candidate.position < 1 || candidate.position > size) continue;
    if (last && candidate.position <= last.position) continue;
    tiers.push(candidate);
  }
  return tiers;
}

function expectationScore(world: CompletedBank, clubId: string, repPct: number): number {
  const reputation = world.clubs.find((club) => club.id === clubId)?.reputation ?? 0;
  return Math.floor(clubStrength(world, clubId) * 100) + reputation * repPct;
}

/** Posto do clube na divisão pela força do elenco e reputação (1 = maior expectativa). */
export function expectationOf(context: Pick<BoardContext, "world" | "league">, clubId: string) {
  const season = clubDivision(context.league, clubId);
  if (!season) return 1;
  const { expectationRepPct } = boardRules(context.world, context.league.competitionId);
  const scores = season.clubIds.map((id) => ({
    id,
    score: expectationScore(context.world, id, expectationRepPct),
  }));
  const own = scores.find((entry) => entry.id === clubId);
  if (!own) return 1;
  return (
    1 +
    scores.filter(
      (entry) => entry.score > own.score || (entry.score === own.score && entry.id < clubId),
    ).length
  );
}

/** Expectativa de todos os clubes de uma divisão numa passada (mesma regra de `expectationOf`). */
export function divisionExpectations(
  context: Pick<BoardContext, "world" | "league">,
  clubIds: readonly string[],
): Map<string, number> {
  const { expectationRepPct } = boardRules(context.world, context.league.competitionId);
  const ranked = clubIds
    .map((id) => ({ id, score: expectationScore(context.world, id, expectationRepPct) }))
    .sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return new Map(ranked.map((entry, index) => [entry.id, index + 1]));
}

/** Posição atual do clube na classificação da sua divisão. */
export function currentPosition(
  context: Pick<BoardContext, "world" | "league">,
  clubId: string,
): number {
  const season = clubDivision(context.league, clubId);
  if (!season) return 1;
  return standings(season, context.world).find((row) => row.clubId === clubId)?.position ?? 1;
}

function tierFor(tiers: readonly GoalTier[], required: number): GoalTier {
  const found = tiers.find((entry) => entry.position >= required);
  const fallback = tiers.at(-1);
  if (found) return found;
  if (!fallback) return { tier: "title", position: 1 };
  return fallback;
}

/** Meta financeira pela situação do caixa (R6). */
function financeGoalFor(
  context: Pick<BoardContext, "world" | "league" | "finances">,
  clubId: string,
): { kind: FinanceGoalKind; startCash: number } {
  const club = context.finances.clubs[clubId];
  if (!club) return { kind: "noCrisis", startCash: 0 };
  const rules = boardRules(context.world, context.league.competitionId);
  const date = seasonDate(context.world.manifest.referenceDate, context.league.year);
  const monthly = Math.floor(annualWageBill(context.world, clubId, date) / 12);
  let kind: FinanceGoalKind = "noCrisis";
  if (club.cash < 0 || club.inCrisis) kind = "nonNegativeCash";
  else if (club.cash < rules.tightMonths * monthly) kind = "keepCash";
  return { kind, startCash: club.cash };
}

/**
 * Metas da temporada do clube (R4–R6). No meio da temporada, a posição exigida se aproxima da
 * posição atual na proporção das rodadas jogadas.
 */
export function seasonGoals(
  context: Pick<BoardContext, "world" | "league" | "finances">,
  clubId: string,
  coachReputation: number,
  options: { midSeason?: boolean } = {},
): SeasonGoals {
  const rules = boardRules(context.world, context.league.competitionId);
  const season = clubDivision(context.league, clubId);
  const tiers = goalTiersFor(context.world, context.league, season?.divisionLevel ?? 1);
  const expectation = expectationOf(context, clubId);
  const slack = Math.max(
    0,
    rules.slackBase - Math.floor((coachReputation * rules.slackPerRepPct) / 100),
  );
  let required = expectation + slack;
  const played = playedRounds(context.league);
  const total = leagueTotalRounds(context.league);
  const midSeason = options.midSeason === true && played > 0;
  if (midSeason) {
    const current = currentPosition(context, clubId);
    required = Math.round(required + ((current - required) * played) / total);
  }
  const chosen = tierFor(tiers, required);
  return {
    season: context.league.number,
    round: played,
    sport: {
      tier: chosen.tier,
      position: chosen.position,
      expectation,
      ...(midSeason ? { midSeason: true } : {}),
      ...(chosen.competitionId ? { competitionId: chosen.competitionId } : {}),
    },
    finance: financeGoalFor(context, clubId),
  };
}

/** Meta financeira cumprida agora (no fim da temporada, cumprida de vez). */
export function financeMet(
  context: Pick<BoardContext, "finances">,
  clubId: string,
  goals: SeasonGoals,
): boolean {
  const club = context.finances.clubs[clubId];
  if (!club) return true;
  switch (goals.finance.kind) {
    case "nonNegativeCash":
      return club.cash >= 0;
    case "keepCash":
      return club.cash >= goals.finance.startCash;
    case "noCrisis":
      return (
        !club.inCrisis &&
        !context.finances.crises.some(
          (crisis) =>
            crisis.clubId === clubId &&
            crisis.startSeason === goals.season &&
            crisis.startRound > goals.round,
        )
      );
  }
}

/** Andamento das metas do clube (FR-011), ou nada se o clube não tem metas. */
export function goalProgress(
  context: Pick<BoardContext, "world" | "league" | "finances" | "board">,
  clubId: string,
): GoalProgress | undefined {
  const goals = context.board.clubs[clubId]?.goals;
  if (!goals || goals.season !== context.league.number) return undefined;
  const current = currentPosition(context, clubId);
  const club = context.finances.clubs[clubId];
  return {
    sport: {
      tier: goals.sport.tier,
      required: goals.sport.position,
      current,
      met: current <= goals.sport.position,
      ...(goals.sport.competitionId ? { competitionId: goals.sport.competitionId } : {}),
    },
    finance: {
      kind: goals.finance.kind,
      met: financeMet(context, clubId, goals),
      cash: club?.cash ?? 0,
      startCash: goals.finance.startCash,
      inCrisis: club?.inCrisis ?? false,
    },
  };
}
