import { describe, expect, it } from "vitest";
import { completeCareerRound } from "../../src/career/day";
import { startLeagueRound } from "../../src/career/league-round";
import { seasonTurnover } from "../../src/career/turnover";
import { createFans } from "../../src/fans/create";
import { DEFAULT_FANS } from "../../src/fans/rules";
import { finishRound } from "../../src/season/live-round";
import { fansCareer, MANAGER, playFans, SEED } from "./helpers";

describe("torcida na rodada e na virada (013 R9, R10)", () => {
  it("createFans: todos neutros", () => {
    const career = fansCareer();
    const fans = createFans(career.world, career.league);
    expect(Object.values(fans.clubs).every((club) => club.mood === DEFAULT_FANS.neutral)).toBe(
      true,
    );
    expect(Object.keys(fans.clubs)).toHaveLength(
      career.league.divisions.flatMap((season) => season.clubIds).length,
    );
  });

  it("com torcida a rodada devolve `fans`; sem ela nada muda", () => {
    const career = fansCareer();
    const started = startLeagueRound(career.league, career.world);
    if (!started.ok) throw new Error("rodada");
    const run = (withFans: boolean) =>
      completeCareerRound(
        career.league,
        career.finances,
        career.world,
        finishRound(started.round),
        MANAGER,
        undefined,
        undefined,
        undefined,
        withFans ? { state: career.fans } : undefined,
      );
    const a = run(true);
    const b = run(false);
    if (!a.ok || !b.ok) throw new Error("rodada");
    expect(a.fans).toBeDefined();
    expect(b.fans).toBeUndefined();
    const { fans: _fans, ...rest } = a;
    expect(rest).toEqual(b);
  });

  it("virada: aproxima do neutro, campeão e promovidos sobem, rebaixados descem", () => {
    const ended = playFans(fansCareer(), { toEnd: true });
    const turned = seasonTurnover(ended.league, ended.world, [], {
      careerSeed: SEED,
      finances: ended.finances,
      managerClubId: MANAGER,
      market: ended.market,
      board: ended.board,
      fans: ended.fans,
    });
    if (!turned.ok || !turned.fans) throw new Error(JSON.stringify(turned));
    const entry = turned.history.at(-1);
    const champion = entry?.divisions[0]?.championId as string;
    const relegated = entry?.divisions[0]?.relegated[0] as string;
    const before = (clubId: string) => ended.fans.clubs[clubId]?.mood ?? 50;
    const after = (clubId: string) => turned.fans?.clubs[clubId]?.mood ?? 50;
    const carry = (mood: number) =>
      DEFAULT_FANS.neutral +
      Math.trunc(((mood - DEFAULT_FANS.neutral) * DEFAULT_FANS.carryPct) / 100);
    expect(after(champion)).toBe(Math.min(100, carry(before(champion)) + DEFAULT_FANS.titleBoost));
    expect(after(relegated)).toBe(
      Math.max(0, carry(before(relegated)) - DEFAULT_FANS.relegationDrop),
    );
    expect(Object.values(turned.fans.clubs).every((club) => club.recent.length === 0)).toBe(true);
  });
});
