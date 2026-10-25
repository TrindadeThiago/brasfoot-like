import { describe, expect, it } from "vitest";
import { startNextSeason } from "../../src/career/next-season";
import { TURNOVER_STEP_IDS } from "../../src/career/turnover";
import { reachedByClub } from "../../src/continental/reached";
import { continentalReputation } from "../../src/continental/reputation";
import type { CompletedBank } from "../../src/model/types";
import { CONTINENTAL_IDS } from "../../src/worldgen/continental";
import {
  compactState,
  continentalChampion,
  continentalLeague,
  playDays,
} from "../career/continental-helpers";
import { ok } from "../career/qualification-helpers";

function season() {
  const { state, manager, seed } = compactState({ seed: "continental-reputacao" });
  const end = playDays(state, "end", seed, manager);
  return { end, manager, seed };
}

describe("reputação pela fase alcançada (022 US2, FR-017)", () => {
  const { end, manager, seed } = season();
  const league = continentalLeague(end);
  const reached = reachedByClub(end.world, league.divisions[0] as never);

  it("a reputação segue a fase mais alta (campeão +3, finalista +2, semifinalistas +1, grupos -1)", () => {
    const { clubs, changes } = continentalReputation(end.world, [league]);
    const before = new Map(end.world.clubs.map((club) => [club.id, club.reputation]));
    const delta = (id: string) => (clubs[id] ?? before.get(id) ?? 0) - (before.get(id) ?? 0);
    // O teto de 95 limita o ganho; a perda só para no mínimo.
    const expected = (id: string, points: number) => {
      const rep = before.get(id) ?? 0;
      if (points > 0) return rep >= 95 ? 0 : Math.min(95, rep + points) - rep;
      return Math.max(1, rep + points) - rep;
    };
    const champion = continentalChampion(end) as string;
    expect(delta(champion)).toBe(expected(champion, 3));
    const finalists = [...reached].filter(([, level]) => level.stage === 2 && level.phase === 3);
    expect(finalists).toHaveLength(1);
    expect(delta(finalists[0]?.[0] as string)).toBe(expected(finalists[0]?.[0] as string, 2));
    const semis = [...reached].filter(([, level]) => level.stage === 2 && level.phase === 2);
    expect(semis).toHaveLength(2);
    for (const [clubId] of semis) expect(delta(clubId)).toBe(expected(clubId, 1));
    const quarters = [...reached].filter(([, level]) => level.stage === 2 && level.phase === 1);
    expect(quarters).toHaveLength(4);
    for (const [clubId] of quarters) expect(delta(clubId)).toBe(0);
    const groupsOnly = [...reached].filter(([, level]) => level.stage === 1);
    expect(groupsOnly).toHaveLength(8);
    for (const [clubId] of groupsOnly) expect(delta(clubId)).toBe(expected(clubId, -1));
    expect(changes.some((change) => change.delta < 0)).toBe(true);
    expect(changes.some((change) => change.delta > 0)).toBe(true);
  });

  it("o teto limita o ganho e quem já está acima dele não muda", () => {
    const champion = continentalChampion(end) as string;
    const rigged = (reputation: number) =>
      ({
        ...end.world,
        clubs: end.world.clubs.map((club) =>
          club.id === champion ? { ...club, reputation } : club,
        ),
      }) as CompletedBank;
    expect(continentalReputation(rigged(93), [league]).clubs[champion]).toBe(95);
    expect(continentalReputation(rigged(95), [league]).clubs[champion]).toBeUndefined();
    expect(continentalReputation(rigged(98), [league]).clubs[champion]).toBeUndefined();
  });

  it("sem tabela de reputação a competição não muda nada", () => {
    const world = {
      ...end.world,
      competitions: end.world.competitions.map((competition) =>
        competition.id === CONTINENTAL_IDS.major
          ? { ...competition, awards: { win: 1 } }
          : competition,
      ),
    } as CompletedBank;
    expect(continentalReputation(world, [league])).toEqual({ clubs: {}, changes: [] });
  });

  it("a etapa roda logo depois do histórico e a nova temporada traz a reputação nova", () => {
    expect(TURNOVER_STEP_IDS.slice(0, 2)).toEqual(["record-history", "continental-reputation"]);
    const expected = continentalReputation(end.world, [end.league, ...end.competitions]).clubs;
    const next = ok(startNextSeason(end, seed, undefined, manager)).state;
    for (const [clubId, reputation] of Object.entries(expected)) {
      expect(next.world.clubs.find((club) => club.id === clubId)?.reputation).toBe(reputation);
    }
    expect(Object.keys(expected).length).toBeGreaterThan(0);
  });
});
