import type { CompletedBank, CompletedPlayer } from "../model/types";
import { playerById, squadOf } from "../world/squads";
import type { FansContext } from "./types";

/** Ídolos do clube: os `count` jogadores mais fortes do elenco atual (desempate por id). */
export function idolsOf(world: CompletedBank, clubId: string, count: number): CompletedPlayer[] {
  return [...squadOf(world, clubId)]
    .sort((a, b) => b.strength - a.strength || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .slice(0, count);
}

/** O jogador estaria entre os ídolos do elenco (já sem ele, se saiu). */
function wouldBeIdol(
  world: CompletedBank,
  clubId: string,
  player: CompletedPlayer,
  count: number,
): boolean {
  if (count <= 0) return false;
  const others = idolsOf(world, clubId, count + 1).filter((entry) => entry.id !== player.id);
  const threshold = others[count - 1];
  return threshold === undefined || player.strength >= threshold.strength;
}

/**
 * Ídolos que o clube perdeu (vendas) e destaques que chegaram (compras, empréstimos recebidos,
 * livres) na rodada, pelo log do mercado (research.md R6). Empréstimos cedidos, aposentadorias e
 * fins de empréstimo não contam como perda.
 */
export function idolEvents(
  context: FansContext,
  clubId: string,
  round: number,
  count: number,
): { lost: number; signed: number } {
  const log = context.market?.log ?? [];
  let lost = 0;
  let signed = 0;
  for (const entry of log) {
    if (entry.season !== context.league.number || entry.round !== round) continue;
    if (entry.outcome !== undefined) continue;
    const player = playerById(context.world, entry.playerId);
    if (!player) continue;
    const sold = entry.kind === "buy" || entry.kind === "sale";
    if (sold && entry.fromClubId === clubId && wouldBeIdol(context.world, clubId, player, count)) {
      lost += 1;
    }
    const arrived =
      sold || entry.kind === "loan" || entry.kind === "loan_out" || entry.kind === "free";
    if (
      arrived &&
      entry.toClubId === clubId &&
      player.clubId === clubId &&
      idolsOf(context.world, clubId, count).some((idol) => idol.id === player.id)
    ) {
      signed += 1;
    }
  }
  return { lost, signed };
}
