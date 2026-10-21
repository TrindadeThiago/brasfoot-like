import { describe, expect, it } from "vitest";
import { advanceCareer } from "../../src/career/day";
import { seasonTurnover } from "../../src/career/turnover";
import { economyRules } from "../../src/finance/rules";
import type { FinanceState } from "../../src/finance/types";
import { competitionId } from "../career/helpers";
import { career, testWorld } from "./helpers";

const MANAGER = "clube-001";

function broke(finances: FinanceState, cash: number): FinanceState {
  const copy = structuredClone(finances);
  const club = copy.clubs[MANAGER];
  if (!club) throw new Error("sem clube");
  copy.ledger.push({
    clubId: MANAGER,
    season: 1,
    round: 0,
    category: "prize",
    amount: cash - club.cash,
  });
  club.cash = cash;
  return copy;
}

describe("crise financeira (US8, FR-022)", () => {
  const rules = economyRules(testWorld(), competitionId());

  it("abre ao completar as rodadas negativas e registra temporada e rodada", () => {
    const start = career("crise");
    const result = advanceCareer(
      start.league,
      broke(start.finances, -80_000_000),
      testWorld(),
      { rounds: rules.crisisRounds - 1 },
      MANAGER,
    );
    if (!result.ok) throw new Error("falhou");
    expect(result.finances.clubs[MANAGER]).toMatchObject({
      inCrisis: false,
      negativeRounds: rules.crisisRounds - 1,
    });
    const next = advanceCareer(result.league, result.finances, testWorld(), { rounds: 1 }, MANAGER);
    if (!next.ok) throw new Error("falhou");
    expect(next.finances.clubs[MANAGER]?.inCrisis).toBe(true);
    expect(next.finances.crises).toEqual([
      { clubId: MANAGER, startSeason: 1, startRound: rules.crisisRounds },
    ]);
  }, 60000);

  it("a crise atravessa a virada e continua aberta enquanto o caixa for negativo", () => {
    const start = career("crise-virada");
    const played = advanceCareer(
      start.league,
      broke(start.finances, -300_000_000),
      testWorld(),
      { toEnd: true },
      MANAGER,
    );
    if (!played.ok) throw new Error("falhou");
    const turned = seasonTurnover(played.league, testWorld(), [], {
      careerSeed: "crise-virada",
      finances: played.finances,
      managerClubId: MANAGER,
    });
    if (!turned.ok || !turned.finances) throw new Error("falhou");
    expect(turned.finances.clubs[MANAGER]?.inCrisis).toBe(true);
    const open = turned.finances.crises.filter((crisis) => crisis.clubId === MANAGER);
    expect(open).toHaveLength(1);
    expect(open[0]?.endSeason).toBeUndefined();
    const after = advanceCareer(
      turned.league,
      turned.finances,
      testWorld(),
      { rounds: 1 },
      MANAGER,
    );
    if (!after.ok) throw new Error("falhou");
    expect(after.finances.clubs[MANAGER]?.inCrisis).toBe(true);
  }, 60000);
});
