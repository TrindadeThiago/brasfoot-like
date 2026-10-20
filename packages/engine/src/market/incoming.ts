import { createRng } from "../rng/xoshiro";
import { incomingOfferFor } from "./ai/offers";
import { maxBidFor } from "./club-response";
import { completeLoan, completeTransfer } from "./effects";
import { marketRules } from "./rules";
import type {
  IncomingOffer,
  MarketContext,
  MarketResult,
  MarketUpdate,
  TransferRecord,
} from "./types";
import { fail } from "./types";
import { isWindowOpen, roundsPlayed } from "./windows";

/** Quantos titulares prováveis o comprador tem em campo (o jogador precisa entrar entre eles). */
const STARTERS = 11;
/** Parte das propostas que é por empréstimo (%), para jogadores fora dos titulares. */
const _LOAN_SHARE_PCT = 25;

function _roundThousand(value: number): number {
  return Math.round(value / 1000) * 1000;
}

function unchanged(context: MarketContext): MarketUpdate {
  return {
    world: context.world,
    finances: context.finances,
    market: context.market,
    departed: [],
  };
}

function logEntry(
  context: MarketContext,
  offer: IncomingOffer,
  displayName: string,
  extra: Partial<TransferRecord>,
): TransferRecord {
  return {
    season: context.league.number,
    round: roundsPlayed(context.league),
    playerId: offer.playerId,
    displayName,
    kind: offer.kind === "buy" ? "sale" : "loan_out",
    toClubId: offer.fromClubId,
    fee: offer.fee,
    ...extra,
  };
}

/** Força do 11º melhor do clube: o jogador precisa superá-la para ser titular lá. */
function _starterBar(context: MarketContext, clubId: string): number {
  const strengths = context.world.players
    .filter((player) => player.clubId === clubId)
    .map((player) => player.strength)
    .sort((a, b) => b - a);
  return strengths[STARTERS - 1] ?? 0;
}

/**
 * Depois de cada rodada fechada (R10): expira o que a janela fechada ou o prazo vencem e, com a
 * janela aberta, os clubes da IA podem fazer propostas básicas pelos jogadores do usuário.
 */
export function marketAfterRound(context: MarketContext): MarketUpdate {
  const rules = marketRules(context.world, context.league.competitionId);
  const played = roundsPlayed(context.league);
  const open = isWindowOpen(context.league, rules);
  const nameOf = (playerId: string) =>
    context.world.players.find((player) => player.id === playerId)?.displayName ?? playerId;

  let incoming = context.market.incoming.filter((offer) => open && offer.expiresRound >= played);
  let negotiations = context.market.negotiations;
  const log = [...context.market.log];
  for (const offer of context.market.incoming) {
    if (!incoming.includes(offer)) {
      log.push(logEntry(context, offer, nameOf(offer.playerId), { outcome: "expired" }));
    }
  }
  if (!open) {
    for (const negotiation of context.market.negotiations) {
      if (negotiation.kind !== "buy" && negotiation.kind !== "loan") continue;
      log.push({
        season: context.league.number,
        round: played,
        playerId: negotiation.playerId,
        displayName: nameOf(negotiation.playerId),
        kind: negotiation.kind,
        fee: 0,
        outcome: "expired",
        ...(negotiation.fromClubId ? { fromClubId: negotiation.fromClubId } : {}),
        toClubId: negotiation.clubId,
      });
    }
    negotiations = negotiations.filter(
      (negotiation) => negotiation.kind !== "buy" && negotiation.kind !== "loan",
    );
  }
  let market = { ...context.market, incoming, negotiations, log };
  if (open && incoming.length < rules.incoming.maxOpen) {
    const rng = createRng(`${context.careerSeed}:incoming:${context.league.number}:${played}`);
    if (rng.int(1, 100) <= rules.incoming.chancePct) {
      const offer = incomingOfferFor(
        context,
        rng,
        new Set([
          ...incoming.map((entry) => entry.playerId),
          ...negotiations.map((entry) => entry.playerId),
        ]),
      );
      if (offer) {
        const id = `off-${String(market.nextSeq).padStart(4, "0")}`;
        incoming = [
          ...incoming,
          { ...offer, id, expiresRound: played + rules.incoming.expireRounds },
        ];
        market = { ...market, incoming, nextSeq: market.nextSeq + 1 };
      }
    }
  }
  return { ...unchanged(context), market };
}

export type IncomingAnswer =
  | { kind: "accept" }
  | { kind: "refuse" }
  | { kind: "counter"; fee: number };

/** Resposta do usuário a uma proposta: aceitar, recusar ou contrapropor uma vez (US4). */
export function answerIncomingOffer(
  context: MarketContext,
  offerId: string,
  answer: IncomingAnswer,
): MarketResult<{ update: MarketUpdate; response?: "accepted" | "refused" }> {
  const offer = context.market.incoming.find((entry) => entry.id === offerId);
  if (!offer) return fail("market.not_found");
  const player = context.world.players.find((entry) => entry.id === offer.playerId);
  if (!player || player.clubId !== context.managerClubId) return fail("market.not_found");
  const rules = marketRules(context.world, context.league.competitionId);
  if (!isWindowOpen(context.league, rules)) {
    return fail("market.window_closed", { round: 0 });
  }
  const others = context.market.incoming.filter((entry) => entry.id !== offer.id);

  const settle = (fee: number) => {
    const done =
      offer.kind === "loan"
        ? completeLoan(context, { playerId: offer.playerId, toClubId: offer.fromClubId, fee })
        : completeTransfer(context, { playerId: offer.playerId, toClubId: offer.fromClubId, fee });
    if (!done.ok) return done;
    const update = done.value;
    return {
      ok: true as const,
      value: {
        update: {
          ...update,
          market: {
            ...update.market,
            incoming: others.filter((entry) => entry.playerId !== offer.playerId),
          },
        },
        response: "accepted" as const,
      },
    };
  };

  const decline = (outcome: "rejected_by_user" | "refused_club") => ({
    ok: true as const,
    value: {
      update: {
        ...unchanged(context),
        market: {
          ...context.market,
          incoming: others,
          log: [...context.market.log, logEntry(context, offer, player.displayName, { outcome })],
        },
      },
      response: "refused" as const,
    },
  });

  if (answer.kind === "accept") return settle(offer.fee);
  if (answer.kind === "refuse") return decline("rejected_by_user");
  if (offer.countered || offer.kind !== "buy") return fail("market.invalid_stage");
  if (!Number.isInteger(answer.fee) || answer.fee <= 0) return fail("market.invalid_amount");
  const affordable = answer.fee <= (context.finances.clubs[offer.fromClubId]?.cash ?? 0);
  return affordable && answer.fee <= maxBidFor(context, player, offer.id)
    ? settle(answer.fee)
    : decline("refused_club");
}
