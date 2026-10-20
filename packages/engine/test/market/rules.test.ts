import { describe, expect, it } from "vitest";
import { DEFAULT_MARKET, marketRules } from "../../src/market/rules";
import { validateBank } from "../../src/validation/validate";
import { competitionId } from "../career/helpers";
import { contractWorld, editedWorld, testWorld } from "./helpers";

describe("regras do mercado (FR-006, R5)", () => {
  it("sem competition.market devolve os padrões", () => {
    expect(marketRules(testWorld(), competitionId())).toEqual(DEFAULT_MARKET);
  });

  it("campos do mod substituem os padrões, o resto fica", () => {
    const world = editedWorld((draft) => {
      const competition = draft.competitions[0];
      if (competition) {
        competition.market = {
          windows: [{ fromRound: 0, toRound: 5 }],
          lastYearValuePct: 50,
        };
      }
    });
    const rules = marketRules(world, competitionId(world));
    expect(rules.windows).toEqual([{ fromRound: 0, toRound: 5 }]);
    expect(rules.lastYearValuePct).toBe(50);
    expect(rules.club).toEqual(DEFAULT_MARKET.club);
  });
});

describe("contrato no schema do jogador (R1)", () => {
  function validate(edit: (world: ReturnType<typeof editedWorld>) => void) {
    const bank = editedWorld(edit);
    return validateBank({
      manifest: bank.manifest,
      countries: bank.countries,
      competitions: bank.competitions,
      clubs: bank.clubs,
      players: bank.players,
    });
  }

  it("aceita jogadores com e sem contrato", () => {
    const result = validate((world) => {
      const player = world.players[0];
      if (player) player.contract = { wage: 1000, untilYear: 2030 };
    });
    expect(result.ok).toBe(true);
  });

  it("rejeita salário negativo e empréstimo do próprio clube", () => {
    const negative = validate((world) => {
      const player = world.players[0];
      if (player) player.contract = { wage: -1, untilYear: 2030 };
    });
    expect(negative.ok).toBe(false);
    const selfLoan = validate((world) => {
      const player = world.players[0];
      if (player) {
        player.contract = {
          wage: 1000,
          untilYear: 2030,
          loan: { fromClubId: player.clubId, untilYear: 2030 },
        };
      }
    });
    expect(selfLoan.ok).toBe(false);
  });

  it("o mundo com contratos gerados continua válido", () => {
    const world = contractWorld();
    const result = validateBank({
      manifest: world.manifest,
      countries: world.countries,
      competitions: world.competitions,
      clubs: world.clubs,
      players: world.players,
    });
    expect(result.ok).toBe(true);
  });
});
