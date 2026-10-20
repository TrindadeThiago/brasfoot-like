import type { CompletedPlayer } from "../model/types";
import { createRng } from "../rng/xoshiro";
import { marketRules } from "./rules";
import { canRemovePlayer, strengthRank } from "./squad";
import type { ClubResponse, MarketContext, MarketRules } from "./types";
import { marketValue } from "./value";
import { currentWindowEnd, transferWindows } from "./windows";

/** Titulares prováveis (11 mais fortes) pesam mais na pedida (R6). */
const KEY_PLAYERS = 11;
/** Num empréstimo, quem está fora destes mais fortes sai sem taxa (R6). */
const LOAN_FREE_RANK = 16;

function rulesOf(context: MarketContext): MarketRules {
  return marketRules(context.world, context.league.competitionId);
}

function roundThousand(value: number): number {
  return Math.round(value / 1000) * 1000;
}

/** Janela em que a pedida vale (a pedida é estável dentro da janela). */
function windowKey(context: MarketContext, rules: MarketRules): string {
  const end = currentWindowEnd(context.league, rules);
  const index = transferWindows(context.league, rules).findIndex(
    (window) => window.toRound === end,
  );
  return String(index);
}

/** Pedida do clube pelo jogador: valor × importância × ruído (R6). */
export function askingPrice(context: MarketContext, player: CompletedPlayer): number {
  const rules = rulesOf(context);
  const value = marketValue(player, context.world, context.league.year);
  const rank = strengthRank(context.world, player.clubId, player.id);
  const importance = rank > 0 && rank <= KEY_PLAYERS ? rules.club.keyPlayerPct : 100;
  const rng = createRng(
    `${context.careerSeed}:ask:${context.league.number}:${windowKey(context, rules)}:${player.id}`,
  );
  const noise = rng.int(rules.club.noiseMinPct, rules.club.noiseMaxPct);
  return Math.max(1000, roundThousand((((value * importance) / 100) * noise) / 100));
}

/** Pedida de empréstimo: fração da compra; fora dos mais fortes, sem taxa. */
export function loanAskingPrice(context: MarketContext, player: CompletedPlayer): number {
  const rules = rulesOf(context);
  if (strengthRank(context.world, player.clubId, player.id) > LOAN_FREE_RANK) return 0;
  return roundThousand((askingPrice(context, player) * rules.club.loanFeePct) / 100);
}

/** Resposta do clube a uma oferta do usuário (compra ou empréstimo). */
export function respondToOffer(
  context: MarketContext,
  player: CompletedPlayer,
  fee: number,
  kind: "buy" | "loan",
): ClubResponse {
  const rules = rulesOf(context);
  if (!canRemovePlayer(context.world, player.clubId, player.id)) {
    return { kind: "refused", reason: "squad_minimum" };
  }
  const ask = kind === "loan" ? loanAskingPrice(context, player) : askingPrice(context, player);
  if (fee >= ask) return { kind: "accepted" };
  if (fee * 100 >= ask * rules.club.counterThresholdPct) return { kind: "countered", fee: ask };
  const rank = strengthRank(context.world, player.clubId, player.id);
  return { kind: "refused", reason: rank <= KEY_PLAYERS ? "key_player" : "low_offer" };
}

/** Valor máximo que o clube comprador pagaria numa contraproposta do usuário (US4). */
export function maxBidFor(context: MarketContext, player: CompletedPlayer, salt: string): number {
  const rules = rulesOf(context);
  const value = marketValue(player, context.world, context.league.year);
  const rng = createRng(
    `${context.careerSeed}:maxbid:${context.league.number}:${player.id}:${salt}`,
  );
  const pct = rng.int(rules.club.maxBidMinPct, rules.club.maxBidMaxPct);
  return roundThousand((value * pct) / 100);
}
