import { ageOn, seasonDate } from "../calendar/date";
import { deriveWage } from "../derived/economy";
import type { Club, CompletedPlayer } from "../model/types";
import { marketRules } from "./rules";
import type { FreeAgent, MarketContext, MarketResult, MarketRow, PlayerFilters } from "./types";
import { fail } from "./types";
import { marketValueFor } from "./value";

/** Só um banco de vários países mostra o país nas linhas (020): os demais ficam como eram. */
function manyCountries(context: MarketContext): boolean {
  return new Set(context.world.competitions.map((entry) => entry.countryId)).size > 1;
}

/** O que as linhas precisam do mundo, resolvido uma vez (a lista tem dezenas de milhares de jogadores). */
interface RowKit {
  date: string;
  year: number;
  many: boolean;
  clubs: ReadonlyMap<string, Club>;
  rules: ReturnType<typeof marketRules>;
}

function kitOf(context: MarketContext): RowKit {
  const { world } = context;
  const year = context.league.year;
  return {
    date: seasonDate(world.manifest.referenceDate, year),
    year,
    many: manyCountries(context),
    clubs: new Map(world.clubs.map((club) => [club.id, club])),
    rules: marketRules(world, world.competitions[0]?.id ?? ""),
  };
}

function rowOf(kit: RowKit, player: CompletedPlayer): MarketRow {
  const country = kit.clubs.get(player.clubId)?.countryId;
  const owner = kit.clubs.get(player.contract?.loan?.fromClubId ?? player.clubId);
  return {
    ...(country !== undefined && kit.many ? { countryId: country } : {}),
    playerId: player.id,
    displayName: player.displayName,
    position: player.position,
    age: ageOn(player.birthDate, kit.date),
    strength: player.strength,
    traits: player.traits,
    clubId: player.clubId,
    value: marketValueFor(player, owner, kit.rules, kit.date, kit.year),
    wage: player.contract?.wage ?? 0,
    ...(player.contract ? { untilYear: player.contract.untilYear } : {}),
    onLoan: player.contract?.loan !== undefined,
    free: false,
  };
}

function freeRow(kit: RowKit, agent: FreeAgent): MarketRow {
  const { player } = agent;
  const club = kit.clubs.get(agent.lastClubId);
  const wage = club
    ? deriveWage({ ...player, clubId: agent.lastClubId } as CompletedPlayer, club, kit.date)
    : 0;
  return {
    ...(kit.many ? { countryId: player.nationalityId } : {}),
    playerId: player.id,
    displayName: player.displayName,
    position: player.position,
    age: ageOn(player.birthDate, kit.date),
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

function matches(row: MarketRow, filters: PlayerFilters, needle: string): boolean {
  if (filters.scope === "free" && !row.free) return false;
  if (filters.scope === "clubs" && row.free) return false;
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
  if (filters.countryId !== undefined && row.countryId !== filters.countryId) return false;
  if (needle && !row.displayName.toLowerCase().includes(needle)) return false;
  return true;
}

/**
 * Todas as linhas do mercado, sem filtro nem ordem: jogadores de todos os clubes e livres, só com
 * atributos visíveis. A tela guarda o resultado e filtra em cima dele, sem refazer a lista a cada
 * tecla (024: com 39 000 jogadores, montá-la leva uma fração de segundo).
 */
export function marketRows(context: MarketContext): MarketRow[] {
  const kit = kitOf(context);
  const rows: MarketRow[] = [];
  for (const player of context.world.players) rows.push(rowOf(kit, player));
  for (const agent of context.market.freeAgents) rows.push(freeRow(kit, agent));
  return rows;
}

/** Filtra e ordena linhas já montadas por `marketRows`. Ordenação estável (desempate por id). */
export function filterRows(
  rows: readonly MarketRow[],
  filters: PlayerFilters = {},
  sort?: { key: keyof MarketRow; dir: "asc" | "desc" },
): MarketRow[] {
  const needle = filters.text ? filters.text.trim().toLowerCase() : "";
  const found = rows.filter((row) => matches(row, filters, needle));
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

/**
 * Busca no mercado (US1): jogadores de todos os clubes e livres, só com atributos visíveis.
 * Ordenação estável (desempate por id).
 */
export function searchPlayers(
  context: MarketContext,
  filters: PlayerFilters = {},
  sort?: { key: keyof MarketRow; dir: "asc" | "desc" },
): MarketRow[] {
  return filterRows(marketRows(context), filters, sort);
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
