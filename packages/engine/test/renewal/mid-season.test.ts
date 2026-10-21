import { describe, expect, it } from "vitest";
import { advanceCareer, advanceCareerDays, completeCareerRound } from "../../src/career/day";
import { startLeagueRound } from "../../src/career/league-round";
import { createFinances } from "../../src/finance/create";
import { minutesInRounds } from "../../src/renewal/evolution";
import { initialRenewal } from "../../src/renewal/measure";
import { finishRound } from "../../src/season/live-round";
import { MANAGER as DAY_MANAGER, newState } from "../career/day-helpers";
import { newLeague, testWorld } from "../career/helpers";
import { twoCompetitionsBank } from "../fixtures/two-competitions";

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

describe("minutos de todas as competições na evolução (017 R9, FR-033)", () => {
  it("minutesInRounds soma as partidas das outras competições, sem janela de rodadas", () => {
    const state = newState(twoCompetitionsBank(), "minutos-extra");
    const played = advanceCareerDays(state, { toEnd: true }, "minutos-extra", DAY_MANAGER);
    if (!played.ok) throw new Error(JSON.stringify(played.error));
    const { league, competitions } = played.state;
    const alone = minutesInRounds(league, 1, 38);
    const both = minutesInRounds(league, 1, 38, competitions);
    const extra = competitions[0]?.divisions[0]?.records.reduce(
      (sum, record) =>
        sum + Object.values(record.players).reduce((total, line) => total + line.minutes, 0),
      0,
    );
    const total = (map: Map<string, number>) => [...map.values()].reduce((a, b) => a + b, 0);
    expect(extra).toBeGreaterThan(0);
    expect(total(both) - total(alone)).toBe(extra);
  }, 120_000);

  it("sem outras competições o resultado é o de sempre", () => {
    const league = newLeague("minutos-sozinha");
    expect(minutesInRounds(league, 1, 38, [])).toEqual(minutesInRounds(league, 1, 38));
  });
});
