import { seasonDate } from "../calendar/date";
import { deriveMarketValue } from "../derived/economy";
import type { Club, CompletedBank, CompletedPlayer } from "../model/types";
import { marketRules } from "./rules";
import type { MarketRules } from "./types";

/** Fator de contrato sobre o valor de mercado, em % (R4): último ano vale menos. */
export function contractValuePct(untilYear: number, year: number, rules: MarketRules): number {
  const remaining = untilYear - year + 1;
  if (remaining <= 1) return rules.lastYearValuePct;
  if (remaining === 2) return rules.twoYearsValuePct;
  return 100;
}

/**
 * Valor de mercado já com o clube dono, as regras e a data resolvidos: serve a quem calcula o valor de
 * milhares de jogadores (a busca do mercado), sem procurar o clube e montar as regras a cada um.
 */
export function marketValueFor(
  player: CompletedPlayer,
  owner: Club | undefined,
  rules: MarketRules,
  date: string,
  year: number,
): number {
  if (!owner) return 0;
  const base = deriveMarketValue(player, owner, date);
  const pct = player.contract ? contractValuePct(player.contract.untilYear, year, rules) : 100;
  return Math.max(1000, Math.round((base * pct) / 100 / 1000) * 1000);
}

/**
 * Valor de mercado de um jogador com clube: valor derivado (reputação do clube dono do contrato)
 * × fator do contrato (regras da competição do país do dono). Emprestado vale pelo clube de origem. Múltiplo de 1.000.
 */
export function marketValue(player: CompletedPlayer, world: CompletedBank, year: number): number {
  const ownerId = player.contract?.loan?.fromClubId ?? player.clubId;
  const club = world.clubs.find((entry) => entry.id === ownerId);
  if (!club) return 0;
  // As regras são as da competição do país do clube dono; sem país casado, as da primeira.
  const competition =
    world.competitions.find((entry) => entry.countryId === club.countryId) ?? world.competitions[0];
  const rules = marketRules(world, competition?.id ?? "");
  return marketValueFor(player, club, rules, seasonDate(world.manifest.referenceDate, year), year);
}
