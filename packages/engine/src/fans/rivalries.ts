import type { CompletedBank, Rivalry } from "../model/types";

/** Rivalidades do banco (seção opcional; ausente = nenhuma). */
export function rivalriesOf(world: Pick<CompletedBank, "rivalries">): Rivalry[] {
  return world.rivalries ?? [];
}

/** Rivalidade entre dois clubes, em qualquer ordem. */
export function rivalryOf(
  world: Pick<CompletedBank, "rivalries">,
  a: string,
  b: string,
): Rivalry | undefined {
  return rivalriesOf(world).find(
    (rivalry) =>
      (rivalry.clubIds[0] === a && rivalry.clubIds[1] === b) ||
      (rivalry.clubIds[0] === b && rivalry.clubIds[1] === a),
  );
}

/** Rivais do clube, do mais intenso ao menos (desempate por id). */
export function rivalsOf(
  world: Pick<CompletedBank, "rivalries">,
  clubId: string,
): { clubId: string; intensity: number }[] {
  return rivalriesOf(world)
    .filter((rivalry) => rivalry.clubIds.includes(clubId))
    .map((rivalry) => ({
      clubId: rivalry.clubIds[0] === clubId ? rivalry.clubIds[1] : rivalry.clubIds[0],
      intensity: rivalry.intensity,
    }))
    .sort((a, b) => b.intensity - a.intensity || (a.clubId < b.clubId ? -1 : 1));
}

/** O jogo é um clássico (os dois clubes são rivais). */
export function isDerby(
  world: Pick<CompletedBank, "rivalries">,
  fixture: { home: string; away: string },
): boolean {
  return rivalryOf(world, fixture.home, fixture.away) !== undefined;
}
