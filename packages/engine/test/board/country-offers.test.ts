import { describe, expect, it } from "vitest";
import { advanceCareerDays } from "../../src/career/day";
import { worldBank, worldState } from "../career/world-helpers";

const SEED = "propostas-mundo";

function ok<T extends { ok: boolean }>(result: T): Extract<T, { ok: true }> {
  if (!result.ok) throw new Error(JSON.stringify(result));
  return result as Extract<T, { ok: true }>;
}

describe("propostas de emprego de clubes de qualquer país (020 FR-009)", () => {
  const world = worldBank({ countries: 3, clubsPerDivision: 14 }, SEED);
  const country = (clubId: string) => world.clubs.find((club) => club.id === clubId)?.countryId;

  it("a diretoria faz propostas de clubes de outros países, pela reputação do clube", () => {
    // Técnico de reputação média, no clube mais fraco do primeiro país.
    const weakest = world.clubs
      .filter((club) => club.countryId === world.countries[0]?.id)
      .sort((a, b) => a.reputation - b.reputation)[0]?.id as string;
    const state = worldState(world, SEED, weakest);
    if (!state.board) throw new Error("sem diretoria");
    state.board.manager.reputation = 55;
    const end = ok(advanceCareerDays(state, { days: 40 }, SEED, weakest)).state;
    const offers = end.board?.offers ?? [];
    expect(offers.length).toBeGreaterThan(0);
    const abroad = offers.filter((offer) => country(offer.clubId) !== country(weakest));
    expect(abroad.length).toBeGreaterThan(0);
    const reputation = (id: string) => world.clubs.find((club) => club.id === id)?.reputation ?? 0;
    for (const offer of offers) {
      expect(reputation(offer.clubId)).toBeGreaterThan(reputation(weakest));
      // Faixa de reputação do clube em relação à do técnico (regras de diretoria padrão).
      expect(reputation(offer.clubId)).toBeGreaterThanOrEqual(55 - 30);
      expect(reputation(offer.clubId)).toBeLessThanOrEqual(55 + 12);
    }
  }, 120_000);
});
