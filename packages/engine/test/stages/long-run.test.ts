import { describe, expect, it } from "vitest";
import { nextComposition } from "../../src/career/composition";
import { createLeagueSeason, divisionSeason } from "../../src/career/league";
import { advanceLeague } from "../../src/career/league-round";
import { seasonTurnover } from "../../src/career/turnover";
import type { LeagueSeason, SeasonHistoryEntry } from "../../src/career/types";
import { tieState } from "../../src/knockout/tie";
import type { CompletedBank } from "../../src/model/types";
import { stageQualifiers } from "../../src/stages/classification";
import { cupView } from "../../src/stages/cup-view";
import { drawGroups, type GroupDrawClub } from "../../src/stages/groups-draw";
import { finalOrder } from "../../src/stages/ranking";
import {
  extrasBank,
  LOWER_LEVEL,
  REGION_SIZES,
  regionalBank,
  STAGES_ID,
} from "../fixtures/stages-bank";

// 019 SC-001 a SC-007 (Princípio V): limites declarados aqui; valores medidos em research.md R15.
const SEASONS = 30;
const EXTRAS_SEASONS = 5;
const DRAWS_PER_SEASON = 10;
const MIN_DRAWS = 300;
const GROUP_SIZE = 5;

function span(groups: { clubIds: string[] }[], world: CompletedBank, region: string): number[] {
  const regionOf = new Map(world.clubs.map((club) => [club.id, club.region]));
  return groups
    .map((group, index) => (group.clubIds.some((id) => regionOf.get(id) === region) ? index : -1))
    .filter((index) => index >= 0);
}

/** Cada região ocupa grupos consecutivos, no máximo um além do mínimo (SC-003). */
function expectConcentrated(groups: { clubIds: string[] }[], world: CompletedBank): void {
  const regionOf = new Map(world.clubs.map((club) => [club.id, club.region]));
  const sizes = new Map<string, number>();
  for (const group of groups) {
    for (const id of group.clubIds) {
      const region = regionOf.get(id);
      if (region) sizes.set(region, (sizes.get(region) ?? 0) + 1);
    }
  }
  for (const [region, size] of sizes) {
    const occupied = span(groups, world, region);
    expect((occupied.at(-1) ?? 0) - (occupied[0] ?? 0) + 1).toBe(occupied.length);
    expect(occupied.length).toBeLessThanOrEqual(Math.ceil(size / GROUP_SIZE) + 1);
  }
}

function clubInfo(world: CompletedBank, ids: readonly string[]): GroupDrawClub[] {
  return ids.map((id) => {
    const club = world.clubs.find((entry) => entry.id === id);
    return {
      id,
      reputation: club?.reputation ?? 0,
      countryId: club?.countryId ?? "",
      ...(club?.region !== undefined ? { region: club.region } : {}),
      fromPreviousStage: false,
    };
  });
}

