import type { CompletedBank } from "../model/types";
import { generateCup } from "./cup";
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
