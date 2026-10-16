import { describe, expect, it } from "vitest";
import type { InjurySeverity, Side } from "../../src/match/types";
import { applyMatchToStatus, injuryDuration } from "../../src/season/discipline";
import {
  DEFAULT_DISCIPLINE_RULES,
  type DisciplineRules,
  type MatchRecord,
  type PlayerLine,
  type PlayerStatus,
} from "../../src/season/types";

function line(overrides: Partial<PlayerLine> = {}): PlayerLine {
  return { side: "home", minutes: 90, goals: 0, assists: 0, yellows: 0, red: false, ...overrides };
}

function record(
  players: Record<string, PlayerLine>,
  absences: { playerId: string; side?: Side }[] = [],
): MatchRecord {
  const stats = {
    shots: 0,
    shotsOnTarget: 0,
    possession: 50,
    yellowCards: 0,
    redCards: 0,
    penalties: 0,
    penaltiesScored: 0,
  };
  return {
    round: 5,
    home: "h",
    away: "a",
    score: { home: 0, away: 0 },
    outcome: "finished",
    events: [],
    stats: { home: stats, away: stats },
    players,
    unavailable: {
      home: absences
        .filter((entry) => (entry.side ?? "home") === "home")
        .map(({ playerId }) => ({ playerId, reason: "suspension" as const, fielded: false })),
      away: absences
        .filter((entry) => entry.side === "away")
        .map(({ playerId }) => ({ playerId, reason: "suspension" as const, fielded: false })),
    },
  };
}

function apply(
  status: Record<string, PlayerStatus>,
  match: MatchRecord,
  rules: DisciplineRules = DEFAULT_DISCIPLINE_RULES,
): Record<string, PlayerStatus> {
  const next = JSON.parse(JSON.stringify(status)) as Record<string, PlayerStatus>;
  applyMatchToStatus(next, match, "home", rules, "temporada");
  return next;
}

describe("suspensões (FR-015 a FR-017)", () => {
  it("3º amarelo acumulado ⇒ 1 jogo e a contagem zera", () => {
    const status = { p: { yellows: 2, suspension: 0, injury: 0 } };
    expect(apply(status, record({ p: line({ yellows: 1 }) }))).toEqual({
      p: { yellows: 0, suspension: 1, injury: 0 },
    });
  });

  it("amarelos abaixo do limite só acumulam", () => {
    expect(apply({}, record({ p: line({ yellows: 1 }) }))).toEqual({
      p: { yellows: 1, suspension: 0, injury: 0 },
    });
  });

  it("vermelho direto ⇒ 1 jogo", () => {
    expect(apply({}, record({ p: line({ red: true }) }))).toEqual({
      p: { yellows: 0, suspension: 1, injury: 0 },
    });
  });

  it("segundo amarelo ⇒ 1 jogo e os amarelos da partida não acumulam", () => {
    const status = { p: { yellows: 2, suspension: 0, injury: 0 } };
    expect(apply(status, record({ p: line({ yellows: 2, red: true }) }))).toEqual({
      p: { yellows: 2, suspension: 1, injury: 0 },
    });
  });

  it("regras configuráveis", () => {
    const rules = { yellowsForSuspension: 2, matchesPerRed: 2 };
    expect(apply({}, record({ p: line({ yellows: 1 }), q: line({ red: true }) }), rules)).toEqual({
      p: { yellows: 1, suspension: 0, injury: 0 },
      q: { yellows: 0, suspension: 2, injury: 0 },
    });
    expect(
      apply(
        { p: { yellows: 1, suspension: 0, injury: 0 } },
        record({ p: line({ yellows: 1 }) }),
        rules,
      ),
    ).toEqual({
      p: { yellows: 0, suspension: 1, injury: 0 },
    });
  });

  it("quem estava indisponível cumpre uma partida; entradas zeradas somem", () => {
    const status = {
      s: { yellows: 0, suspension: 1, injury: 0 },
      l: { yellows: 1, suspension: 0, injury: 3 },
    };
    expect(apply(status, record({}, [{ playerId: "s" }, { playerId: "l" }]))).toEqual({
      l: { yellows: 1, suspension: 0, injury: 2 },
    });
  });

  it("só atualiza os jogadores do lado informado", () => {
    expect(apply({}, record({ p: line({ side: "away", red: true }) }))).toEqual({});
  });
});

describe("lesões (FR-018)", () => {
  const ranges: Record<InjurySeverity, [number, number]> = {
    minor: [1, 2],
    moderate: [3, 6],
    severe: [7, 15],
  };

  it.each(Object.entries(ranges))(
    "%s dura dentro da faixa e é determinística",
    (severity, [min, max]) => {
      const seen = new Set<number>();
      for (let index = 0; index < 200; index++) {
        const duration = injuryDuration(
          severity as InjurySeverity,
          "temporada",
          3,
          `jogador-${index}`,
        );
        expect(duration).toBeGreaterThanOrEqual(min);
        expect(duration).toBeLessThanOrEqual(max);
        expect(injuryDuration(severity as InjurySeverity, "temporada", 3, `jogador-${index}`)).toBe(
          duration,
        );
        seen.add(duration);
      }
      expect(seen.size).toBe(max - min + 1);
    },
  );

  it("lesão na partida afasta pelas próximas partidas", () => {
    const next = apply({}, record({ p: line({ injury: "severe" }) }));
    expect(next.p?.injury).toBeGreaterThanOrEqual(7);
  });
});
