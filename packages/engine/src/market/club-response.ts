import { ageOn, seasonDate } from "../calendar/date";
import type { CompletedPlayer } from "../model/types";
import { createRng } from "../rng/xoshiro";
import { contractYearsRange } from "./contracts";
import { marketRules, QUICK_SALE_PCT } from "./rules";
import { canRemovePlayer, strengthRank } from "./squad";
import type { ClubResponse, MarketContext, MarketRules } from "./types";
import { marketValue, marketValueFor } from "./value";
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

/**
 * Pedida a quem compra para o elenco do usuário: nunca abaixo do que a venda imediata pagaria por
 * ele depois de assinar o contrato mais longo permitido. Sem esse piso, comprar no último ano de
 * contrato (valor de 60%) e revender com contrato novo (100%) dava lucro (auditoria v1.0.0, A2).
 * Só vale para o usuário: a IA segue a pedida normal.
 */
export function buyAskingPrice(context: MarketContext, player: CompletedPlayer): number {
  const ask = askingPrice(context, player);
  const rules = rulesOf(context);
  const manager = context.world.clubs.find((club) => club.id === context.managerClubId);
  if (!manager) return ask;
  const year = context.league.year;
  const date = seasonDate(context.world.manifest.referenceDate, year);
  const [, longest] = contractYearsRange(ageOn(player.birthDate, date), rules);
  const signed: CompletedPlayer = {
    ...player,
    clubId: manager.id,
    contract: { wage: player.contract?.wage ?? 0, untilYear: year + longest - 1 },
  };
  const resale = marketValueFor(signed, manager, rules, date, year);
  return Math.max(ask, roundThousand((resale * QUICK_SALE_PCT) / 100));
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
  const ask = kind === "loan" ? loanAskingPrice(context, player) : buyAskingPrice(context, player);
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
