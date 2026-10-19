import { describe, expect, it } from "vitest";
import type { CompletedBank } from "../../src/model/types";
import { startRound } from "../../src/season/live-round";
import { createSeason, unavailablePlayers } from "../../src/season/season";
import { serieAOptions, testWorld } from "./helpers/world";

function division(level: number): string[] {
  const found = testWorld().competitions[0]?.divisions.find((entry) => entry.level === level);
  if (!found) throw new Error("sem divisão");
  return [...found.clubIds];
}

/** Composição com os 2 últimos da Série A trocados pelos 2 primeiros da Série B. */
function swappedComposition(): string[] {
  const serieA = division(1);
  const serieB = division(2);
  return [...serieA.slice(0, 18), ...serieB.slice(0, 2)];
}

describe("createSeason com composição e situação iniciais (R4, R7)", () => {
  it("usa exatamente os clubes informados", () => {
    const clubIds = swappedComposition();
    const result = createSeason(testWorld(), { ...serieAOptions("composicao"), clubIds });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { season } = result;
    expect([...season.clubIds].sort()).toEqual([...clubIds].sort());
    expect(Object.keys(season.formations).sort()).toEqual([...clubIds].sort());
    const playing = new Set(
      season.calendar.flatMap((round) =>
        round.fixtures.flatMap((fixture) => [fixture.home, fixture.away]),
      ),
    );
    expect([...playing].sort()).toEqual([...clubIds].sort());
  });

  it.each([
    ["clube inexistente", () => [...division(1).slice(0, 19), "clube-nao-existe"]],
    ["clube repetido", () => [...division(1).slice(0, 19), division(1)[0] as string]],
    ["menos de 2 clubes", () => division(1).slice(0, 1)],
  ])("recusa %s", (_label, clubIds) => {
    const result = createSeason(testWorld(), { ...serieAOptions(1), clubIds: clubIds() });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("season.invalid_composition");
    expect(result.error.params.level).toBe(1);
  });

  it("recusa clube que não disputa a competição", () => {
    const world = JSON.parse(JSON.stringify(testWorld())) as CompletedBank;
    const outsider = world.clubs[0];
    if (!outsider) throw new Error("sem clube");
    world.clubs.push({ ...outsider, id: "clube-de-fora" });
    const result = createSeason(world, {
      ...serieAOptions(1),
      clubIds: [...division(1).slice(0, 19), "clube-de-fora"],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("season.invalid_composition");
  });

  it("começa com a situação informada dos jogadores", () => {
    const clubId = division(1)[0] as string;
    const player = testWorld().players.find((entry) => entry.clubId === clubId);
    if (!player) throw new Error("sem jogador");
    const status = { [player.id]: { yellows: 0, suspension: 0, injury: 2 } };
    const result = createSeason(testWorld(), { ...serieAOptions("lesao"), status });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.season.status).toEqual(status);
    expect(unavailablePlayers(result.season, clubId, testWorld())).toContain(player.id);
    const round = startRound(result.season, testWorld());
    expect(round.ok).toBe(true);
    if (!round.ok) return;
    const fielded = round.round.matches.flatMap((match) => [
      ...Object.values(match.state.input.home.lineup.starters),
      ...Object.values(match.state.input.away.lineup.starters),
    ]);
    expect(fielded).not.toContain(player.id);
  });

  it.each(["regressao", 42])("sem as opções novas, a temporada é a mesma de antes (%s)", (seed) => {
    const plain = createSeason(testWorld(), serieAOptions(seed));
    const explicit = createSeason(testWorld(), {
      ...serieAOptions(seed),
      clubIds: division(1),
      status: {},
    });
    expect(explicit).toEqual(plain);
  });
});
