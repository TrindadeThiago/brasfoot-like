import { describe, expect, it } from "vitest";
import { adjustLineup } from "../../src/lineup/adjust";
import { managerAutoLineup } from "../../src/lineup/auto";
import { validateLineup } from "../../src/lineup/validate";
import { slotValue } from "../../src/match/auto-lineup";
import { slotPosition } from "../../src/match/formations";
import { firstClub, injured, suspended } from "./helpers";

const { squad } = firstClub();
const base = managerAutoLineup(squad, "4-3-3", "attacking", []).lineup;
const byId = new Map(squad.map((player) => [player.id, player]));

describe("adjustLineup (FR-015, FR-016)", () => {
  it("sem indisponíveis na escalação não muda nada", () => {
    const outside = squad.find(
      (p) => !Object.values(base.starters).includes(p.id) && !base.bench.includes(p.id),
    );
    const result = adjustLineup(base, squad, outside ? [injured(outside.id)] : []);
    expect(result).toEqual({ lineup: base, changes: [] });
  });

  it("reserva indisponível sai do banco", () => {
    const reserve = base.bench[2] as string;
    const result = adjustLineup(base, squad, [suspended(reserve)]);
    expect(result.lineup.bench).toEqual(base.bench.filter((id) => id !== reserve));
    expect(result.changes).toEqual([
      { kind: "bench_removed", outId: reserve, reason: "suspension" },
    ]);
    expect(result.lineup.starters).toEqual(base.starters);
  });

  it("titular indisponível é trocado pelo melhor disponível para a vaga; o resto fica", () => {
    const out = base.starters.st as string;
    const result = adjustLineup(base, squad, [injured(out, 2)]);
    const inId = result.lineup.starters.st as string;
    expect(inId).not.toBe(out);
    const position = slotPosition("4-3-3", "st");
    if (!position) throw new Error("vaga");
    const starters = new Set(Object.values(base.starters));
    const best = Math.max(
      ...squad
        .filter((p) => p.id !== out && !starters.has(p.id))
        .map((p) => slotValue(p, position)),
    );
    expect(slotValue(byId.get(inId) as never, position)).toBe(best);
    for (const [slotId, playerId] of Object.entries(base.starters)) {
      if (slotId !== "st") expect(result.lineup.starters[slotId]).toBe(playerId);
    }
    expect(result.lineup.bench).not.toContain(inId);
    expect(result.changes).toEqual([
      { kind: "starter_replaced", slotId: "st", outId: out, inId, reason: "injury" },
    ]);
    expect(validateLineup(result.lineup, squad, [injured(out, 2)]).valid).toBe(true);
  });

  it("é idempotente", () => {
    const unavailable = [
      injured(base.starters.st as string),
      suspended(base.starters.gk as string),
      injured(base.bench[0] as string),
    ];
    const once = adjustLineup(base, squad, unavailable);
    const twice = adjustLineup(once.lineup, squad, unavailable);
    expect(twice).toEqual({ lineup: once.lineup, changes: [] });
    expect(validateLineup(once.lineup, squad, unavailable).valid).toBe(true);
  });

  it("menos de 11 disponíveis: vira a escalação automática com aviso de elenco curto", () => {
    const ids = squad.map((player) => player.id).sort();
    const unavailable = ids
      .slice(0, ids.length - 10)
      .map((id, index) => injured(id, (index % 3) + 1));
    const result = adjustLineup(base, squad, unavailable);
    const auto = managerAutoLineup(squad, "4-3-3", "attacking", unavailable);
    expect(result.lineup).toEqual(auto.lineup);
    expect(result.changes).toEqual([{ kind: "short_squad", fielded: auto.fielded }]);
    expect(adjustLineup(result.lineup, squad, unavailable).changes).toEqual([]);
  });
});
