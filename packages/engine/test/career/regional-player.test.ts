import { describe, expect, it } from "vitest";
import { regionalCompetitionOf, regionalDivisionOf } from "../../src/regional/scope";
import { regionalSeasons, regionalState } from "./regional-helpers";

describe("o clube do jogador e o estadual (023 FR-014)", () => {
  it("o clube do jogador joga o estadual da região dele, na divisão em que está", () => {
    const { state, manager, world } = regionalState();
    const competition = regionalCompetitionOf(world, manager);
    expect(competition).toBeDefined();
    const league = regionalSeasons(state).find((entry) => entry.competitionId === competition?.id);
    const division = league?.divisions.find((season) => season.clubIds.includes(manager));
    expect(division).toBeDefined();
    expect(division?.divisionLevel).toBe(
      competition ? regionalDivisionOf(competition, manager)?.level : undefined,
    );
  });

  it("o clube do jogador tem jogos do estadual no calendário", () => {
    const { state, manager, world } = regionalState();
    const competition = regionalCompetitionOf(world, manager);
    const league = regionalSeasons(state).find((entry) => entry.competitionId === competition?.id);
    const fixtures = league?.divisions.flatMap((season) =>
      season.calendar.flatMap((round) =>
        round.fixtures.filter((fixture) => fixture.home === manager || fixture.away === manager),
      ),
    );
    expect((fixtures ?? []).length).toBeGreaterThan(0);
  });
});

describe("rivalidades regionais no estadual (023 FR-010)", () => {
  it("um clássico do estadual pesa mais no humor da torcida que um jogo comum", async () => {
    const { fansAfterExtraMatches } = await import("../../src/fans/mood");
    const { state, manager, world } = regionalState();
    const competition = regionalCompetitionOf(world, manager);
    const inEstadual = new Set(competition?.divisions.flatMap((division) => division.clubIds));
    const rivalry = (world.rivalries ?? []).find(
      (entry) => entry.clubIds.includes(manager) && entry.clubIds.every((id) => inEstadual.has(id)),
    );
    expect(rivalry).toBeDefined();
    const rival = rivalry?.clubIds.find((id) => id !== manager) ?? "";
    const plain = [...inEstadual].find(
      (id) =>
        id !== manager &&
        !(world.rivalries ?? []).some(
          (entry) => entry.clubIds.includes(manager) && entry.clubIds.includes(id),
        ),
    ) as string;
    const record = (away: string) => ({
      round: 1,
      home: manager,
      away,
      score: { home: 2, away: 0 },
      outcome: "finished" as const,
      events: [],
      stats: {} as never,
      players: {},
      unavailable: { home: [], away: [] },
    });
    const mood = (away: string) => {
      if (!state.fans) throw new Error("sem torcida");
      const next = fansAfterExtraMatches(
        { world, league: state.league, finances: state.finances, fans: state.fans },
        [{ record: record(away), competitionId: competition?.id ?? "" }],
        1,
        manager,
      );
      return (next.clubs[manager]?.mood ?? 0) - (state.fans.clubs[manager]?.mood ?? 0);
    };
    expect(mood(rival)).toBeGreaterThan(mood(plain));
  });
});