describe(`${SEASONS} temporadas do banco regional (SC-001 a SC-007)`, () => {
  it("promove os finalistas, classifica os números exatos e sorteia sem violar nada", () => {
    const world = regionalBank();
    const careerSeed = "longa-regional";
    const created = createLeagueSeason(world, { competitionId: STAGES_ID, careerSeed });
    if (!created.ok) throw new Error(JSON.stringify(created.error));
    let league: LeagueSeason = created.league;
    let current = world;
    let history: SeasonHistoryEntry[] = [];
    let draws = 0;
    expect(REGION_SIZES.reduce((sum, size) => sum + size, 0)).toBe(20);

    for (let number = 1; number <= SEASONS; number++) {
      const start = divisionSeason(league, LOWER_LEVEL);
      if (!start?.stages?.[0]?.groups) throw new Error("sem grupos");
      expect(start.clubIds).toHaveLength(20);
      expect(divisionSeason(league, 1)?.clubIds).toHaveLength(8);
      expectConcentrated(start.stages[0].groups, current);

      // mais sorteios sobre a mesma composição, com outras seeds (SC-002, SC-003)
      for (let extra = 0; extra < DRAWS_PER_SEASON; extra++) {
        const result = drawGroups(
          clubInfo(current, start.clubIds),
          {
            stage: 0,
            groups: 4,
            groupSize: GROUP_SIZE,
            previousStagePot: false,
            rules: [{ kind: "concentrate", attribute: "region" }],
          },
          `${careerSeed}:extra:${number}:${extra}`,
          "strict",
        );
        if (!result.ok) throw new Error(JSON.stringify(result.error));
        expectConcentrated(result.groups, current);
        draws++;
      }

      const played = advanceLeague(league, current, { toEnd: true });
      if (!played.ok) throw new Error(JSON.stringify(played.error));
      const lower = divisionSeason(played.league, LOWER_LEVEL);
      if (!lower) throw new Error("sem divisão");

      // SC-007: o número de classificados é o declarado, sem repetir clube na fase seguinte
      const qualifiers = stageQualifiers(lower, current, 0);
      expect(qualifiers).toHaveLength(8);
      expect(new Set(qualifiers.map((q) => q.clubId)).size).toBe(8);
      expect(lower.stages?.[1]?.clubIds).toEqual(qualifiers.map((q) => q.clubId).sort());
      for (const id of ["A", "B", "C", "D"]) {
        expect(qualifiers.filter((q) => q.group === id)).toHaveLength(2);
      }

      // SC-006: posições únicas de 1 a 20 e o campeão é o vencedor da final
      const order = finalOrder(lower, current);
      expect(order).toHaveLength(20);
      expect(new Set(order).size).toBe(20);
      const view = cupView(lower, current, 1);
      const final = view.bracket?.phases[2]?.ties[0];
      expect(final && tieState(view, 2, final.id).winner).toBe(order[0]);

      // SC-001: sobem os finalistas
      const moves = nextComposition(played.league, current);
      expect(moves.promoted[LOWER_LEVEL]).toEqual(order.slice(0, 2));

      const turned = seasonTurnover(played.league, current, history, { careerSeed });
      if (!turned.ok) throw new Error(JSON.stringify(turned.error));
      league = turned.league;
      current = turned.world;
      history = turned.history;
    }
    expect(draws).toBeGreaterThanOrEqual(MIN_DRAWS);
    expect(history).toHaveLength(SEASONS);
  }, 900_000);
});

describe(`${EXTRAS_SEASONS} temporadas com vagas extras`, () => {
  it("as 4 vagas extras saem só dos terceiros colocados, e há 16 classificados", () => {
    const world = extrasBank();
    const careerSeed = "longa-extras";
    const created = createLeagueSeason(world, { competitionId: STAGES_ID, careerSeed });
    if (!created.ok) throw new Error(JSON.stringify(created.error));
    let league: LeagueSeason = created.league;
    let current = world;
    let history: SeasonHistoryEntry[] = [];
    for (let number = 1; number <= EXTRAS_SEASONS; number++) {
      const played = advanceLeague(league, current, { toEnd: true });
      if (!played.ok) throw new Error(JSON.stringify(played.error));
      const lower = divisionSeason(played.league, LOWER_LEVEL);
      if (!lower) throw new Error("sem divisão");
      const qualifiers = stageQualifiers(lower, current, 0);
      expect(qualifiers).toHaveLength(16);
      expect(new Set(qualifiers.map((q) => q.clubId)).size).toBe(16);
      const extras = qualifiers.filter((q) => q.extra);
      expect(extras).toHaveLength(4);
      expect(extras.every((q) => q.groupPosition === 3)).toBe(true);
      expect(new Set(finalOrder(lower, current)).size).toBe(24);
      const turned = seasonTurnover(played.league, current, history, { careerSeed });
      if (!turned.ok) throw new Error(JSON.stringify(turned.error));
      league = turned.league;
      current = turned.world;
      history = turned.history;
    }
  }, 600_000);
});
