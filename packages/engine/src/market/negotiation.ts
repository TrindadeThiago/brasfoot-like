import { ageOn, seasonDate } from "../calendar/date";
import type { CompletedPlayer } from "../model/types";
import { askingPrice, respondToOffer } from "./club-response";
import { contractYearsRange } from "./contracts";
import { completeLoan, completeRenewal, completeSigning, completeTransfer } from "./effects";
import { respondToContract } from "./player-response";
import { marketRules } from "./rules";
import { canAddPlayer } from "./squad";
import type {
  ClubResponse,
  MarketContext,
  MarketResult,
  MarketRules,
  MarketUpdate,
  Negotiation,
  NegotiationOutcome,
  PlayerResponse,
  TransferRecord,
} from "./types";
import { fail } from "./types";
import { isWindowOpen, nextWindowRound, roundsPlayed } from "./windows";

export type StartInput =
  | { kind: "buy"; playerId: string; fee: number }
  | { kind: "loan"; playerId: string; fee: number }
  | { kind: "free"; playerId: string }
  | { kind: "renew"; playerId: string };

export interface NegotiationStep {
  update: MarketUpdate;
  /** Negociação ainda aberta (ausente quando terminou: concluída, recusada ou cancelada). */
  negotiation?: Negotiation;
  clubResponse?: ClubResponse;
  playerResponse?: PlayerResponse;
}

function rulesOf(context: MarketContext): MarketRules {
  return marketRules(context.world, context.league.competitionId);
}

function unchanged(context: MarketContext): MarketUpdate {
  return {
    world: context.world,
    finances: context.finances,
    market: context.market,
    departed: [],
  };
}

function withMarket(context: MarketContext, market: MarketUpdate["market"]): MarketUpdate {
  return { ...unchanged(context), market };
}

/** Id da próxima negociação ou proposta. */
function nextId(context: MarketContext, prefix: string): [string, number] {
  return [
    `${prefix}-${String(context.market.nextSeq).padStart(4, "0")}`,
    context.market.nextSeq + 1,
  ];
}

function logEntry(
  context: MarketContext,
  player: { id: string; displayName: string },
  outcome: NegotiationOutcome,
  kind: TransferRecord["kind"],
  extra: Partial<TransferRecord> = {},
): TransferRecord {
  return {
    season: context.league.number,
    round: roundsPlayed(context.league),
    playerId: player.id,
    displayName: player.displayName,
    kind,
    fee: 0,
    outcome,
    ...extra,
  };
}

/** Fecha a negociação: sai das abertas e entra no registro com o desfecho. */
function closeNegotiation(
  context: MarketContext,
  negotiation: Negotiation,
  outcome: NegotiationOutcome,
  reason?: string,
): MarketUpdate {
  const player = findPlayer(context, negotiation.playerId);
  const entry = logEntry(
    context,
    player ?? { id: negotiation.playerId, displayName: negotiation.playerId },
    outcome,
    negotiation.kind,
    {
      ...(negotiation.fromClubId ? { fromClubId: negotiation.fromClubId } : {}),
      toClubId: negotiation.clubId,
      ...(reason ? { reason } : {}),
    },
  );
  return withMarket(context, {
    ...context.market,
    negotiations: context.market.negotiations.filter((entry) => entry.id !== negotiation.id),
    log: [...context.market.log, entry],
  });
}

function findPlayer(context: MarketContext, playerId: string) {
  const inBank = context.world.players.find((entry) => entry.id === playerId);
  if (inBank) return inBank;
  const agent = context.market.freeAgents.find((entry) => entry.player.id === playerId);
  return agent?.player;
}

function findNegotiation(context: MarketContext, negotiationId: string): Negotiation | undefined {
  return context.market.negotiations.find((entry) => entry.id === negotiationId);
}

function playerAge(context: MarketContext, player: { birthDate: string }): number {
  return ageOn(
    player.birthDate,
    seasonDate(context.world.manifest.referenceDate, context.league.year),
  );
}

function windowClosed(context: MarketContext, rules: MarketRules) {
  return fail<never>("market.window_closed", {
    round: nextWindowRound(context.league, rules) ?? 0,
  });
}

/**
 * Abre uma negociação do usuário (contracts/market-api.md). Compra e empréstimo valem só na
 * janela; livres e renovações, a qualquer momento. A resposta do clube é imediata.
 */
