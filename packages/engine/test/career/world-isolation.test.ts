import { describe, expect, it } from "vitest";
import { advanceCareerDays } from "../../src/career/day";
import type { CompletedBank } from "../../src/model/types";
import { clubOfCountry, worldBank, worldState } from "./world-helpers";

const SEED = "isolamento";
const DAYS = 14;

function withoutLastCountry(world: CompletedBank): CompletedBank {
  const dropped = world.countries.at(-1)?.id;
  const clubs = new Set(world.clubs.filter((club) => club.countryId !== dropped).map((c) => c.id));
  return {
    ...world,
    countries: world.countries.filter((country) => country.id !== dropped),
    competitions: world.competitions.filter((competition) => competition.countryId !== dropped),
    clubs: world.clubs.filter((club) => clubs.has(club.id)),
    players: world.players.filter((player) => clubs.has(player.clubId)),
    rivalries: world.rivalries?.filter((rivalry) => rivalry.clubIds.every((id) => clubs.has(id))),
  } as CompletedBank;
}

function closed(world: CompletedBank): CompletedBank {
  // Sem contratações entre países da IA: cada país só enxerga o próprio mercado.
  for (const competition of world.competitions) {
    competition.market = { ...competition.market, aiMarket: { maxInternationalPerClub: 0 } };
  }
  return world;
}

describe("acrescentar um país não altera os outros (020 R6, SC-007)", () => {
  it("os resultados dos países originais são os mesmos com ou sem o país a mais", () => {
    const big = closed(worldBank({ countries: 3, clubsPerDivision: 14 }, SEED));
    const small = withoutLastCountry(JSON.parse(JSON.stringify(big)) as CompletedBank);
    const manager = clubOfCountry(big, 0);
    const run = (world: CompletedBank) => {
      const done = advanceCareerDays(
        worldState(world, SEED, manager),
        { days: DAYS },
        SEED,
        manager,
      );
      if (!done.ok) throw new Error(JSON.stringify(done.error));
      return done.state;
    };
    const a = run(big);
    const b = run(small);
    const results = (state: typeof a, competitionId: string) => {
      const league = [state.league, ...state.competitions].find(
        (entry) => entry.competitionId === competitionId,
      );
      return JSON.stringify(
        league?.divisions.map((season) =>
          season.records.map((record) => [record.round, record.home, record.away, record.score]),
        ),
      );
    };
    for (const country of small.countries) {
      const main = small.competitions.find((competition) => competition.countryId === country.id);
      expect(results(a, main?.id ?? ""), country.id).toBe(results(b, main?.id ?? ""));
    }
  }, 120_000);
});
