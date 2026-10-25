import { describe, expect, it } from "vitest";
import { resolveTurnoverSteps, seasonTurnover, TURNOVER_STEP_IDS } from "../../src/career/turnover";
import type { TurnoverContext, TurnoverRegistration, TurnoverStep } from "../../src/career/types";
import { playedLeague, testWorld } from "./helpers";

const SEED = "extensoes";

/** Etapa que só anota no histórico de execução. */
function marker(id: string, log: string[]): TurnoverStep {
  return {
    id,
    run: (context) => {
      log.push(id);
      return context;
    },
  };
}

function order(extras: TurnoverRegistration[]): string[] {
  const resolved = resolveTurnoverSteps(extras);
  if (!resolved.ok) throw new Error(JSON.stringify(resolved.error));
  return resolved.steps.map((step) => step.id);
}

describe("pontos de extensão da virada (US6, FR-017 a FR-019)", () => {
  it("sem extras, só as etapas padrão na ordem documentada", () => {
    expect(order([])).toEqual([...TURNOVER_STEP_IDS]);
  });

  it("encaixa extras antes e depois das âncoras, inclusive de outras extras", () => {
    const log: string[] = [];
    expect(
      order([
        { step: marker("financas", log), after: "record-history" },
        { step: marker("mercado", log), before: "generate-calendars" },
        { step: marker("premios", log), after: "financas" },
      ]),
    ).toEqual([
      "record-history",
      "financas",
      "premios",
      "continental-reputation",
      "fans-new-season",
      "news-new-season",
      "pay-prizes",
      "close-finance-season",
      "return-loans",
      "evolve-players",
      "retire-players",
      "expire-contracts",
      "regulate-world",
      "generate-youth",
      "balance-squads",
      "age-out-free-agents",
      "promotion-relegation",
      "resolve-qualification",
      "news-qualification",
      "advance-year",
      "reset-season-stats",
      "mercado",
      "generate-calendars",
      "pay-sponsorship",
      "ai-finance-review",
      "reset-market",
      "board-new-season",
    ]);
  });

  it("extras na mesma âncora rodam em ordem de id, qualquer que seja a ordem de registro", () => {
    const log: string[] = [];
    const a: TurnoverRegistration = { step: marker("b-diretoria", log), after: "record-history" };
    const b: TurnoverRegistration = { step: marker("a-torcida", log), after: "record-history" };
    const c: TurnoverRegistration = { step: marker("z-jovens", log), before: "record-history" };
    const d: TurnoverRegistration = { step: marker("m-base", log), before: "record-history" };
    const expected = ["m-base", "z-jovens", "record-history", "a-torcida", "b-diretoria"];
    expect(order([a, b, c, d]).slice(0, 5)).toEqual(expected);
    expect(order([d, c, b, a]).slice(0, 5)).toEqual(expected);
  });

  it.each([
    [
      "id repetido com etapa padrão",
      [{ step: marker("advance-year", []), after: "record-history" }],
    ],
    [
      "id repetido entre extras",
      [
        { step: marker("x", []), after: "record-history" },
        { step: marker("x", []), before: "generate-calendars" },
      ],
    ],
    ["âncora inexistente", [{ step: marker("x", []), after: "mercado" }]],
    [
      "âncoras em ciclo",
      [
        { step: marker("x", []), after: "y" },
        { step: marker("y", []), after: "x" },
      ],
    ],
  ] as [string, TurnoverRegistration[]][])("recusa %s", (_label, extras) => {
    const resolved = resolveTurnoverSteps(extras);
    expect(resolved.ok).toBe(false);
    if (resolved.ok) return;
    expect(resolved.error.code).toBe("turnover.invalid_steps");
  });

  it("a extra depois de record-history já vê a nova entrada do histórico", () => {
    let seen: TurnoverContext["history"] = [];
    const result = seasonTurnover(playedLeague(SEED), testWorld(), [], {
      careerSeed: SEED,
      extraSteps: [
        {
          step: {
            id: "diretoria",
            run: (context) => {
              seen = context.history;
              return context;
            },
          },
          after: "record-history",
        },
      ],
    });
    expect(result.ok).toBe(true);
    expect(seen).toHaveLength(1);
    expect(seen[0]?.number).toBe(1);
  }, 30000);

  it("a extra antes de generate-calendars muda o que passa para a nova temporada", () => {
    const league = playedLeague(SEED);
    const playerId = testWorld().players.find(
      (player) => player.clubId === league.divisions[0]?.clubIds[0],
    )?.id as string;
    const result = seasonTurnover(league, testWorld(), [], {
      careerSeed: SEED,
      extraSteps: [
        {
          step: {
            id: "departamento-medico",
            run: (context) => ({
              ...context,
              next: {
                ...context.next,
                carryOver: {
                  ...context.next.carryOver,
                  [playerId]: { yellows: 0, suspension: 0, injury: 5 },
                },
              },
            }),
          },
          before: "generate-calendars",
        },
      ],
    });
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    const status = Object.assign({}, ...result.league.divisions.map((season) => season.status));
    expect(status[playerId]).toEqual({ yellows: 0, suspension: 0, injury: 5 });
  }, 30000);

  it("extra que quebra os invariantes é recusada", () => {
    const result = seasonTurnover(playedLeague(SEED), testWorld(), [], {
      careerSeed: SEED,
      extraSteps: [
        {
          step: {
            id: "sumir-com-clube",
            run: (context) => ({
              ...context,
              next: {
                ...context.next,
                composition: {
                  ...context.next.composition,
                  1: (context.next.composition[1] ?? []).slice(1),
                },
              },
            }),
          },
          before: "generate-calendars",
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("turnover.invalid_result");
  }, 30000);

  it("aleatoriedade da extra é repetível e não muda as etapas padrão", () => {
    const draws: number[][] = [];
    const sorteio: TurnoverStep = {
      id: "sorteio",
      run: (context) => {
        const rng = context.rng("sorteio");
        draws.push([rng.next(), rng.next()]);
        return context;
      },
    };
    const run = () =>
      seasonTurnover(playedLeague(SEED), testWorld(), [], {
        careerSeed: SEED,
        extraSteps: [{ step: sorteio, after: "advance-year" }],
      });
    const first = run();
    const second = run();
    const plain = seasonTurnover(playedLeague(SEED), testWorld(), [], { careerSeed: SEED });
    expect(second).toEqual(first);
    expect(draws[0]).toEqual(draws[1]);
    expect(first).toEqual(plain);
  }, 30000);
});
