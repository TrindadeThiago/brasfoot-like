import { describe, expect, it } from "vitest";
import { drawGroups, type GroupDrawClub, type GroupsRule } from "../../src/stages/groups-draw";
import { GROUP_DRAW_TUNING } from "../../src/stages/rules";
import { lcg } from "./helpers";

// 019 (T049): centenas de sorteios viáveis sem violação, e o teto de busca nos inviáveis.
const COUNTRIES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const REGIONS = ["n", "s", "l", "o"];

/** `groups × size` clubes: `countries` países por rodízio (viável se `countries ≥ groups`... por contagem). */
function instance(groups: number, size: number, seed: number, mixed: boolean): GroupDrawClub[] {
  const next = lcg(seed);
  const total = groups * size;
  const order = Array.from({ length: total }, (_, index) => index).sort(() => next() - 0.5);
  return Array.from({ length: total }, (_, index) => ({
    id: `p${String(index + 1).padStart(3, "0")}`,
    reputation: Math.floor(next() * 100),
    // cada país tem no máximo `groups` clubes: sempre viável
    countryId: COUNTRIES[(order[index] ?? 0) % Math.ceil(total / groups)] ?? "z",
    ...(mixed ? { region: REGIONS[Math.floor(next() * REGIONS.length)] as string } : {}),
    fromPreviousStage: false,
  }));
}

function rule(groups: number, size: number, extra: Partial<GroupsRule> = {}): GroupsRule {
  return {
    stage: 0,
    groups,
    groupSize: size,
    previousStagePot: false,
    rules: [{ kind: "separate", attribute: "country" }],
    ...extra,
  };
}

describe("300 sorteios com separação viável", () => {
  it("nenhum viola a separação por país nem os potes, em tamanhos variados", () => {
    let draws = 0;
    for (const [groups, size] of [
      [4, 4],
      [8, 4],
      [6, 4],
      [4, 5],
      [8, 3],
    ] as const) {
      for (let seed = 1; seed <= 60; seed++) {
        const clubs = instance(groups, size, seed, true);
        const byId = new Map(clubs.map((entry) => [entry.id, entry]));
        const potted = size <= 8 && seed % 2 === 0;
        const result = drawGroups(
          clubs,
          rule(groups, size, {
            ...(potted ? { pots: size } : {}),
            rules: [
              { kind: "separate", attribute: "country" },
              { kind: "concentrate", attribute: "region" },
            ],
          }),
          `prop-${groups}-${size}-${seed}`,
          "strict",
        );
        draws++;
        if (!result.ok) throw new Error(JSON.stringify(result.error));
        expect(result.warnings).toEqual([]);
        for (const group of result.groups) {
          const countries = group.clubIds.map((id) => byId.get(id)?.countryId);
          expect(new Set(countries).size).toBe(countries.length);
          expect(group.clubIds).toHaveLength(size);
        }
        if (potted) {
          const ranked = [...clubs].sort(
            (a, b) => b.reputation - a.reputation || (a.id < b.id ? -1 : 1),
          );
          const pot = new Map(ranked.map((entry, index) => [entry.id, Math.floor(index / groups)]));
          for (const group of result.groups) {
            expect(new Set(group.clubIds.map((id) => pot.get(id))).size).toBe(size);
          }
        }
      }
    }
    expect(draws).toBe(300);
  });
});

describe("teto de busca", () => {
  it("uma separação impossível em escala grande termina dentro do teto, de forma determinística", () => {
    const clubs: GroupDrawClub[] = Array.from({ length: 64 }, (_, index) => ({
      id: `m${String(index + 1).padStart(2, "0")}`,
      reputation: 100 - index,
      countryId: index < 40 ? "x" : `p${index}`,
      fromPreviousStage: false,
    }));
    const big = rule(8, 8, { pots: 8 });
    const first = drawGroups(clubs, big, "teto", "career");
    const again = drawGroups([...clubs].reverse(), big, "teto", "career");
    if (!first.ok || !again.ok) throw new Error("devia concluir na carreira");
    expect(first.groups).toEqual(again.groups);
    expect(first.warnings.length).toBeGreaterThan(0);
    expect(first.nodes).toBeLessThanOrEqual(2 * GROUP_DRAW_TUNING.nodeBudget + clubs.length);
    expect(first.groups.flatMap((group) => group.clubIds)).toHaveLength(64);
  });
});