export function startNegotiation(
  context: MarketContext,
  input: StartInput,
): MarketResult<NegotiationStep> {
  const rules = rulesOf(context);
  const player = findPlayer(context, input.playerId);
  if (!player) return fail("market.not_found");
  if (context.market.negotiations.some((entry) => entry.playerId === input.playerId)) {
    return fail("market.already_negotiating");
  }
  const [id, nextSeq] = nextId(context, "neg");
  const base = { id, playerId: input.playerId, clubId: context.managerClubId };
  const openedRound = roundsPlayed(context.league);

  if (input.kind === "free" || input.kind === "renew") {
    const free = context.market.freeAgents.some((entry) => entry.player.id === input.playerId);
    const owned = context.world.players.find((entry) => entry.id === input.playerId);
    if (input.kind === "free" ? !free : owned?.clubId !== context.managerClubId) {
      return fail("market.not_found");
    }
    if (
      input.kind === "free" &&
      !canAddPlayer(context.world, context.managerClubId, player.position)
    ) {
      return fail("market.squad_full");
    }
    if (owned?.contract?.loan) return fail("market.player_on_loan");
    const negotiation: Negotiation = { ...base, kind: input.kind, stage: "contract", openedRound };
    const market = {
      ...context.market,
      nextSeq,
      negotiations: [...context.market.negotiations, negotiation],
    };
    return { ok: true, value: { update: withMarket(context, market), negotiation } };
  }

  const target = context.world.players.find((entry) => entry.id === input.playerId);
  if (target?.contract?.loan) return fail("market.player_on_loan");
  if (!target || target.clubId === context.managerClubId) return fail("market.not_found");
  if (!isWindowOpen(context.league, rules)) return windowClosed(context, rules);
  const minimum = input.kind === "buy" ? 1 : 0;
  if (!Number.isInteger(input.fee) || input.fee < minimum) return fail("market.invalid_amount");
  if ((context.finances.clubs[context.managerClubId]?.cash ?? 0) < input.fee) {
    return fail("market.insufficient_cash", { needed: input.fee });
  }
  if (!canAddPlayer(context.world, context.managerClubId, target.position)) {
    return fail("market.squad_full");
  }

  const response = respondToOffer(context, target, input.fee, input.kind);
  const opened: Negotiation = {
    ...base,
    kind: input.kind,
    fromClubId: target.clubId,
    stage: "club_offer",
    fee: input.fee,
    openedRound,
  };
  if (response.kind === "refused") {
    const closed = closeNegotiation(
      { ...context, market: { ...context.market, nextSeq } },
      opened,
      "refused_club",
      response.reason,
    );
    return { ok: true, value: { update: closed, clubResponse: response } };
  }
  if (response.kind === "countered") {
    const negotiation: Negotiation = {
      ...opened,
      stage: "club_countered",
      counterFee: response.fee,
    };
    const market = {
      ...context.market,
      nextSeq,
      negotiations: [...context.market.negotiations, negotiation],
    };
    return {
      ok: true,
      value: { update: withMarket(context, market), negotiation, clubResponse: response },
    };
  }
  return agree({ ...context, market: { ...context.market, nextSeq } }, opened, input.fee, response);
}

/** Acordo com o clube: compra segue para o contrato; empréstimo se conclui na hora. */
function agree(
  context: MarketContext,
  negotiation: Negotiation,
  fee: number,
  response: ClubResponse,
): MarketResult<NegotiationStep> {
  if (negotiation.kind === "loan") {
    const done = completeLoan(context, {
      playerId: negotiation.playerId,
      toClubId: negotiation.clubId,
      fee,
    });
    if (!done.ok) return done;
    return { ok: true, value: { update: done.value, clubResponse: response } };
  }
  const next: Negotiation = { ...negotiation, stage: "contract", agreedFee: fee };
  const market = {
    ...context.market,
    negotiations: [
      ...context.market.negotiations.filter((entry) => entry.id !== negotiation.id),
      next,
    ],
  };
  return {
    ok: true,
    value: { update: withMarket(context, market), negotiation: next, clubResponse: response },
  };
}

/** O usuário aceita ou recusa a contraproposta do clube (a única do clube). */
export function answerClubCounter(
  context: MarketContext,
  negotiationId: string,
  accept: boolean,
): MarketResult<NegotiationStep> {
  const negotiation = findNegotiation(context, negotiationId);
  if (!negotiation) return fail("market.not_found");
  if (negotiation.stage !== "club_countered" || negotiation.counterFee === undefined) {
    return fail("market.invalid_stage");
  }
  if (!accept) {
    return {
      ok: true,
      value: { update: closeNegotiation(context, negotiation, "rejected_by_user") },
    };
  }
  const fee = negotiation.counterFee;
  if ((context.finances.clubs[context.managerClubId]?.cash ?? 0) < fee) {
    return fail("market.insufficient_cash", { needed: fee });
  }
  return agree(context, negotiation, fee, { kind: "accepted" });
}

