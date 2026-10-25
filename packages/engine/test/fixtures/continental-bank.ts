import type { Competition, ModPackage } from "../../src/model/types";
import { generateWorldBank } from "../../src/worldgen/world-example";

/** Id da competição entre países do banco de teste (022). */
export const CONTINENTAL_ID = "copa-continental-teste";

export function continentalPhases(): Competition["format"] {
  const single = {
    legs: 1 as const,
    tiebreakers: ["extra-time", "penalties"] as ("extra-time" | "penalties")[],
  };
  return {
    type: "knockout",
    phases: [
      { name: "Quartas", ...single, home: "ranking", prize: 100_000 },
      { name: "Semifinal", ...single, home: "ranking", prize: 200_000 },
      { name: "Final", ...single, home: "draw", neutral: true, prize: 400_000 },
    ],
  };
}

/**
 * Banco de 3 países (8 clubes por liga) com uma copa entre países de 8 clubes (3, 3 e 2 por país),
 * jogada às quartas. `edit` monta as variantes.
 */
export function continentalPackage(
  edit?: (bank: ModPackage, competition: Competition) => void,
): ModPackage {
  const base = generateWorldBank({
    seed: "continental-fixture",
    countries: 3,
    divisionsPerCountry: 1,
    clubsPerDivision: 8,
  });
  const bank = JSON.parse(JSON.stringify(base)) as ModPackage;
  const mains = bank.competitions;
  const clubIds = mains.flatMap((main, index) =>
    [...(main.divisions[0]?.clubIds ?? [])].sort().slice(0, index < 2 ? 3 : 2),
  );
  const competition: Competition = {
    id: CONTINENTAL_ID,
    name: "Copa Continental de Teste",
    format: continentalPhases(),
    divisions: [{ level: 1, name: "Chave", clubIds, promotionSlots: 0, relegationSlots: 0 }],
    schedule: { weekday: 3, startWeek: 1, everyWeeks: 1 },
  };
  bank.competitions.push(competition);
  edit?.(bank, competition);
  return bank;
}
