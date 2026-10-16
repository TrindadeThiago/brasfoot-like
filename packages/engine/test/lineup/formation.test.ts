import { describe, expect, it } from "vitest";
import { managerAutoLineup } from "../../src/lineup/auto";
import { changeFormation, placePlayer } from "../../src/lineup/formation";
import { FORMATION_IDS, slotPosition } from "../../src/match/formations";
import type { Lineup } from "../../src/match/types";
import { firstClub, slotIds, startersOf, totalStrength } from "./helpers";

const { squad } = firstClub();
const base = managerAutoLineup(squad, "4-4-2", "attacking", []).lineup;
const outside = squad
  .map((p) => p.id)
  .filter((id) => !startersOf(base).includes(id) && !base.bench.includes(id));

describe("changeFormation", () => {
  it("mantém os 11 titulares, banco e postura em todos os esquemas", () => {
    for (const formation of FORMATION_IDS) {
      const next = changeFormation(base, formation, squad);
      expect(next.formation).toBe(formation);
      expect(Object.keys(next.starters).sort()).toEqual(slotIds(formation).sort());
      expect(startersOf(next)).toEqual(startersOf(base));
      expect(next.bench).toEqual(base.bench);
      expect(next.posture).toBe("attacking");
    }
  });

  it("é a melhor distribuição dos mesmos jogadores e é determinística", () => {
    const next = changeFormation(base, "3-5-2", squad);
    expect(changeFormation(base, "3-5-2", [...squad].reverse())).toEqual(next);
    // ida e volta devolve a mesma força efetiva total
    const back = changeFormation(next, "4-4-2", squad);
    expect(totalStrength(back, squad)).toBeCloseTo(totalStrength(base, squad));
  });

  it("mesmo esquema não mexe na escalação", () => {
    expect(changeFormation(base, "4-4-2", squad)).toEqual(base);
  });

  it("escalação com vagas vazias continua com o mesmo número de titulares", () => {
    const partial: Lineup = { ...base, starters: { ...base.starters } };
    delete partial.starters.ls;
    delete partial.starters.rs;
    const next = changeFormation(partial, "4-3-3", squad);
    expect(Object.keys(next.starters)).toHaveLength(9);
    expect(startersOf(next)).toEqual(startersOf(partial));
    for (const [slotId] of Object.entries(next.starters)) {
      expect(slotPosition("4-3-3", slotId)).toBeDefined();
    }
  });
});

describe("placePlayer", () => {
  const ok = (result: ReturnType<typeof placePlayer>): Lineup => {
    if (!result.ok) throw new Error(result.code);
    return result.lineup;
  };
  const all = (lineup: Lineup) => [...Object.values(lineup.starters), ...lineup.bench];

  it("troca vaga ↔ vaga e duas trocas voltam ao original", () => {
    const once = ok(
      placePlayer(base, { kind: "slot", slotId: "gk" }, { kind: "slot", slotId: "ls" }),
    );
    expect(once.starters.gk).toBe(base.starters.ls);
    expect(once.starters.ls).toBe(base.starters.gk);
    expect(
      ok(placePlayer(once, { kind: "slot", slotId: "gk" }, { kind: "slot", slotId: "ls" })),
    ).toEqual(base);
  });

  it("troca vaga ↔ banco, vaga ↔ fora e banco ↔ fora", () => {
    const a = ok(placePlayer(base, { kind: "slot", slotId: "rs" }, { kind: "bench", index: 0 }));
    expect(a.starters.rs).toBe(base.bench[0]);
    expect(a.bench[0]).toBe(base.starters.rs);
    const b = ok(
      placePlayer(
        base,
        { kind: "out", playerId: outside[0] as string },
        { kind: "slot", slotId: "rs" },
      ),
    );
    expect(b.starters.rs).toBe(outside[0]);
    expect(all(b)).not.toContain(base.starters.rs);
    const c = ok(
      placePlayer(
        base,
        { kind: "bench", index: 1 },
        { kind: "out", playerId: outside[0] as string },
      ),
    );
    expect(c.bench[1]).toBe(outside[0]);
    expect(c.bench).not.toContain(base.bench[1]);
  });

  it("vaga vazia recebe o jogador; posição livre do banco acrescenta", () => {
    const partial: Lineup = {
      ...base,
      starters: { ...base.starters },
      bench: base.bench.slice(0, 3),
    };
    delete partial.starters.ls;
    const a = ok(placePlayer(partial, { kind: "bench", index: 0 }, { kind: "slot", slotId: "ls" }));
    expect(a.starters.ls).toBe(partial.bench[0]);
    expect(a.bench).toEqual(partial.bench.slice(1));
    const b = ok(
      placePlayer(
        partial,
        { kind: "out", playerId: outside[0] as string },
        { kind: "bench", index: 3 },
      ),
    );
    expect(b.bench).toEqual([...partial.bench, outside[0]]);
    const c = ok(placePlayer(partial, { kind: "slot", slotId: "gk" }, { kind: "bench", index: 3 }));
    expect(c.starters.gk).toBeUndefined();
    expect(c.bench.at(-1)).toBe(partial.starters.gk);
  });

  it("banco cheio recusa um jogador novo", () => {
    expect(base.bench).toHaveLength(12);
    expect(
      placePlayer(
        base,
        { kind: "out", playerId: outside[0] as string },
        { kind: "bench", index: 12 },
      ),
    ).toEqual({
      ok: false,
      code: "bench_full",
    });
  });

  it("origem vazia é recusada e nunca há jogador repetido", () => {
    const partial: Lineup = { ...base, starters: { ...base.starters } };
    delete partial.starters.ls;
    expect(
      placePlayer(partial, { kind: "slot", slotId: "ls" }, { kind: "slot", slotId: "gk" }),
    ).toEqual({
      ok: false,
      code: "empty_source",
    });
    const places = [
      { kind: "slot", slotId: "gk" },
      { kind: "slot", slotId: "rm" },
      { kind: "bench", index: 0 },
      { kind: "bench", index: 5 },
      { kind: "out", playerId: outside[0] as string },
    ] as const;
    for (const from of places) {
      for (const to of places) {
        const result = placePlayer(base, from, to);
        if (!result.ok) continue;
        const ids = all(result.lineup);
        expect(new Set(ids).size).toBe(ids.length);
      }
    }
  });
});
