import { clubDivision } from "../career/league";
import { releaseManagerClub } from "../market/release";
import type { MarketState } from "../market/types";
import type { Rng } from "../rng/xoshiro";
import { clubReputation, hireCoach, nextId, releaseCoach } from "./coaches";
import { playedRounds, seasonGoals } from "./goals";
import { closeStint, openStint, seasonRecord } from "./history";
import { type BoardRules, boardRules } from "./rules";
import type { BoardContext, BoardError, BoardState, JobOffer, Vacancy } from "./types";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Clube compatível com a reputação do técnico (R10). Empregado, só clubes de reputação maior que
 * a do clube atual o chamam.
 */
export function compatibleClub(
  rules: BoardRules,
  managerReputation: number,
  reputation: number,
  currentClubReputation?: number,
): boolean {
  if (reputation < managerReputation - rules.lowerMargin) return false;
  if (reputation > managerReputation + rules.upperMargin) return false;
  return currentClubReputation === undefined || reputation > currentClubReputation;
}

export function pendingOffers(board: BoardState): JobOffer[] {
  return board.offers.filter((offer) => offer.status === "pending");
}

function blockedBy(board: BoardState, clubId: string, season: number): boolean {
  const fired = board.manager.firedBy;
  return board.manager.clubId === clubId || (fired?.clubId === clubId && fired.season === season);
}

/** Cria a proposta da vaga ao jogador. Altera o rascunho. */
export function createOffer(
  board: BoardState,
  context: Omit<BoardContext, "board">,
  vacancy: Vacancy,
): JobOffer {
  const rules = boardRules(context.world, context.league.competitionId);
  const played = playedRounds(context.league);
  const offer: JobOffer = {
    id: nextId(board, "offer"),
    clubId: vacancy.clubId,
    season: context.league.number,
    round: played,
    expiresRound: played + rules.offerRounds,
    goals: seasonGoals(context, vacancy.clubId, board.manager.reputation, { midSeason: true }),
    status: "pending",
  };
  board.offers.push(offer);
  vacancy.offerId = offer.id;
  return offer;
}

/** Sorteio de proposta ao jogador para as vagas ainda não consideradas (R10). Altera o rascunho. */
export function considerVacancies(
  board: BoardState,
  context: Omit<BoardContext, "board">,
  rng: Rng,
): void {
  const rules = boardRules(context.world, context.league.competitionId);
  const current =
    board.manager.clubId !== null ? clubReputation(context.world, board.manager.clubId) : undefined;
  const vacancies = [...board.vacancies]
    .filter((vacancy) => !vacancy.considered)
    .sort((a, b) => (a.clubId < b.clubId ? -1 : a.clubId > b.clubId ? 1 : 0));
  for (const vacancy of vacancies) {
    vacancy.considered = true;
    if (blockedBy(board, vacancy.clubId, context.league.number)) continue;
    if (pendingOffers(board).length >= rules.maxOpenOffers) continue;
    const reputation = clubReputation(context.world, vacancy.clubId);
    if (!compatibleClub(rules, board.manager.reputation, reputation, current)) continue;
    if (rng.int(1, 100) > rules.offerChancePct) continue;
    createOffer(board, context, vacancy);
  }
}

/** Propostas vencidas expiram e liberam a vaga para a IA. Altera o rascunho. */
export function expireOffers(board: BoardState, season: number, played: number): void {
  for (const offer of pendingOffers(board)) {
    if (offer.season === season && played <= offer.expiresRound) continue;
    offer.status = "expired";
    for (const vacancy of board.vacancies) {
      if (vacancy.offerId === offer.id) delete vacancy.offerId;
    }
  }
}

/** Guarda só as propostas pendentes e as da temporada atual. Altera o rascunho. */
export function pruneOffers(board: BoardState, season: number): void {
  board.offers = board.offers.filter(
    (offer) => offer.status === "pending" || offer.season === season,
  );
}

function offerError(code: BoardError["code"], offerId: string) {
  return { ok: false as const, error: { code, params: { offerId } } };
}

export type AcceptResult =
  | { ok: true; board: BoardState; market: MarketState; previousClubId?: string }
  | { ok: false; error: BoardError };

/**
 * Aceita a proposta (FR-027): o jogador assume o clube a partir da próxima rodada, com metas de
 * meio de temporada e confiança neutra; as demais propostas são descartadas; o clube deixado
 * ganha um técnico da IA na hora e o mercado dele é liberado.
 */
