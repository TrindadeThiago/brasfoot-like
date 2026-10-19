import { seasonDate } from "../calendar/date";
import type { LeagueSeason } from "../career/types";
import type { CompletedBank } from "../model/types";
import { creditLine, repayLoan, setTicketPrice, startStadiumWorks, takeLoan } from "./actions";
import { annualWageBill } from "./create";
import { economyRules } from "./rules";
import type { FinanceState } from "./types";

/** Regras simples da IA (research.md R7). */
const REVIEW_EVERY = 4;
const RECENT_HOME_GAMES = 3;
const FULL = 0.95;
const EMPTY = 0.6;
const WORKS_OCCUPANCY = 0.9;
const PRICE_STEP_PCT = 10;
const RESERVE_MONTHS = 6;
/** Caixa acima de tantos meses de folha: o clube investe no estádio mesmo sem lotar. */
const RICH_MONTHS = 24;

/** Ocupação média dos últimos jogos em casa da temporada, ou nada sem jogos suficientes. */
function recentOccupancy(finances: FinanceState, clubId: string): number | undefined {
  const games = finances.gates.filter((gate) => gate.clubId === clubId).slice(-RECENT_HOME_GAMES);
  if (games.length < RECENT_HOME_GAMES) return undefined;
  return games.reduce((sum, gate) => sum + gate.attendance / gate.capacity, 0) / games.length;
}

function reviewPrice(
  finances: FinanceState,
  league: LeagueSeason,
  world: CompletedBank,
  clubId: string,
): FinanceState {
  const occupancy = recentOccupancy(finances, clubId);
  const price = finances.clubs[clubId]?.ticketPrice;
  if (occupancy === undefined || price === undefined) return finances;
  let next = price;
  if (occupancy > FULL)
    next = Math.max(price + 1, Math.round((price * (100 + PRICE_STEP_PCT)) / 100));
  else if (occupancy < EMPTY)
    next = Math.min(price - 1, Math.round((price * (100 - PRICE_STEP_PCT)) / 100));
  if (next === price) return finances;
  const { min, max } = economyRules(world, league.competitionId).priceRange;
  const result = setTicketPrice(
    finances,
    world,
    league.competitionId,
    clubId,
    Math.min(max, Math.max(min, next)),
  );
  return result.ok ? result.finances : finances;
}

function reviewWorks(
  finances: FinanceState,
  league: LeagueSeason,
  world: CompletedBank,
  clubId: string,
  reserve: number,
  rich: number,
): FinanceState {
  const club = finances.clubs[clubId];
  const occupancy = recentOccupancy(finances, clubId);
  if (!club || club.works || occupancy === undefined) return finances;
  if (occupancy <= WORKS_OCCUPANCY && club.cash <= rich) return finances;
  const rules = economyRules(world, league.competitionId);
  const affordable = rules.stadium.options
    .map((option, index) => ({ option, index }))
    .filter(
      ({ option }) =>
        club.cash - option.cost >= reserve &&
        club.capacity + option.seats <= rules.stadium.maxCapacity,
    )
    .sort((a, b) => b.option.seats - a.option.seats)[0];
  if (!affordable) return finances;
  const result = startStadiumWorks(finances, league, world, clubId, affordable.index);
  return result.ok ? result.finances : finances;
}

function reviewCredit(
  finances: FinanceState,
  league: LeagueSeason,
  world: CompletedBank,
  clubId: string,
  monthly: number,
  reserve: number,
): FinanceState {
  const club = finances.clubs[clubId];
  if (!club) return finances;
  if (club.cash < 0) {
    const { available } = creditLine(finances, league, world, clubId);
    const amount = Math.min(available, monthly - club.cash);
    if (amount <= 0) return finances;
    const result = takeLoan(finances, league, world, clubId, amount);
    return result.ok ? result.finances : finances;
  }
  if (club.debt > 0 && club.cash > reserve) {
    const result = repayLoan(finances, league, clubId, Math.min(club.debt, club.cash - reserve));
    return result.ok ? result.finances : finances;
  }
  return finances;
}

/**
 * Decisões dos clubes do computador (US7, FR-021), em ordem de id: a cada 4 rodadas revisam o
 * preço e as obras (com estádio cheio, ou com caixa acima de 24 meses de folha); toda rodada, o
 * crédito. O clube do jogador nunca é alterado.
 */
export function aiRoundReview(
  finances: FinanceState,
  league: LeagueSeason,
  world: CompletedBank,
  round: number,
  managerClubId: string,
  options: { prices?: boolean; works?: boolean } = {},
): FinanceState {
  const review = round > 0 && round % REVIEW_EVERY === 0;
  const prices = options.prices ?? review;
  const works = options.works ?? review;
  const date = seasonDate(world.manifest.referenceDate, league.year);
  let next = finances;
  for (const clubId of Object.keys(finances.clubs).sort()) {
    if (clubId === managerClubId) continue;
    const annual = annualWageBill(world, clubId, date);
    const monthly = Math.floor(annual / 12);
    const reserve = Math.floor((annual * RESERVE_MONTHS) / 12);
    if (prices) next = reviewPrice(next, league, world, clubId);
    if (works) {
      next = reviewWorks(
        next,
        league,
        world,
        clubId,
        reserve,
        Math.floor((annual * RICH_MONTHS) / 12),
      );
    }
    next = reviewCredit(next, league, world, clubId, monthly, reserve);
  }
  return next;
}
