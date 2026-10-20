import { ageOn, seasonDate } from "../calendar/date";
import { deriveWage } from "../derived/economy";
import type { CompletedPlayer } from "../model/types";
import type { FreeAgent, MarketContext, MarketResult, MarketRow, PlayerFilters } from "./types";
import { fail } from "./types";
import { marketValue } from "./value";

function rowOf(context: MarketContext, player: CompletedPlayer, date: string): MarketRow {
  const year = context.league.year;
  return {
    playerId: player.id,
    displayName: player.displayName,
    position: player.position,
    age: ageOn(player.birthDate, date),
    strength: player.strength,
    traits: player.traits,
    clubId: player.clubId,
    value: marketValue(player, context.world, year),
    wage: player.contract?.wage ?? 0,
    ...(player.contract ? { untilYear: player.contract.untilYear } : {}),
    onLoan: player.contract?.loan !== undefined,
    free: false,
  };
}

function freeRow(context: MarketContext, agent: FreeAgent, date: string): MarketRow {
  const { player } = agent;
  const club = context.world.clubs.find((entry) => entry.id === agent.lastClubId);
  const wage = club
    ? deriveWage({ ...player, clubId: agent.lastClubId } as CompletedPlayer, club, date)
    : 0;
  return {
    playerId: player.id,
    displayName: player.displayName,
    position: player.position,
    age: ageOn(player.birthDate, date),
    strength: player.strength,
    traits: player.traits,
    value: 0,
    wage,
    onLoan: false,
    free: true,
  };
}

function within(value: number, range?: [number, number]): boolean {
  return !range || (value >= range[0] && value <= range[1]);
}

function matches(row: MarketRow, filters: PlayerFilters): boolean {
  if (
    filters.positions &&
    filters.positions.length > 0 &&
    !filters.positions.includes(row.position)
  )
    return false;
  if (!within(row.strength, filters.strength) || !within(row.age, filters.age)) return false;
  if (filters.maxValue !== undefined && row.value > filters.maxValue) return false;
  if (filters.maxWage !== undefined && row.wage > filters.maxWage) return false;
  if (filters.contractUntilMax !== undefined) {
    if (row.untilYear === undefined || row.untilYear > filters.contractUntilMax) return false;
  }
  if (filters.excludeClubId !== undefined && row.clubId === filters.excludeClubId) return false;
  if (filters.text) {
    if (!row.displayName.toLowerCase().includes(filters.text.trim().toLowerCase())) return false;
  }
  return true;
}

/**
 * Busca no mercado (US1): jogadores de todos os clubes e livres, só com atributos visíveis.
 * Ordenação estável (desempate por id).
 */
export function searchPlayers(
  context: MarketContext,
  filters: PlayerFilters = {},
  sort?: { key: keyof MarketRow; dir: "asc" | "desc" },
): MarketRow[] {
  const date = seasonDate(context.world.manifest.referenceDate, context.league.year);
  const scope = filters.scope ?? "all";
  const rows: MarketRow[] = [];
  if (scope !== "free") {
    for (const player of context.world.players) rows.push(rowOf(context, player, date));
  }
  if (scope !== "clubs") {
    for (const agent of context.market.freeAgents) rows.push(freeRow(context, agent, date));
  }
  const found = rows.filter((row) => matches(row, filters));
  const key = sort?.key ?? "playerId";
  const sign = sort?.dir === "desc" ? -1 : 1;
  return found.sort((a, b) => {
    const left = a[key];
    const right = b[key];
    let order = 0;
    if (typeof left === "number" && typeof right === "number") order = left - right;
    else order = String(left ?? "").localeCompare(String(right ?? ""), "pt-BR");
    return sign * order || (a.playerId < b.playerId ? -1 : a.playerId > b.playerId ? 1 : 0);
  });
}

/** Comparação lado a lado de 2 a 4 jogadores (US1). */
export function comparePlayers(
  context: MarketContext,
  ids: readonly string[],
): MarketResult<MarketRow[]> {
  if (ids.length < 2 || ids.length > 4) return fail("market.invalid_amount");
  const rows = searchPlayers(context);
  const picked: MarketRow[] = [];
  for (const id of ids) {
    const row = rows.find((entry) => entry.playerId === id);
    if (!row) return fail("market.not_found");
    picked.push(row);
  }
  return { ok: true, value: picked };
}
