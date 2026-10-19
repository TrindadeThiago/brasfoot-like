import { DEFAULT_ECONOMY } from "../finance/rules";
import type { Competition, Country, ModPackage, ValidatedBank } from "../model/types";
import { createRng } from "../rng/xoshiro";
import { validateBank } from "../validation/validate";
import { generateClubs } from "./clubs";
import defaultNameBank from "./name-banks/default.json" with { type: "json" };
import { nameBankSchema } from "./name-banks/schema";
import { generateSquad } from "./players";
import { GENERATOR_TUNING } from "./tuning";

export interface GenerateOptions {
  seed: string | number;
}

/**
 * Gera o banco fictício padrão (FR-027 a FR-029): 1 país, Série A e Série B com 20 clubes cada.
 * Mesma seed ⇒ banco idêntico. Cada etapa usa um sub-gerador próprio (`fork`), para que mudar
 * uma etapa não altere as demais.
 */
export function generateDefaultBank(options: GenerateOptions): ValidatedBank {
  const { seed } = options;
  if (typeof seed !== "string" && typeof seed !== "number") {
    throw new Error("generateDefaultBank exige uma seed (string ou número)");
  }
  const rng = createRng(seed);
  const names = nameBankSchema.parse(defaultNameBank);
  const { referenceDate, promotionRelegationSlots: slots } = GENERATOR_TUNING;

  const country: Country = {
    id: names.countryCode.toLowerCase(),
    name: names.countryName,
    code: names.countryCode,
  };

  const clubs = generateClubs(rng.fork("clubs"), names, country.id);
  const allClubs = [...clubs.serieA, ...clubs.serieB];

  const competition: Competition = {
    id: "liga-nacional",
    countryId: country.id,
    name: names.competitionName,
    format: {
      type: "league",
      rounds: 2,
      points: { win: 3, draw: 1, loss: 0 },
      tiebreakers: ["wins", "goal-difference", "goals-for", "head-to-head", "draw-lots"],
    },
    divisions: [
      {
        level: 1,
        name: "Série A",
        clubIds: clubs.serieA.map((generated) => generated.club.id),
        promotionSlots: 0,
        relegationSlots: slots,
      },
      {
        level: 2,
        name: "Série B",
        clubIds: clubs.serieB.map((generated) => generated.club.id),
        promotionSlots: slots,
        relegationSlots: 0,
      },
    ],
    // Regras econômicas explícitas no mod (008, R11): o banco padrão é "o primeiro mod".
    economy: JSON.parse(JSON.stringify(DEFAULT_ECONOMY)) as typeof DEFAULT_ECONOMY,
  };

  let playerCount = 0;
  const nextId = () => {
    playerCount += 1;
    return `jogador-${`${playerCount}`.padStart(5, "0")}`;
  };
  const players = allClubs.flatMap((generated) =>
    generateSquad(
      rng.fork(`squad:${generated.club.id}`),
      generated,
      names,
      referenceDate,
      country.id,
      nextId,
    ),
  );

  const bank: ModPackage = {
    manifest: {
      formatVersion: 1,
      id: "default",
      name: "Mundo padrão",
      author: "brasfoot-like",
      version: "1.0.0",
      referenceDate,
    },
    countries: [country],
    competitions: [competition],
    clubs: allClubs.map((generated) => generated.club),
    players,
  };

  const result = validateBank(bank);
  if (!result.ok || result.warnings.length > 0) {
    const issues = result.ok ? result.warnings : [...result.errors, ...result.warnings];
    throw new Error(
      `banco gerado inválido (bug do gerador): ${JSON.stringify(issues.slice(0, 5))}`,
    );
  }
  return result.bank;
}
