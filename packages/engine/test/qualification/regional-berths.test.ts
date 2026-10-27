import { describe, expect, it } from "vitest";
import type { Berth, Competition, CompletedBank } from "../../src/model/types";
import { resolveFinishedSeasons } from "../../src/qualification/finish";
import { standings } from "../../src/season/standings";
import { generateCup } from "../../src/worldgen/cup";
import { ok } from "../career/qualification-helpers";
import { playToEnd, regionalState, regionalWorld } from "../career/regional-helpers";
import { clone } from "./helpers";

const SEED = "estaduais-vagas";

/** Mundo com uma copa de 4 vagas alimentada pelo estadual `estadual-01` (nível 1). */
function worldWithCup(): CompletedBank {
  const world = clone(regionalWorld({}, SEED)) as CompletedBank;
  const estadual = world.competitions.find((entry) => entry.id === "estadual-01") as Competition;
  const clubs = (estadual.divisions[0]?.clubIds ?? []).slice(0, 4).map((id) => ({
    id,
    reputation: 10,
    level: 1,
  }));
  const cup = generateCup("copa-estadual", "Copa dos Estaduais", estadual.countryId ?? "", clubs);
  const slot = (from: number, to = from): Berth["source"] => ({
    kind: "position",
    competitionId: "estadual-01",
    level: 1,
    from,
    to,
  });
  const berths: Berth[] = [
    // Mesma posição nas duas primeiras vagas: a segunda é repassada ao próximo colocado.
    { id: "campeao", source: slot(1), fallback: [slot(2, 12)] },
    { id: "campeao-bis", source: slot(1), fallback: [slot(2, 12)] },
    { id: "vice", source: slot(2), fallback: [slot(3, 12)] },
    { id: "terceiro", source: slot(3), fallback: [slot(4, 12)] },
  ];
  const division = cup.divisions[0] as Competition["divisions"][0];
  cup.divisions = [{ ...division, berths }];
  return { ...world, competitions: [...world.competitions, cup] };
}

describe("vagas a partir do estadual (023 R5, 021)", () => {
  const world = worldWithCup();
  const { state, manager, seed } = regionalState({ world, seed: SEED });
  const end = playToEnd(state, seed, manager);
  const finished = [end.league, ...end.competitions];
  const outcome = resolveFinishedSeasons(end.world, finished, end.league);

  it("a copa nacional recebe os melhores colocados da 1ª divisão do estadual, sem repetição", () => {
    const result = ok(outcome as NonNullable<typeof outcome>).result;
    const clubs = result.compositions["copa-estadual"]?.[1] ?? [];
    expect(clubs).toHaveLength(4);
    expect(new Set(clubs).size).toBe(4);
    const league = finished.find((entry) => entry.competitionId === "estadual-01");
    const first = league?.divisions[0];
    const table = first ? standings(first, end.world).map((row) => row.clubId) : [];
    // Campeão, vice e terceiro entram; a vaga repetida vai para o quarto colocado.
    expect([...clubs].sort()).toEqual(table.slice(0, 4).sort());
  });

  it("a vaga repetida é repassada ao próximo colocado do estadual (021)", () => {
    const result = ok(outcome as NonNullable<typeof outcome>).result;
    const entries = result.record.entries.filter(
      (entry) => entry.competitionId === "copa-estadual",
    );
    const passed = entries.find((entry) => entry.via === "pass");
    expect(passed?.passedFrom?.reason).toBe("duplicate");
  });

  it("é determinística", () => {
    const again = resolveFinishedSeasons(end.world, finished, end.league);
    expect(again).toEqual(outcome);
  });
});
