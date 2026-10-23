import { describe, expect, it } from "vitest";
import { createCupSeason, ensurePhaseDrawn } from "../../src/knockout/bracket";
import { knockoutFormat, phaseRounds, totalLegs } from "../../src/knockout/rules";
import { generateDefaultBank } from "../../src/worldgen/generate";
import { completeHiddenAttributes } from "../../src/worldgen/hidden";
import { playCup } from "../knockout/helpers";

describe("copa nacional do banco padrão (018 R14)", () => {
  const bank = generateDefaultBank({ seed: "copa-padrao", cup: true });

  it("é opcional: sem a opção, o banco é o de sempre, e o resto não muda com ela", () => {
    const plain = generateDefaultBank({ seed: "copa-padrao" });
    expect(plain.competitions).toHaveLength(1);
    const { competitions: _a, ...withoutCup } = bank;
    const { competitions: _b, ...rest } = plain;
    expect(withoutCup).toEqual(rest);
    expect(bank.competitions[0]).toEqual(plain.competitions[0]);
  });

  it("tem seis fases: a primeira com os 16 de menor reputação, a Série A entra na de 32", () => {
    const cup = bank.competitions[1];
    if (cup?.format.type !== "knockout") throw new Error("sem copa");
    expect(cup.id).toBe("copa-nacional");
    expect(cup.name).toBe("Copa Valtoriana");
    expect(cup.format.phases.map((phase) => phase.name)).toEqual([
      "Primeira fase",
      "Fase de 32",
      "Oitavas de final",
      "Quartas de final",
      "Semifinal",
      "Final",
    ]);
    expect(cup.format.phases.map((phase) => phase.legs)).toEqual([1, 1, 2, 2, 2, 1]);
    expect(cup.format.phases.at(-1)?.neutral).toBe(true);
    expect(cup.divisions[0]?.clubIds).toHaveLength(40);
    const entering = cup.format.entries?.[0];
    expect(entering?.phase).toBe(1);
    expect(entering?.clubIds).toHaveLength(24);
    const serieA = bank.competitions[0]?.divisions[0]?.clubIds ?? [];
    for (const clubId of serieA) expect(entering?.clubIds).toContain(clubId);
    expect(totalLegs(cup.format)).toBe(9);
  });

  it("joga a copa inteira com 53 jogos e um campeão", () => {
    const world = completeHiddenAttributes(bank, "copa-padrao");
    const created = createCupSeason(world, { competitionId: "copa-nacional", seed: "c" });
    if (!created.ok) throw new Error(JSON.stringify(created.error));
    expect(phaseRounds(knockoutFormat(world, "copa-nacional"))).toHaveLength(6);
    expect(ensurePhaseDrawn(created.season, world, 0).bracket?.phases[0]?.ties).toHaveLength(8);
    const done = playCup(world, created.season);
    // Primeira fase e fase de 32 em jogo único; oitavas, quartas e semifinal em ida e volta; final única.
    expect(done.records).toHaveLength(8 + 16 + 16 + 8 + 4 + 1);
  }, 120_000);

  it("um banco de 12 clubes por divisão (Norvália) também fecha as fases", () => {
    const small = generateDefaultBank({ seed: "norvalia", cup: true, divisionSize: 12 });
    const cup = small.competitions[1];
    if (cup?.format.type !== "knockout") throw new Error("sem copa");
    // 24 clubes: 16 abrem (8 jogos) e 8 entram na fase de 16.
    expect(cup.format.phases.map((phase) => phase.name)).toEqual([
      "Primeira fase",
      "Oitavas de final",
      "Quartas de final",
      "Semifinal",
      "Final",
    ]);
    expect(cup.format.entries?.[0]?.clubIds).toHaveLength(8);
  });
});
