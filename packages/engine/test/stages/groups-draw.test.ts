import { describe, expect, it } from "vitest";
import { drawGroups, type GroupDrawClub, type GroupsRule } from "../../src/stages/groups-draw";
import type { GroupState } from "../../src/stages/types";

// 019 (T048): sorteio dos grupos com potes e regras (research.md R6).
function club(
  id: string,
  reputation: number,
  countryId: string,
  extra: Partial<GroupDrawClub> = {},
) {
  return { id, reputation, countryId, fromPreviousStage: false, ...extra } as GroupDrawClub;
}

const rule = (extra: Partial<GroupsRule> = {}): GroupsRule => ({
  stage: 0,
  groups: 4,
  groupSize: 4,
  previousStagePot: false,
  rules: [],
  ...extra,
});

function ok(result: ReturnType<typeof drawGroups>) {
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result;
}

const byId = new Map<string, GroupDrawClub>();
function register(clubs: GroupDrawClub[]) {
  for (const entry of clubs) byId.set(entry.id, entry);
  return clubs;
}

/** 16 clubes de 4 países (4 por país), reputação decrescente: c01 é o mais forte. */
function sixteen(): GroupDrawClub[] {
  return register(
    Array.from({ length: 16 }, (_, index) =>
      club(
        `c${String(index + 1).padStart(2, "0")}`,
        100 - index,
        ["a", "b", "c", "d"][index % 4] as string,
      ),
    ),
  );
}

const potOfRank = (clubId: string, pots: number, groups: number) =>
  Math.floor((Number(clubId.slice(1)) - 1) / groups) % pots;

describe("potes", () => {
  it("formam blocos pela reputação e cada grupo recebe um clube de cada pote", () => {
    const groups = ok(drawGroups(sixteen(), rule({ pots: 4 }), "potes", "career")).groups;
    for (const group of groups) {
      expect(group.clubIds.map((id) => potOfRank(id, 4, 4)).sort()).toEqual([0, 1, 2, 3]);
    }
  });

  it("o último pote pode ser formado pelos classificados da fase anterior", () => {
    const clubs = register(
      sixteen().map((entry, index) => ({ ...entry, fromPreviousStage: index % 4 === 3 })),
    );
    const origin = new Set(
      clubs.filter((entry) => entry.fromPreviousStage).map((entry) => entry.id),
    );
    expect(origin.size).toBe(4);
    const groups = ok(
      drawGroups(clubs, rule({ pots: 4, previousStagePot: true }), "origem", "career"),
    ).groups;
    for (const group of groups) {
      expect(group.clubIds.filter((id) => origin.has(id))).toHaveLength(1);
    }
    // os demais 12 formam os potes 1 a 3 pela reputação
    const direct = clubs.filter((entry) => !origin.has(entry.id));
    const rank = new Map(
      [...direct]
        .sort((a, b) => b.reputation - a.reputation)
        .map((entry, index) => [entry.id, index]),
    );
    for (const group of groups) {
      const pots = group.clubIds
        .filter((id) => !origin.has(id))
        .map((id) => Math.floor((rank.get(id) ?? 0) / 4));
      expect(pots.sort()).toEqual([0, 1, 2]);
    }
  });
});

describe("separação", () => {
  const separate = (attribute: "country" | "region", exemptPots?: number[]) =>
    ({ kind: "separate", attribute, ...(exemptPots ? { exemptPots } : {}) }) as const;

  it("por país: nenhum grupo tem dois clubes do mesmo país", () => {
    for (const seed of ["s1", "s2", "s3", "s4", "s5"]) {
      const groups = ok(
        drawGroups(sixteen(), rule({ pots: 4, rules: [separate("country")] }), seed, "career"),
      ).groups;
      for (const group of groups) {
        const countries = group.clubIds.map((id) => byId.get(id)?.countryId);
        expect(new Set(countries).size).toBe(4);
      }
    }
  });

  it("por região: clubes sem região não entram na regra", () => {
    const clubs = register(
      sixteen().map((entry, index) =>
        index < 8 ? { ...entry, region: ["x", "y", "z", "w"][index % 4] as string } : entry,
      ),
    );
    const groups = ok(
      drawGroups(clubs, rule({ rules: [separate("region")] }), "r", "career"),
    ).groups;
    for (const group of groups) {
      const regions = group.clubIds.map((id) => byId.get(id)?.region).filter(Boolean);
      expect(new Set(regions).size).toBe(regions.length);
    }
  });

  it("potes isentos: os clubes do pote isento podem dividir o grupo com o mesmo país", () => {
    // 5 clubes do país x; 4 deles são os classificados da fase anterior (pote 4, isento)
    const clubs = register(
      Array.from({ length: 16 }, (_, index) => {
        const id = `d${String(index + 1).padStart(2, "0")}`;
        const origin = index >= 12;
        return club(id, 100 - index, index === 0 || origin ? "x" : `p${index}`, {
          fromPreviousStage: origin,
        });
      }),
    );
    const withExemption = rule({
      pots: 4,
      previousStagePot: true,
      rules: [separate("country", [4])],
    });
    const result = ok(drawGroups(clubs, withExemption, "isento", "strict"));
    expect(result.warnings).toEqual([]);
    for (const group of result.groups) {
      const direct = group.clubIds.filter((id) => !byId.get(id)?.fromPreviousStage);
      const countries = direct.map((id) => byId.get(id)?.countryId);
      expect(new Set(countries).size).toBe(countries.length);
    }
    // sem a isenção, 5 clubes do mesmo país em 4 grupos não cabem
    const strict = drawGroups(
      clubs,
      rule({ pots: 4, previousStagePot: true, rules: [separate("country")] }),
      "isento",
      "strict",
    );
    expect(strict.ok).toBe(false);
  });
});

