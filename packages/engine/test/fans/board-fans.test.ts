import { describe, expect, it } from "vitest";
import { confidenceChange } from "../../src/board/confidence";
import { DEFAULT_FANS } from "../../src/fans/rules";
import { fansCareer, MANAGER, playFans, withMood, withScore } from "./helpers";

describe("torcida na diretoria (013 R8, US5)", () => {
  const base = withScore(playFans(fansCareer(), { rounds: 1 }), MANAGER, 1, 1, 1);
  const fansFactor = (mood: number | undefined) => {
    const { fans, ...rest } = withMood(base, MANAGER, mood ?? 50);
    const context = mood === undefined ? rest : { ...rest, fans };
    const change = confidenceChange(context, MANAGER, 1, 30);
    return change.factors.find((factor) => factor.kind === "fans")?.amount;
  };

  it("torcida revoltada pressiona; animada apoia; neutra não interfere", () => {
    expect(fansFactor(0)).toBeLessThan(0);
    expect(fansFactor(DEFAULT_FANS.fanSupportAbove + 25)).toBeGreaterThan(0);
    expect(fansFactor(50)).toBeUndefined();
  });

  it("sem torcida no contexto, nada muda", () => {
    expect(fansFactor(undefined)).toBeUndefined();
  });
});
