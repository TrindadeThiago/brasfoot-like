import { ageOn } from "../calendar/date.js";
import type { CompletedBank, CompletedPlayer, Player, ValidatedBank } from "../model/types.js";
import { intIrwinHall } from "../rng/distributions.js";
import { createRng, type Rng } from "../rng/xoshiro.js";
import { GENERATOR_TUNING } from "./tuning.js";

function potentialMargin(rng: Rng, age: number): number {
  for (const [maxAge, [min, max]] of GENERATOR_TUNING.hidden.potentialMargin) {
    if (age <= maxAge) return rng.int(min, max);
  }
  return 0;
}

function complete(root: Rng, player: Player, referenceDate: string): CompletedPlayer {
  // Os três valores são sempre sorteados, na mesma ordem, a partir de um sub-gerador do jogador:
  // o resultado depende só da seed da carreira e do id, nunca da ordem dos jogadores.
  const rng = root.fork(`hidden:${player.id}`);
  const age = ageOn(player.birthDate, referenceDate);
  const potential = Math.min(100, player.strength + potentialMargin(rng, age));
  const temperament = intIrwinHall(rng, 1, 100);
  const injuryProneness = intIrwinHall(rng, 1, 100);
  return {
    ...player,
    hidden: {
      potential: player.hidden?.potential ?? potential,
      temperament: player.hidden?.temperament ?? temperament,
      injuryProneness: player.hidden?.injuryProneness ?? injuryProneness,
    },
  };
}

/**
 * Completa os atributos ocultos ausentes a partir da seed da carreira (FR-017b), preservando os
 * valores que o banco já define. Não altera o banco recebido.
 */
export function completeHiddenAttributes(
  bank: ValidatedBank,
  careerSeed: string | number,
): CompletedBank {
  const root = createRng(careerSeed);
  const referenceDate = bank.manifest.referenceDate;
  return {
    ...bank,
    players: bank.players.map((player) => complete(root, player, referenceDate)),
  } as CompletedBank;
}
