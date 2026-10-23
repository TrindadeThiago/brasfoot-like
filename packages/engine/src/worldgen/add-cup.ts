import type { CompletedBank } from "../model/types";
import { cupLegs, generateCup } from "./cup";
import defaultNameBank from "./name-banks/default.json" with { type: "json" };

/**
 * Acrescenta a copa nacional do banco padrão (018) a um mundo que ainda não tem copa, com as mesmas
 * regras do gerador: todos os clubes da competição principal, com os de divisão mais baixa e menor
 * reputação abrindo a copa. Serve para carreiras criadas antes da 018, na virada de temporada.
 * Devolve o próprio mundo se ele já tem uma copa ou se não há uma liga principal.
 */
export function withNationalCup<T extends Pick<CompletedBank, "competitions" | "clubs">>(
  world: T,
): T {
  if (world.competitions.some((competition) => competition.format.type === "knockout")) {
    return world;
  }
  const main = world.competitions[0];
  if (!main || main.format.type !== "league") return world;
  const reputation = new Map(world.clubs.map((club) => [club.id, club.reputation]));
  const clubs = main.divisions.flatMap((division) =>
    division.clubIds.map((id) => ({
      id,
      reputation: reputation.get(id) ?? 0,
      level: division.level,
    })),
  );
  const cup = generateCup(
    "copa-nacional",
    defaultNameBank.cupName ?? "Copa Nacional",
    main.countryId,
    clubs,
  );
  return { ...world, competitions: [...world.competitions, cup] };
}

/**
 * Copa do banco padrão com as pernas de hoje (oitavas, quartas e semifinal em ida e volta): as
 * carreiras criadas antes da mudança guardam a copa de jogo único no save e a recebem na virada de
 * temporada. Só mexe na copa gerada pelo banco padrão (`copa-nacional`); qualquer outra copa, de
 * mod, fica como o modder a descreveu. Devolve o próprio mundo se nada muda.
 */
export function withDefaultCupLegs<T extends Pick<CompletedBank, "competitions">>(world: T): T {
  let changed = false;
  const competitions = world.competitions.map((competition) => {
    if (competition.id !== "copa-nacional" || competition.format.type !== "knockout") {
      return competition;
    }
    const { phases } = competition.format;
    const updated = phases.map((phase, index) => {
      const legs = cupLegs(phases.length - 1 - index);
      return phase.legs === legs ? phase : { ...phase, legs };
    });
    if (updated.every((phase, index) => phase === phases[index])) return competition;
    changed = true;
    return { ...competition, format: { ...competition.format, phases: updated } };
  });
  return changed ? { ...world, competitions } : world;
}
