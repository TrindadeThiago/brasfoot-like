import { describe, expect, it } from "vitest";
import { ageOn, seasonDate } from "../../src/calendar/date";
import { deriveWage } from "../../src/derived/economy";
import {
  contractYearsRange,
  ensureContracts,
  initialContract,
  isLastYear,
} from "../../src/market/contracts";
import { DEFAULT_MARKET } from "../../src/market/rules";
import { createRng } from "../../src/rng/xoshiro";
import { testWorld, YEAR } from "./helpers";

const world = testWorld();
const referenceDate = world.manifest.referenceDate;

function ageOf(player: (typeof world.players)[number]) {
  return ageOn(player.birthDate, seasonDate(referenceDate, YEAR));
}

describe("contratos iniciais (R3)", () => {
  const contracted = ensureContracts(world, YEAR, "seed-a");

  it("todo jogador recebe contrato com o salário derivado", () => {
    for (const player of contracted.players) {
      const club = world.clubs.find((entry) => entry.id === player.clubId);
      if (!club || !player.contract) throw new Error("sem contrato");
      expect(player.contract.wage).toBe(deriveWage(player, club, referenceDate));
    }
  });

  it("duração por faixa de idade", () => {
    const bands: [number, number, number][] = [
      [21, 3, 5],
      [29, 2, 4],
      [32, 1, 2],
      [99, 1, 1],
    ];
    for (const player of contracted.players) {
      const age = ageOf(player);
      const band = bands.find(([max]) => age <= max);
      const years = (player.contract?.untilYear ?? 0) - YEAR + 1;
      expect(years).toBeGreaterThanOrEqual(band?.[1] ?? 0);
      expect(years).toBeLessThanOrEqual(band?.[2] ?? 0);
    }
  });

  it("só preenche o que falta e mantém os existentes", () => {
    const first = contracted.players[0];
    if (!first) throw new Error("sem jogador");
    const custom = { wage: 123_400, untilYear: YEAR + 9 };
    const partial = {
      ...world,
      players: world.players.map((player) =>
        player.id === first.id ? { ...player, contract: custom } : player,
      ),
    };
    const filled = ensureContracts(partial, YEAR, "seed-a");
    expect(filled.players.find((player) => player.id === first.id)?.contract).toEqual(custom);
    expect(filled.players.every((player) => player.contract)).toBe(true);
  });

  it("é determinístico por seed", () => {
    expect(ensureContracts(world, YEAR, "seed-a")).toEqual(contracted);
    const other = ensureContracts(world, YEAR, "seed-b");
    expect(other.players.map((player) => player.contract?.untilYear)).not.toEqual(
      contracted.players.map((player) => player.contract?.untilYear),
    );
  });

  it("initialContract aceita duração fixa", () => {
    const player = world.players[0];
    const club = world.clubs.find((entry) => entry.id === player?.clubId);
    if (!player || !club) throw new Error("sem jogador");
    const contract = initialContract(player, club, YEAR + 3, referenceDate, createRng("x"), 3);
    expect(contract.untilYear).toBe(YEAR + 5);
  });
});

describe("regras de duração e último ano", () => {
  it("veteranos têm limite menor", () => {
    expect(contractYearsRange(25, DEFAULT_MARKET)).toEqual([1, 5]);
    expect(contractYearsRange(33, DEFAULT_MARKET)).toEqual([1, 2]);
  });

  it("isLastYear", () => {
    expect(isLastYear({ wage: 1, untilYear: 3 }, 3)).toBe(true);
    expect(isLastYear({ wage: 1, untilYear: 4 }, 3)).toBe(false);
  });
});
