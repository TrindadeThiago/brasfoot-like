import { describe, expect, it } from "vitest";
import type { Competition, ModPackage, StageFormat } from "../../src/model/types";
import { validateBank } from "../../src/validation/validate";
import {
  continentalPackage,
  extrasPackage,
  groupsStage,
  knockoutAfterGroups,
  regionalPackage,
} from "../fixtures/stages-bank";
import { at } from "../helpers/build-bank";

// 019 (T042): bancos com fases válidos são aceitos; os inválidos têm um caso por código em cases.ts.
const POINTS = { win: 3, draw: 1, loss: 0 };

function errorsOf(bank: ModPackage) {
  const result = validateBank(bank);
  return result.ok ? [] : result.errors;
}

function lowerOf(bank: ModPackage) {
  return at(at(bank.competitions, 0).divisions, 1);
}

describe("bancos com fases válidos", () => {
  it("grupos regionais seguidos de mata-mata", () => {
    const result = validateBank(regionalPackage());
    expect(result.ok).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it("vagas extras da posição seguinte", () => {
    const result = validateBank(extrasPackage());
    expect(result.ok).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it("competição continental: preliminar, grupos com potes e separação, mata-mata", () => {
    const result = validateBank(continentalPackage());
    expect(result.ok).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it("pontos corridos seguidos de playoff", () => {
    const bank = regionalPackage();
    lowerOf(bank).stages = [
      { type: "league", rounds: 1, points: POINTS, tiebreakers: ["goal-difference"], qualified: 4 },
      knockoutAfterGroups(4),
    ];
    expect(errorsOf(bank)).toEqual([]);
  });

  it("duas fases de grupos em sequência", () => {
    const bank = regionalPackage();
    // 20 clubes em 4 grupos de 5, 2 por grupo = 8 clubes; 2 grupos de 4, 2 por grupo = 4 clubes
    lowerOf(bank).stages = [groupsStage(5, 2), groupsStage(4, 2), knockoutAfterGroups(4)];
    expect(errorsOf(bank)).toEqual([]);
  });

  it("uma competição inteira em grupos (format.type groups)", () => {
    const bank = regionalPackage();
    const competition = at(bank.competitions, 0) as Competition;
    competition.format = groupsStage(5, 2);
    for (const division of competition.divisions) delete division.stages;
    const lower = at(competition.divisions, 1);
    expect(lower.clubIds).toHaveLength(20);
    // a divisão de cima (8 clubes) não forma grupos de 5: só a de baixo vale como exemplo
    competition.divisions = [lower];
    delete competition.economy;
    lower.level = 1;
    lower.promotionSlots = 0;
    lower.relegationSlots = 0;
    bank.clubs = bank.clubs.filter((club) => lower.clubIds.includes(club.id));
    bank.players = bank.players.filter((player) => lower.clubIds.includes(player.clubId));
    bank.rivalries = [];
    const stage = competition.format;
    if (stage.type === "groups") delete stage.qualified;
    expect(errorsOf(bank)).toEqual([]);
  });
});

describe("pontuação e desempate de cada fase", () => {
  it("uma fase de grupos com vitória valendo o mesmo que empate é recusada", () => {
    const bank = regionalPackage();
    (lowerOf(bank).stages as StageFormat[])[0] = groupsStage(5, 2, {
      points: { win: 1, draw: 1, loss: 0 },
    });
    const codes = errorsOf(bank).map((issue) => [issue.code, issue.path]);
    expect(codes).toContainEqual([
      "format.points_order",
      [0, "divisions", 1, "stages", 0, "points"],
    ]);
  });

  it("um critério de desempate repetido é recusado", () => {
    const bank = regionalPackage();
    (lowerOf(bank).stages as StageFormat[])[0] = groupsStage(5, 2, {
      tiebreakers: ["wins", "wins"],
    });
    const codes = errorsOf(bank).map((issue) => issue.code);
    expect(codes).toContain("format.duplicate_tiebreaker");
  });
});

describe("mata-mata dentro de uma sequência", () => {
  it("uma fase sem critério que decida e campo neutro em ida e volta são recusados", () => {
    const bank = regionalPackage();
    const knockout = (lowerOf(bank).stages as StageFormat[])[1];
    if (knockout?.type !== "knockout") throw new Error("sem mata-mata");
    knockout.phases[0] = { ...at(knockout.phases, 0), tiebreakers: ["away-goals"] };
    knockout.phases[1] = { ...at(knockout.phases, 1), legs: 2, neutral: true };
    const codes = errorsOf(bank).map((issue) => issue.code);
    expect(codes).toContain("knockout.no_decider");
    expect(codes).toContain("knockout.neutral_two_legs");
  });

  it("uma entrada em fase inexistente é recusada", () => {
    const bank = regionalPackage();
    const knockout = (lowerOf(bank).stages as StageFormat[])[1];
    if (knockout?.type !== "knockout") throw new Error("sem mata-mata");
    knockout.entries = [{ phase: 5, clubIds: [] }];
    expect(errorsOf(bank).map((issue) => issue.code)).toContain("knockout.entry_phase");
  });
});

describe("não regride o que já existia", () => {
  it("um banco sem fases nunca gera códigos stages.*", () => {
    const result = validateBank(JSON.parse(JSON.stringify(regionalPackage())) as ModPackage);
    const issues = result.ok ? result.warnings : [...result.errors, ...result.warnings];
    expect(issues.filter((issue) => issue.code.startsWith("stages."))).toEqual([]);
  });
});

describe("tabela própria de confrontos", () => {
  const pairs = (list: [string, string][]) => {
    const bank = regionalPackage();
    const knockout = (lowerOf(bank).stages as StageFormat[])[1];
    if (knockout?.type !== "knockout") throw new Error("sem mata-mata");
    knockout.pairs = list;
    return errorsOf(bank).filter((issue) => issue.code === "stages.pairs_invalid");
  };
  const full: [string, string][] = [
    ["A1", "B2"],
    ["B1", "A2"],
    ["C1", "D2"],
    ["D1", "C2"],
  ];

  it("uma tabela que usa todos os classificados uma vez é aceita", () => {
    expect(pairs(full)).toEqual([]);
  });

  it("recusa origem repetida, posição que não classifica e vaga extra que não existe", () => {
    expect(pairs([...full.slice(0, 3), ["D1", "A1"]]).map((i) => i.params.origin)).toContain("A1");
    expect(pairs([["A3", "B2"], ...full.slice(1)]).map((i) => i.params.origin)).toContain("A3");
    expect(pairs([["X1", "B2"], ...full.slice(1)]).map((i) => i.params.origin)).toContain("X1");
  });

  it("recusa a tabela que deixa classificados de fora", () => {
    expect(pairs(full.slice(0, 3)).length).toBeGreaterThan(0);
  });
});

describe("rebaixamento de uma divisão em fases", () => {
  it("não pode passar do número de clubes que ficam fora da fase seguinte", () => {
    const bank = regionalPackage();
    const lower = lowerOf(bank);
    // 20 clubes, 8 classificados: 12 ficam pelo caminho
    lower.relegationSlots = 13;
    const issue = errorsOf(bank).find(
      (entry) => entry.code === "stages.relegation_exceeds_eliminated",
    );
    expect(issue?.params).toEqual({ level: 2, relegation: 13, eliminated: 12 });
    expect(issue?.path).toEqual([0, "divisions", 1, "relegationSlots"]);
    lower.relegationSlots = 12;
    expect(
      errorsOf(bank).some((entry) => entry.code === "stages.relegation_exceeds_eliminated"),
    ).toBe(false);
  });
});