export function acceptJobOffer(
  context: BoardContext & { market: MarketState },
  offerId: string,
  rng: Rng,
): AcceptResult {
  const offer = context.board.offers.find((entry) => entry.id === offerId);
  if (!offer) return offerError("board.offer_not_found", offerId);
  if (offer.status !== "pending") return offerError("board.offer_expired", offerId);
  const rules = boardRules(context.world, context.league.competitionId);
  const board = clone(context.board);
  const base = { world: context.world, league: context.league, finances: context.finances };
  const scope = { ...base, careerSeed: context.careerSeed };
  const at = { season: context.league.number, round: playedRounds(context.league) };
  const previous = board.manager.clubId;
  let market = context.market;
  if (previous !== null) {
    board.history.seasons.push(seasonRecord(scope, board, previous));
    closeStint(board, at, "offerAccepted");
    hireCoach(board, scope, previous, rng);
    market = releaseManagerClub(
      { ...base, market, managerClubId: previous, careerSeed: context.careerSeed },
      previous,
    );
  } else {
    closeStint(board, at);
  }
  for (const entry of board.offers) {
    if (entry.status !== "pending") continue;
    entry.status = entry.id === offerId ? "accepted" : "declined";
  }
  for (const vacancy of board.vacancies) {
    if (vacancy.offerId !== undefined && vacancy.offerId !== offerId) delete vacancy.offerId;
  }
  board.vacancies = board.vacancies.filter((vacancy) => vacancy.clubId !== offer.clubId);
  const coachId = board.clubs[offer.clubId]?.coachId;
  if (coachId) releaseCoach(board, coachId, rules.maxFreeCoaches);
  board.manager.clubId = offer.clubId;
  board.manager.hired = at;
  delete board.manager.graceUntil;
  board.clubs[offer.clubId] = {
    clubId: offer.clubId,
    coachId: null,
    goals: seasonGoals(base, offer.clubId, board.manager.reputation, { midSeason: true }),
    confidence: rules.neutral,
    hired: at,
    recent: [
      {
        ...at,
        delta: 0,
        value: rules.neutral,
        factors: [{ kind: "hired", amount: 0 }],
      },
    ],
  };
  openStint(board, offer.clubId, at);
  board.notice = { kind: "hired", clubId: offer.clubId, ...at };
  return {
    ok: true,
    board,
    market,
    ...(previous !== null ? { previousClubId: previous } : {}),
  };
}

/** Recusa a proposta; a vaga volta para a IA. Não mexe na confiança (FR-028). */
export function declineJobOffer(board: BoardState, offerId: string): BoardState {
  const offer = board.offers.find((entry) => entry.id === offerId);
  if (offer?.status !== "pending") return board;
  const next = clone(board);
  for (const entry of next.offers) if (entry.id === offerId) entry.status = "declined";
  for (const vacancy of next.vacancies) if (vacancy.offerId === offerId) delete vacancy.offerId;
  return next;
}

/**
 * Garantia de proposta ao desempregado na virada (FR-030): o clube da IA compatível com menor
 * confiança (senão o de menor reputação da divisão mais baixa) demite o técnico e faz a proposta.
 * Altera o rascunho.
 */
export function guaranteeOffer(board: BoardState, context: Omit<BoardContext, "board">): void {
  if (board.manager.clubId !== null || pendingOffers(board).length > 0) return;
  const rules = boardRules(context.world, context.league.competitionId);
  const season = context.league.number;
  const fired = board.manager.firedBy;
  const candidates = Object.values(board.clubs)
    .filter((club) => clubDivision(context.league, club.clubId))
    .filter((club) => !(fired?.clubId === club.clubId && fired.season >= season - 1))
    .sort((a, b) => (a.clubId < b.clubId ? -1 : a.clubId > b.clubId ? 1 : 0));
  const compatible = candidates
    .filter((club) =>
      compatibleClub(rules, board.manager.reputation, clubReputation(context.world, club.clubId)),
    )
    .sort((a, b) => a.confidence - b.confidence);
  const levels = context.league.divisions.map((entry) => entry.divisionLevel);
  const lowest = Math.max(...levels);
  const fallback = candidates
    .filter((club) => clubDivision(context.league, club.clubId)?.divisionLevel === lowest)
    .sort(
      (a, b) => clubReputation(context.world, a.clubId) - clubReputation(context.world, b.clubId),
    );
  const chosen = compatible[0] ?? fallback[0];
  if (!chosen) return;
  if (chosen.coachId) releaseCoach(board, chosen.coachId, rules.maxFreeCoaches);
  let vacancy = board.vacancies.find((entry) => entry.clubId === chosen.clubId);
  if (!vacancy) {
    vacancy = {
      id: nextId(board, "vacancy"),
      clubId: chosen.clubId,
      season,
      round: 0,
      considered: true,
    };
    board.vacancies.push(vacancy);
  }
  vacancy.considered = true;
  createOffer(board, context, vacancy);
}
