import { describe, expect, it } from "vitest";
import { fansAfterExtraMatches } from "../../src/fans/mood";
import type { CompletedBank } from "../../src/model/types";
import { regionalCompetitionOf } from "../../src/regional/scope";
import { regionalState } from "../career/regional-helpers";

/** Humor ganho por `home` ao vencer `away` por 2 a 0 no estadual dele. */
function gain(
  world: CompletedBank,
  fans: NonNullable<ReturnType<typeof regionalState>["state"]["fans"]>,
  state: ReturnType<typeof regionalState>["state"],
  competitionId: string,
  home: string,
  away: string,
): number {
  const next = fansAfterExtraMatches(
    { world, league: state.league, finances: state.finances, fans },
    [
      {
        competitionId,
        record: {
          round: 1,
          home,
          away,
          score: { home: 2, away: 0 },
          outcome: "finished",
          events: [],
          stats: {} as never,
          players: {},
          unavailable: { home: [], away: [] },
        },
      },
    ],
    1,
    home,
  );
  return (next.clubs[home]?.mood ?? 0) - (fans.clubs[home]?.mood ?? 0);
}

describe("torcida e o peso do estadual (023 R7, US3)", () => {
  const { state, manager, world } = regionalState();
  const competition = regionalCompetitionOf(world, manager);
  if (!competition || !state.fans) throw new Error("sem estadual ou torcida");
  const others = competition.divisions[0]?.clubIds.filter((id) => id !== manager) ?? [];
  const away = others[0] as string;
  const club = world.clubs.find((entry) => entry.id === manager);
  const reputation = club?.reputation ?? 0;

  function withWeight(weight: { pct?: number; byReputation?: { from: number; pct: number }[] }) {
    return {
      ...world,
      competitions: world.competitions.map((entry) =>
        entry.id === competition?.id
          ? { ...entry, regional: { ...(entry.regional as { region: string }), weight } }
          : entry,
      ),
    } as CompletedBank;
  }

  it("peso 100 dá o mesmo humor de uma vitória na liga; peso 50 dá metade", () => {
    const full = gain(
      withWeight({ pct: 100 }),
      state.fans as never,
      state,
      competition.id,
      manager,
      away,
    );
    const half = gain(
      withWeight({ pct: 50 }),
      state.fans as never,
      state,
      competition.id,
      manager,
      away,
    );
    expect(full).toBeGreaterThan(0);
    expect(half).toBe(Math.trunc(full / 2));
  });

  it("peso 0 não muda o humor", () => {
    expect(
      gain(withWeight({ pct: 0 }), state.fans as never, state, competition.id, manager, away),
    ).toBe(0);
  });

  it("a faixa de reputação faz o clube grande valorizar menos que o pequeno", () => {
    const weight = { pct: 100, byReputation: [{ from: reputation, pct: 20 }] };
    const big = gain(withWeight(weight), state.fans as never, state, competition.id, manager, away);
    const small = gain(
      withWeight({ pct: 100 }),
      state.fans as never,
      state,
      competition.id,
      manager,
      away,
    );
    expect(big).toBeLessThan(small);
  });
});
