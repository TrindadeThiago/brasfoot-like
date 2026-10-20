import { ageOn } from "../../calendar/date";
import type { TurnoverContext } from "../../career/types";
import type { CompletedPlayer } from "../../model/types";
import { SQUAD_RULES } from "../../renewal/rules";
import { marketRules } from "../rules";
import { aiMarketRules } from "./rules";

const STARTERS = 11;
const VETERAN_AGE = 31;
const PROSPECT_AGE = 23;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

/**
 * Renovar ou liberar por necessidade (011 R8): renova os importantes até a idade-limite, quem
 * cobre o mínimo da posição e as promessas; libera veteranos reservas caros. Devolve os ids
 * renovados.
 */
export function aiRenewalDecision(
  context: TurnoverContext,
  squad: readonly CompletedPlayer[],
  expiring: readonly CompletedPlayer[],
  date: string,
): Set<string> {
  const rules = marketRules(context.world, context.finished.competitionId);
  const ai = aiMarketRules(context.world, context.finished.competitionId);
  const byStrength = [...squad].sort((a, b) => b.strength - a.strength || (a.id < b.id ? -1 : 1));
  const rank = new Map(byStrength.map((player, index) => [player.id, index + 1]));
  const wageMedian = median(squad.map((player) => player.contract?.wage ?? 0));
  const keep = new Set<string>();
  for (const player of expiring) {
    const age = ageOn(player.birthDate, date);
    const position = rank.get(player.id) ?? Number.MAX_SAFE_INTEGER;
    const important = position <= rules.ai.renewTopN && age <= rules.ai.renewMaxAge;
    const prospect = age <= PROSPECT_AGE && player.hidden.potential >= ai.loanMinPotential;
    const costlyVeteran =
      age >= VETERAN_AGE && position > STARTERS && (player.contract?.wage ?? 0) > wageMedian;
    if ((important || prospect) && !costlyVeteran) keep.add(player.id);
  }
  const staying = (positionId: CompletedPlayer["position"]) =>
    squad.filter(
      (player) =>
        player.position === positionId && (!expiring.includes(player) || keep.has(player.id)),
    ).length;
  for (const player of [...expiring].sort(
    (a, b) => b.strength - a.strength || (a.id < b.id ? -1 : 1),
  )) {
    if (keep.has(player.id)) continue;
    if (staying(player.position) < SQUAD_RULES.positionMin[player.position]) keep.add(player.id);
  }
  return keep;
}
