import { seasonDate } from "../calendar/date";
import { clubDivision } from "../career/league";
import { deriveWage } from "../derived/economy";
import type { CompletedPlayer } from "../model/types";
import { createRng } from "../rng/xoshiro";
import { marketRules } from "./rules";
import type { MarketContext, PlayerResponse } from "./types";

const EXIGENCY_MAX = 90;

/** Atração do clube: reputação + bônus pela divisão (R7). */
export function attraction(context: MarketContext, clubId: string): number {
  const club = context.world.clubs.find((entry) => entry.id === clubId);
  const rules = marketRules(context.world, context.league.competitionId);
  const level = clubDivision(context.league, clubId)?.divisionLevel ?? 1;
  const bonuses = rules.player.divisionBonus;
  const bonus = bonuses[Math.min(level, bonuses.length) - 1] ?? 0;
  return (club?.reputation ?? 0) + bonus;
}

/** Exigência do atleta: cresce com a força (R7). */
export function exigency(player: Pick<CompletedPlayer, "strength">): number {
  return Math.min(EXIGENCY_MAX, Math.max(0, 2 * (player.strength - 50)));
}

/** Salário que o atleta pede para jogar no clube (múltiplo de 100). */
export function wageDemand(
  context: MarketContext,
  player: CompletedPlayer | (Omit<CompletedPlayer, "clubId" | "contract"> & { clubId?: string }),
  clubId: string,
  renewal = false,
): number {
  const club = context.world.clubs.find((entry) => entry.id === clubId);
  if (!club) return 0;
  const gap = Math.max(0, exigency(player) - attraction(context, clubId));
  const rng = createRng(
    `${context.careerSeed}:wage:${context.league.number}:${player.id}:${clubId}`,
  );
  const noise = rng.int(95, 105);
  const date = seasonDate(context.world.manifest.referenceDate, context.league.year);
  const base = deriveWage({ ...player, clubId } as CompletedPlayer, club, date);
  const demand = Math.round((base * (100 + gap) * noise) / 10_000 / 100) * 100;
  const current = renewal && "contract" in player ? (player.contract?.wage ?? 0) : 0;
  return Math.max(500, demand, current);
}

/** Resposta do atleta a uma proposta de salário (R7). */
export function respondToContract(
  context: MarketContext,
  player: CompletedPlayer | (Omit<CompletedPlayer, "clubId" | "contract"> & { clubId?: string }),
  clubId: string,
  wage: number,
  renewal = false,
): PlayerResponse {
  const rules = marketRules(context.world, context.league.competitionId);
  if (!renewal && attraction(context, clubId) < exigency(player) - rules.player.interestMargin) {
    return { kind: "refused", reason: "no_interest" };
  }
  const demand = wageDemand(context, player, clubId, renewal);
  if (wage >= demand) return { kind: "accepted" };
  if (wage * 100 >= demand * rules.player.demandThresholdPct) {
    return { kind: "demanded", wage: demand };
  }
  return { kind: "refused", reason: "low_wage" };
}
