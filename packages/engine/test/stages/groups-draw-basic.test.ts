import { describe, expect, it } from "vitest";
import { drawGroups, type GroupDrawClub, type GroupsRule } from "../../src/stages/groups-draw";

// 019 (T016): sorteio simples dos grupos, sem potes nem regras (research.md R6, base do US3).
function clubs(count: number): GroupDrawClub[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `c${String(index + 1).padStart(2, "0")}`,
    reputation: 100 - index,
    countryId: "pais",
    fromPreviousStage: false,
  }));
}

const rule: GroupsRule = { stage: 0, groups: 4, groupSize: 5, previousStagePot: false, rules: [] };

function groupsOf(result: ReturnType<typeof drawGroups>) {
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.groups;
}

describe("drawGroups sem potes nem regras", () => {
  it("divide os clubes em grupos do tamanho dado, cada clube uma vez, com letras como nomes", () => {
    const groups = groupsOf(drawGroups(clubs(20), rule, "semente", "career"));
    expect(groups.map((group) => group.id)).toEqual(["A", "B", "C", "D"]);
    expect(groups.every((group) => group.clubIds.length === 5)).toBe(true);
    expect(groups.flatMap((group) => group.clubIds).sort()).toEqual(clubs(20).map((c) => c.id));
    for (const group of groups) expect(group.clubIds).toEqual([...group.clubIds].sort());
  });

  it("mesma seed ⇒ mesmos grupos, em qualquer ordem de entrada", () => {
    const base = clubs(20);
    const first = groupsOf(drawGroups(base, rule, "semente", "career"));
    const shuffled = [...base].reverse();
    expect(groupsOf(drawGroups(shuffled, rule, "semente", "career"))).toEqual(first);
    expect(groupsOf(drawGroups(base, rule, "semente", "strict"))).toEqual(first);
  });

  it("seeds diferentes dão sorteios diferentes", () => {
    const seen = new Set(
      ["a", "b", "c", "d", "e"].map((seed) =>
        JSON.stringify(groupsOf(drawGroups(clubs(20), rule, seed, "career"))),
      ),
    );
    expect(seen.size).toBeGreaterThan(1);
  });

  it("devolve um aviso vazio quando nada foi afrouxado", () => {
    const result = drawGroups(clubs(20), rule, "semente", "career");
    expect(result.ok && result.warnings).toEqual([]);
  });

  it("falha se o número de clubes não fecha os grupos (erro de programação, a validação já recusa)", () => {
    expect(() => drawGroups(clubs(19), rule, "s", "career")).toThrow();
  });
});
