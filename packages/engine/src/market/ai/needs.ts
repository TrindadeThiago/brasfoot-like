import { ageOn, seasonDate } from "../../calendar/date";
import { annualWageBill } from "../../finance/create";
import { POSITIONS, type Position } from "../../model/catalogs";
import type { CompletedPlayer } from "../../model/types";
import { SQUAD_RULES } from "../../renewal/rules";
import { squadOf } from "../../world/squads";
import { attraction } from "../player-response";
import type { MarketContext } from "../types";
import { aiMarketRules } from "./rules";

/** Titulares prováveis por posição (um 4-4-2 com volante): somam 11. */
export const STARTERS_BY_POSITION: Record<Position, number> = {
  GK: 1,
  FB: 2,
  CB: 2,
  DM: 1,
  MF: 3,
  FW: 2,
};

/** Posições acima de mínimo + esta folga estão em excesso. */
const IDEAL_SLACK = 2;
const VETERAN_AGE = 30;

export interface PositionNeed {
  count: number;
  min: number;
  max: number;
  /** Força do melhor da posição (0 se não há ninguém). */
  best: number;
  /** Força do pior titular provável da posição (0 se faltam titulares). */
  starter: number;
  uncovered: boolean;
  weak: boolean;
  excess: boolean;
}

export interface ClubNeeds {
  clubId: string;
  positions: Record<Position, PositionNeed>;
  /** Força-alvo pela ambição (R2). */
  target: number;
  meanAge: number;
  old: boolean;
  /** Caixa menos a reserva de salários; 0 em crise ou caixa insuficiente. */
  budget: number;
  /** Descobertas (maior falta primeiro), depois fracas (maior déficit primeiro). */
  priorities: Position[];
  /** Demais posições, da de titular mais fraco à mais forte (reforço oportunista). */
  upgrades: Position[];
  /** Jogadores excedentes, do menos útil ao mais útil. */
  surplus: string[];
}

/** Utilidade para manter no elenco: força, menos uma penalidade por idade acima de 30. */
export function squadUtility(player: CompletedPlayer, date: string): number {
  return player.strength - 2 * Math.max(0, ageOn(player.birthDate, date) - VETERAN_AGE);
}

/** Necessidades de um clube da IA (FR-001, FR-002, research.md R2). */
export function clubNeeds(context: MarketContext, clubId: string): ClubNeeds {
  const rules = aiMarketRules(context.world, context.league.competitionId);
  const date = seasonDate(context.world.manifest.referenceDate, context.league.year);
  const squad = squadOf(context.world, clubId);
  const target =
    rules.targetBase + (rules.targetPerAmbitionPct * attraction(context, clubId)) / 100;
  const positions = {} as Record<Position, PositionNeed>;
  for (const position of POSITIONS) {
    const strengths = squad
      .filter((player) => player.position === position)
      .map((player) => player.strength)
      .sort((a, b) => b - a);
    const min = SQUAD_RULES.positionMin[position];
    const max = rules.positionMax[position];
    const starter = strengths[STARTERS_BY_POSITION[position] - 1] ?? 0;
    positions[position] = {
      count: strengths.length,
      min,
      max,
      best: strengths[0] ?? 0,
      starter,
      uncovered: strengths.length < min,
      weak: starter < target - rules.weakGap,
      excess: strengths.length > min + IDEAL_SLACK || strengths.length > max,
    };
  }
  const meanAge =
    squad.length > 0
      ? squad.reduce((sum, player) => sum + ageOn(player.birthDate, date), 0) / squad.length
      : 0;
  const finance = context.finances.clubs[clubId];
  const reserve = Math.round(
    (annualWageBill(context.world, clubId, date) * rules.reserveMonths) / 12,
  );
  const budget = !finance || finance.inCrisis ? 0 : Math.max(0, finance.cash - reserve);
  const uncovered = POSITIONS.filter((position) => positions[position].uncovered).sort(
    (a, b) =>
      positions[b].min - positions[b].count - (positions[a].min - positions[a].count) ||
      POSITIONS.indexOf(a) - POSITIONS.indexOf(b),
  );
  const weak = POSITIONS.filter(
    (position) => !positions[position].uncovered && positions[position].weak,
  ).sort(
    (a, b) =>
      positions[a].starter - positions[b].starter || POSITIONS.indexOf(a) - POSITIONS.indexOf(b),
  );
  const upgrades = POSITIONS.filter(
    (position) => !positions[position].uncovered && !positions[position].weak,
  ).sort(
    (a, b) =>
      positions[a].starter - positions[b].starter || POSITIONS.indexOf(a) - POSITIONS.indexOf(b),
  );
  const surplus: string[] = [];
  for (const position of POSITIONS) {
    const need = positions[position];
    if (!need.excess) continue;
    const extra = need.count - Math.min(need.max, need.min + IDEAL_SLACK);
    const ordered = squad
      .filter((player) => player.position === position && !player.contract?.loan)
      .sort((a, b) => squadUtility(a, date) - squadUtility(b, date) || (a.id < b.id ? -1 : 1));
    surplus.push(...ordered.slice(0, extra).map((player) => player.id));
  }
  return {
    clubId,
    positions,
    target,
    meanAge,
    old: meanAge > rules.oldSquadAge,
    budget,
    priorities: [...uncovered, ...weak],
    upgrades,
    surplus,
  };
}