/** Proposta de contrato do usuário ao atleta (US3). */
export function proposeContract(
  context: MarketContext,
  negotiationId: string,
  offer: { wage: number; years: number },
): MarketResult<NegotiationStep> {
  const negotiation = findNegotiation(context, negotiationId);
  if (!negotiation) return fail("market.not_found");
  if (negotiation.stage !== "contract") return fail("market.invalid_stage");
  const player = findPlayer(context, negotiation.playerId);
  if (!player) return fail("market.not_found");
  const rules = rulesOf(context);
  const [min, max] = contractYearsRange(playerAge(context, player), rules);
  if (!Number.isInteger(offer.years) || offer.years < min || offer.years > max) {
    return fail("market.invalid_duration", { min, max });
  }
  if (!Number.isInteger(offer.wage) || offer.wage <= 0) return fail("market.invalid_amount");
  const renewal = negotiation.kind === "renew";
  const response = respondToContract(
    context,
    player as CompletedPlayer,
    negotiation.clubId,
    offer.wage,
    renewal,
  );
  if (response.kind === "refused") {
    return {
      ok: true,
      value: {
        update: closeNegotiation(context, negotiation, "refused_player", response.reason),
        playerResponse: response,
      },
    };
  }
  if (response.kind === "demanded") {
    const next: Negotiation = {
      ...negotiation,
      stage: "player_demanded",
      wage: offer.wage,
      years: offer.years,
      demandWage: response.wage,
    };
    const market = {
      ...context.market,
      negotiations: context.market.negotiations.map((entry) =>
        entry.id === next.id ? next : entry,
      ),
    };
    return {
      ok: true,
      value: { update: withMarket(context, market), negotiation: next, playerResponse: response },
    };
  }
  return conclude(context, negotiation, offer.wage, offer.years, response);
}

/** O usuário aceita ou recusa o salário pedido pelo atleta (o único pedido). */
export function answerPlayerDemand(
  context: MarketContext,
  negotiationId: string,
  accept: boolean,
): MarketResult<NegotiationStep> {
  const negotiation = findNegotiation(context, negotiationId);
  if (!negotiation) return fail("market.not_found");
  if (
    negotiation.stage !== "player_demanded" ||
    negotiation.demandWage === undefined ||
    negotiation.years === undefined
  ) {
    return fail("market.invalid_stage");
  }
  if (!accept) {
    return {
      ok: true,
      value: { update: closeNegotiation(context, negotiation, "rejected_by_user") },
    };
  }
  return conclude(context, negotiation, negotiation.demandWage, negotiation.years, {
    kind: "accepted",
  });
}

/** Cancela uma negociação aberta sem custo (`reason` explica cancelamentos automáticos). */
export function cancelNegotiation(
  context: MarketContext,
  negotiationId: string,
  reason?: string,
): MarketUpdate {
  const negotiation = findNegotiation(context, negotiationId);
  if (!negotiation) return unchanged(context);
  return closeNegotiation(context, negotiation, "rejected_by_user", reason);
}

/** Fecha o acordo e aplica os efeitos; revalida janela, caixa e elenco (R9). */
function conclude(
  context: MarketContext,
  negotiation: Negotiation,
  wage: number,
  years: number,
  response: PlayerResponse,
): MarketResult<NegotiationStep> {
  const rules = rulesOf(context);
  const year = context.league.year;
  const current = context.world.players.find((entry) => entry.id === negotiation.playerId);
  // Renovação vale a partir da próxima temporada e nunca encurta o contrato em vigor.
  const contract = {
    wage,
    untilYear:
      negotiation.kind === "renew"
        ? Math.max(current?.contract?.untilYear ?? year, year + years)
        : year + years - 1,
  };
  let done: MarketResult<MarketUpdate>;
  if (negotiation.kind === "buy") {
    if (!isWindowOpen(context.league, rules)) return windowClosed(context, rules);
    done = completeTransfer(context, {
      playerId: negotiation.playerId,
      toClubId: negotiation.clubId,
      fee: negotiation.agreedFee ?? 0,
      contract,
    });
  } else if (negotiation.kind === "free") {
    const agent = context.market.freeAgents.find(
      (entry) => entry.player.id === negotiation.playerId,
    );
    if (!agent) return fail("market.not_found");
    done = completeSigning(context, { agent, clubId: negotiation.clubId, contract });
  } else {
    done = completeRenewal(context, { playerId: negotiation.playerId, contract });
  }
  if (!done.ok) return done;
  const update: MarketUpdate = {
    ...done.value,
    market: {
      ...done.value.market,
      negotiations: done.value.market.negotiations.filter((entry) => entry.id !== negotiation.id),
    },
  };
  return { ok: true, value: { update, playerResponse: response } };
}

export { askingPrice };