describe("concentração por região", () => {
  /** 20 clubes em 4 regiões de 7, 5, 4 e 4 clubes; grupos de 5. */
  function regional(): GroupDrawClub[] {
    const sizes = [7, 5, 4, 4];
    const names = ["norte", "sul", "leste", "oeste"];
    const clubs: GroupDrawClub[] = [];
    sizes.forEach((size, region) => {
      for (let index = 0; index < size; index++) {
        clubs.push(
          club(`r${region}-${index}`, 50 + index, "pais", { region: names[region] as string }),
        );
      }
    });
    return register(clubs);
  }
  const concentrate = { kind: "concentrate", attribute: "region" } as const;
  const regionRule = rule({ groups: 4, groupSize: 5, rules: [concentrate] });

  function span(groups: GroupState[], region: string): number[] {
    return groups
      .map((group, index) =>
        group.clubIds.some((id) => byId.get(id)?.region === region) ? index : -1,
      )
      .filter((index) => index >= 0);
  }

  it("cada região ocupa grupos consecutivos, no máximo um além do mínimo (SC-003)", () => {
    const sizes: Record<string, number> = { norte: 7, sul: 5, leste: 4, oeste: 4 };
    for (let seed = 0; seed < 30; seed++) {
      const groups = ok(drawGroups(regional(), regionRule, `conc-${seed}`, "career")).groups;
      expect(groups.every((group) => group.clubIds.length === 5)).toBe(true);
      for (const [region, size] of Object.entries(sizes)) {
        const occupied = span(groups, region);
        expect((occupied.at(-1) ?? 0) - (occupied[0] ?? 0) + 1).toBe(occupied.length);
        expect(occupied.length).toBeLessThanOrEqual(Math.ceil(size / 5) + 1);
      }
    }
  });

  it("a separação vence a concentração quando as duas pedem o contrário", () => {
    const clubs = register(
      Array.from({ length: 16 }, (_, index) =>
        club(`z${String(index + 1).padStart(2, "0")}`, 80 - index, "p", {
          region: ["n", "s", "l", "o"][index % 4] as string,
        }),
      ),
    );
    const both = rule({ rules: [concentrate, { kind: "separate", attribute: "region" }] });
    const result = ok(drawGroups(clubs, both, "ambas", "strict"));
    for (const group of result.groups) {
      const regions = group.clubIds.map((id) => byId.get(id)?.region);
      expect(new Set(regions).size).toBe(4);
    }
  });

  it("nunca falha nem avisa, mesmo quando não cabe", () => {
    const odd = register(
      Array.from({ length: 20 }, (_, index) =>
        club(`o${String(index + 1).padStart(2, "0")}`, 60 - index, "p", {
          region: `r${index % 3}`,
        }),
      ),
    );
    const result = ok(drawGroups(odd, regionRule, "nao-cabe", "strict"));
    expect(result.warnings).toEqual([]);
    expect(result.groups.flatMap((group) => group.clubIds)).toHaveLength(20);
  });
});

describe("separação impossível", () => {
  /** 9 dos 16 clubes são do mesmo país: com 4 grupos, no mínimo 6 pares se encontram (3+2+2+2). */
  function crowded(): GroupDrawClub[] {
    return register(
      Array.from({ length: 16 }, (_, index) =>
        club(`k${String(index + 1).padStart(2, "0")}`, 90 - index, index < 9 ? "x" : `p${index}`),
      ),
    );
  }
  const separateCountry = rule({ pots: 4, rules: [{ kind: "separate", attribute: "country" }] });

  function violatingPairs(groups: GroupState[]): number {
    let pairs = 0;
    for (const group of groups) {
      const same = group.clubIds.filter((id) => byId.get(id)?.countryId === "x").length;
      pairs += (same * (same - 1)) / 2;
    }
    return pairs;
  }

  it("na carreira conclui com todos os clubes em algum grupo, o mínimo de violações e um aviso", () => {
    const result = ok(drawGroups(crowded(), separateCountry, "lotado", "career"));
    expect(result.groups.flatMap((group) => group.clubIds).sort()).toEqual(
      crowded().map((entry) => entry.id),
    );
    expect(violatingPairs(result.groups)).toBe(6);
    expect(result.warnings.length).toBeGreaterThan(0);
    for (const warning of result.warnings) {
      expect(warning.stage).toBe(0);
      expect(warning.rule).toEqual({ kind: "separate", attribute: "country" });
      expect(warning.clubIds.length).toBeGreaterThanOrEqual(2);
      expect(warning.clubIds.every((id) => byId.get(id)?.countryId === "x")).toBe(true);
    }
  });

  it("os potes nunca são afrouxados", () => {
    const result = ok(drawGroups(crowded(), separateCountry, "lotado", "career"));
    for (const group of result.groups) {
      expect(group.clubIds.map((id) => potOfRank(id, 4, 4)).sort()).toEqual([0, 1, 2, 3]);
    }
  });

  it("no modo estrito falha com a fase, a regra e os clubes em conflito, sem grupos", () => {
    const result = drawGroups(crowded(), separateCountry, "lotado", "strict");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("stages.draw_impossible");
    expect(result.error.stage).toBe(0);
    expect(result.error.rule).toEqual({ kind: "separate", attribute: "country" });
    expect(result.error.clubIds.length).toBeGreaterThanOrEqual(2);
  });

  it("é determinística, em qualquer ordem de entrada", () => {
    const a = ok(drawGroups(crowded(), separateCountry, "lotado", "career"));
    const b = ok(drawGroups([...crowded()].reverse(), separateCountry, "lotado", "career"));
    expect(b.groups).toEqual(a.groups);
    expect(b.warnings).toEqual(a.warnings);
  });
});
