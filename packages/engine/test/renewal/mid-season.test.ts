import { describe, expect, it } from "vitest";
import { startLeagueRound } from "../../src/career/league-round";
import { createFinances } from "../../src/finance/create";
import { advanceCareer, completeCareerRound } from "../../src/finance/round";
import { initialRenewal } from "../../src/renewal/measure";
import { finishRound } from "../../src/season/live-round";
import { newLeague, testWorld } from "../career/helpers";

const SEED = "meio-da-temporada";
const MANAGER = "clube-001";

describe("evolução do meio da temporada (FR-017)", () => {
  const league = newLeague(SEED);
  const finances = createFinances(testWorld(), league);
  const renewal = { state: initialRenewal(testWorld()), careerSeed: SEED };

  it("acontece uma vez, ao fechar a rodada 19", () => {
    const before = advanceCareer(
      league,
      finances,
      testWorld(),
      { rounds: 18 },
      MANAGER,
      undefined,
      renewal,
    );
    if (!before.ok) throw new Error("falhou");
    expect(before.renewal?.lastEvolution).toBeUndefined();
    expect(before.world).toBe(testWorld());
    const at = advanceCareer(
      before.league,
      before.finances,
      before.world,
      { rounds: 1 },
      MANAGER,
      undefined,
      {
        state: before.renewal ?? renewal.state,
        careerSeed: SEED,
      },
    );
    if (!at.ok) throw new Error("falhou");
    expect(at.renewal?.lastEvolution).toMatchObject({ season: 1, moment: "mid" });
    expect(at.world).not.toBe(before.world);

    const live = startLeagueRound(before.league, before.world);
    if (!live.ok) throw new Error("falhou");
    const viaLive = completeCareerRound(
      before.league,
      before.finances,
      before.world,
      finishRound(live.round),
      MANAGER,
      { state: before.renewal ?? renewal.state, careerSeed: SEED },
    );
    expect(viaLive).toEqual(at);
  }, 60000);
});
