import { describe, expect, it } from "vitest";
import { nextComposition } from "../../src/career/composition";
import { createLeagueSeason, divisionSeason } from "../../src/career/league";
import { advanceLeague } from "../../src/career/league-round";
import { seasonTurnover } from "../../src/career/turnover";
import type { LeagueSeason } from "../../src/career/types";
import type { CompletedBank } from "../../src/model/types";
import { standings } from "../../src/season/standings";
import { finalOrder } from "../../src/stages/ranking";
import { LOWER_LEVEL, regionalBank, STAGES_ID } from "../fixtures/stages-bank";

// 019 (T064): acesso, rebaixamento e a virada de temporada de divisões em fases (US5).
const SEED = "fases-virada";

function play(world: CompletedBank, league: LeagueSeason): LeagueSeason {
  const played = advanceLeague(league, world, { toEnd: true });
  if (!played.ok) throw new Error(JSON.stringify(played.error));
  return played.league;
}

describe("a divisão em fases embaixo (regional)", () => {
  const world = regionalBank();
  const created = createLeagueSeason(world, { competitionId: STAGES_ID, careerSeed: SEED });
  if (!created.ok) throw new Error(JSON.stringify(created.error));
  const finished = play(world, created.league);
  const lower = divisionSeason(finished, LOWER_LEVEL);
  const upper = divisionSeason(finished, 1);
  if (!lower || !upper) throw new Error("sem divisões");
  const order = finalOrder(lower, world);
  const moves = nextComposition(finished, world);

  it("sobem os dois finalistas e a divisão de cima rebaixa o mesmo número", () => {
    expect(moves.promoted[LOWER_LEVEL]).toEqual(order.slice(0, 2));
    expect(moves.relegated[1]).toHaveLength(2);
    expect(moves.relegated[1]).toEqual(
      standings(upper, world)
        .slice(-2)
        .map((row) => row.clubId),
    );
  });

  it("a virada troca os clubes de divisão e a fase de grupos seguinte sorteia a nova composição", () => {
    const turned = seasonTurnover(finished, world, [], { careerSeed: SEED });
    if (!turned.ok) throw new Error(JSON.stringify(turned.error));
    const nextLower = divisionSeason(turned.league, LOWER_LEVEL);
    const nextUpper = divisionSeason(turned.league, 1);
    expect(nextUpper?.clubIds).toHaveLength(8);
    expect(nextLower?.clubIds).toHaveLength(20);
    for (const promoted of moves.promoted[LOWER_LEVEL] ?? []) {
      expect(nextUpper?.clubIds).toContain(promoted);
      expect(nextLower?.clubIds).not.toContain(promoted);
    }
    for (const relegated of moves.relegated[1] ?? []) {
      expect(nextLower?.clubIds).toContain(relegated);
    }
    const inGroups = nextLower?.stages?.[0]?.groups?.flatMap((group) => group.clubIds).sort();
    expect(inGroups).toEqual([...(nextLower?.clubIds ?? [])].sort());
    expect(nextLower?.stages?.[0]?.started).toBe(true);
    expect(nextLower?.stages?.[1]?.started).toBe(false);
  });

  it("o histórico guarda o campeão da divisão em fases e a posição final de cada clube", () => {
    const turned = seasonTurnover(finished, world, [], { careerSeed: SEED });
    if (!turned.ok) throw new Error(JSON.stringify(turned.error));
    const entry = turned.history[0]?.divisions.find((division) => division.level === LOWER_LEVEL);
    expect(entry?.championId).toBe(order[0]);
    expect(entry?.standings.map((row) => row.clubId)).toEqual(order);
    expect(entry?.standings.map((row) => row.position)).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 1),
    );
    expect(entry?.promoted).toEqual(order.slice(0, 2));
  });
});

describe("a divisão em fases no topo, com rebaixamento", () => {
  /** Troca os níveis: 20 clubes em fases em cima (rebaixa 2) e a liga de 8 clubes embaixo. */
  function stagedTop(): CompletedBank {
    const copy = JSON.parse(JSON.stringify(regionalBank())) as CompletedBank;
    const competition = copy.competitions.find((entry) => entry.id === STAGES_ID);
    if (!competition) throw new Error("sem competição");
    const [small, big] = competition.divisions;
    if (!small || !big) throw new Error("sem divisões");
    big.level = 1;
    big.promotionSlots = 0;
    big.relegationSlots = 2;
    small.level = 2;
    small.promotionSlots = 2;
    small.relegationSlots = 0;
    competition.divisions = [big, small];
    return copy;
  }

  it("caem os piores da classificação geral dos grupos, entre os que não chegaram ao mata-mata", () => {
    const world = stagedTop();
    const created = createLeagueSeason(world, { competitionId: STAGES_ID, careerSeed: SEED });
    if (!created.ok) throw new Error(JSON.stringify(created.error));
    const finished = play(world, created.league);
    const top = divisionSeason(finished, 1);
    if (!top) throw new Error("sem divisão");
    const order = finalOrder(top, world);
    const knockout = new Set(top.stages?.[1]?.clubIds);
    const moves = nextComposition(finished, world);
    expect(moves.relegated[1]).toEqual(order.slice(-2));
    expect(moves.relegated[1]?.some((clubId) => knockout.has(clubId))).toBe(false);
    expect(moves.promoted[1]).toEqual([]);
    // a divisão de baixo promove o mesmo número
    expect(moves.promoted[2]).toHaveLength(2);
    expect(moves.composition[1]).toHaveLength(20);
  });
});
