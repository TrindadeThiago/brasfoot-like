import { describe, expect, it } from "vitest";
import { drawGroups, type GroupDrawClub, type GroupsRule } from "../../src/stages/groups-draw";
import { CONTINENTAL_IDS } from "../../src/worldgen/continental";
import { compactState, continentalLeague, playDays } from "../career/continental-helpers";

const SEPARATE_COUNTRY: GroupsRule["rules"] = [{ kind: "separate", attribute: "country" }];

function rule(overrides: Partial<GroupsRule> = {}): GroupsRule {
  return {
    stage: 1,
    groups: 2,
    groupSize: 4,
    pots: 4,
    previousStagePot: false,
    rules: SEPARATE_COUNTRY,
    ...overrides,
  };
}

function clubs(countries: string[]): GroupDrawClub[] {
  return countries.map((countryId, index) => ({
    id: `clube-${String(index).padStart(2, "0")}`,
    reputation: 90 - index,
    countryId,
    fromPreviousStage: false,
  }));
}

describe("grupos da taça continental (022 US1)", () => {
  it("com a taça compacta nenhum grupo repete país, e o sorteio é o mesmo para a mesma seed", () => {
    const draw = () => {
      const { state } = compactState({ seed: "continental-grupos" });
      const stage = continentalLeague(state).divisions[0]?.stages?.[0];
      const countryOf = (id: string) => state.world.clubs.find((club) => club.id === id)?.countryId;
      return { stage, countryOf };
    };
    const first = draw();
    const second = draw();
    expect(first.stage?.groups).toHaveLength(4);
    for (const group of first.stage?.groups ?? []) {
      const countries = group.clubIds.map(first.countryOf);
      expect(new Set(countries).size).toBe(countries.length);
    }
    expect(first.stage?.groups).toEqual(second.stage?.groups);
    expect(first.stage?.warnings).toBeUndefined();
  });

  it("países com 3 clubes entre 4 grupos são separados em modo estrito", () => {
    const countries = [
      "a",
      "a",
      "a",
      "b",
      "b",
      "b",
      "c",
      "c",
      "d",
      "d",
      "e",
      "e",
      "f",
      "f",
      "g",
      "g",
    ];
    const result = drawGroups(clubs(countries), rule({ groups: 4 }), "continental:draw", "strict");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const group of result.groups) {
      const present = group.clubIds.map((id) => countries[Number(id.slice(-2))]);
      expect(new Set(present).size).toBe(present.length);
    }
    expect(result.warnings).toEqual([]);
  });

  it("sem arranjo possível o sorteio afrouxa o mínimo e registra o aviso (modo carreira)", () => {
    // 3 clubes do mesmo país em 2 grupos: a separação é impossível.
    const impossible = clubs(["a", "a", "a", "b", "c", "d", "e", "f"]);
    const career = drawGroups(impossible, rule(), "continental:impossivel", "career");
    expect(career.ok).toBe(true);
    if (!career.ok) return;
    expect(career.warnings.length).toBeGreaterThan(0);
    expect(career.warnings[0]?.rule).toEqual({ kind: "separate", attribute: "country" });
    const again = drawGroups(impossible, rule(), "continental:impossivel", "career");
    expect(again.ok && again.groups).toEqual(career.groups);

    const strict = drawGroups(impossible, rule(), "continental:impossivel", "strict");
    expect(strict.ok).toBe(false);
  });

  it("o sorteio do jogo usa o mesmo caminho: a fase de grupos da taça compacta é jogada", () => {
    const { state, manager, seed } = compactState({ seed: "continental-grupos" });
    const middle = playDays(state, 8, seed, manager);
    const season = continentalLeague(middle).divisions[0];
    expect(season?.competitionId).toBe(CONTINENTAL_IDS.major);
    expect(season?.records.length).toBeGreaterThan(0);
  }, 120_000);
});
