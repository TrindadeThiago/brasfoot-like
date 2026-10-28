import { describe, expect, it } from "vitest";
import { DEFAULT_PROFILE, generateFootballWorld } from "../../../src/worldgen/football-world";

describe("determinismo do mundo (024 R11, SC-001, SC-010)", () => {
  it("mesma seed e mesmo perfil geram o mesmo banco", () => {
    const a = JSON.stringify(generateFootballWorld(DEFAULT_PROFILE, "igual"));
    const b = JSON.stringify(generateFootballWorld(DEFAULT_PROFILE, "igual"));
    expect(a).toBe(b);
  });

  it("seed diferente muda os clubes e os jogadores, mas não a estrutura", () => {
    const a = generateFootballWorld(DEFAULT_PROFILE, "um");
    const b = generateFootballWorld(DEFAULT_PROFILE, "dois");
    expect(JSON.stringify(a.clubs)).not.toBe(JSON.stringify(b.clubs));
    expect(a.competitions.map((c) => c.id)).toEqual(b.competitions.map((c) => c.id));
    expect(a.clubs).toHaveLength(b.clubs.length);
  });
});
