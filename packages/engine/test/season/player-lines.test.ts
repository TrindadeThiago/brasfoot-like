import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { playerLines, toSummaryRecord } from "../../src/season/record";
import type { MatchRecord, PlayerLine } from "../../src/season/types";

const line = (side: "home" | "away", over: Partial<PlayerLine> = {}): PlayerLine => ({
  side,
  minutes: 97,
  goals: 0,
  assists: 0,
  yellows: 0,
  red: false,
  ...over,
});

function base(players: Record<string, PlayerLine>): MatchRecord {
  return {
    round: 1,
    home: "a",
    away: "b",
    score: { home: 1, away: 0 },
    outcome: "finished",
    events: [],
    stats: {
      home: {
        shots: 0,
        shotsOnTarget: 0,
        possession: 50,
        yellowCards: 0,
        redCards: 0,
        penalties: 0,
        penaltiesScored: 0,
      },
      away: {
        shots: 0,
        shotsOnTarget: 0,
        possession: 50,
        yellowCards: 0,
        redCards: 0,
        penalties: 0,
        penaltiesScored: 0,
      },
    },
    players,
    unavailable: { home: [], away: [] },
  };
}

describe("playerLines (020 R4)", () => {
  const starters = { home: ["h1", "h2"], away: ["a1", "a2"] };

  it("registro completo: devolve as próprias linhas", () => {
    const record = base({ h1: line("home") });
    expect(playerLines(record)).toBe(record.players);
  });

  it("registro resumido: linhas só de quem teve algo; o resto vem dos titulares", () => {
    const full = base({
      h1: line("home", { goals: 1 }),
      h2: line("home"),
      a1: line("away", { minutes: 60, injury: "minor" }),
      a2: line("away"),
      sub: line("away", { minutes: 37 }),
    });
    const compact = toSummaryRecord(full, starters, 97);
    expect(Object.keys(compact.players).sort()).toEqual(["a1", "h1", "sub"]);
    expect(playerLines(compact)).toEqual(full.players);
    expect(compact.summary).toBe(true);
  });
});

describe("ninguém lê as linhas direto do registro (020 R4)", () => {
  function files(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? files(path) : path.endsWith(".ts") ? [path] : [];
    });
  }

  it("só season/record.ts acessa `record.players`", () => {
    const root = join(import.meta.dirname, "../../src");
    const offenders = files(root).filter((file) => {
      if (file.endsWith("season/record.ts")) return false;
      return /\brecord\.players\b/.test(readFileSync(file, "utf8"));
    });
    expect(offenders.map((file) => file.replace(root, ""))).toEqual([]);
  });
});
