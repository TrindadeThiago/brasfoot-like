import type { Competition, KnockoutPhase } from "../model/types";

interface CupClub {
  id: string;
  reputation: number;
  /** Nível da divisão do clube (1 = a mais alta). */
  level: number;
}

/** Nome da fase pelo número de clubes que a disputam (018 R14). */
function phaseName(clubs: number): string {
  if (clubs === 2) return "Final";
  if (clubs === 4) return "Semifinal";
  if (clubs === 8) return "Quartas de final";
  if (clubs === 16) return "Oitavas de final";
  return `Fase de ${clubs}`;
}

/**
 * Pernas da fase, contando a partir da final (0 = final): a final é jogo único e as três fases
 * antes dela (semifinal, quartas e oitavas) são em ida e volta.
 */
export function cupLegs(fromFinal: number): 1 | 2 {
  return fromFinal >= 1 && fromFinal <= 3 ? 2 : 1;
}

/** Prêmio por fase, contando a partir da final (valores iniciais; calibrados na 018 T051: o campeão ganha cerca de 17% da folha mediana). */
const PRIZES_FROM_FINAL = [500_000, 250_000, 150_000, 90_000, 60_000, 40_000, 25_000];

/**
 * Copa nacional do banco padrão (018 R14): todos os clubes, com uma fase inicial só para os das
 * divisões mais baixas e de menor reputação quando o total não é potência de dois e os demais entrando na fase seguinte.
 * Jogo único nas fases iniciais; oitavas, quartas e semifinal em ida e volta; final em jogo único
 * em campo neutro; mando da divisão mais baixa até as quartas. Agenda: quartas-feiras, a cada 2 semanas, com um respiro antes da final.
 */
export function generateCup(
  id: string,
  name: string,
  countryId: string,
  clubs: readonly CupClub[],
): Competition {
  const total = clubs.length;
  let size = 2;
  while (size * 2 <= total) size *= 2;
  const opening = total === size ? 0 : 2 * (total - size);
  // Abrem a copa os clubes das divisões mais baixas e, dentro delas, os de menor reputação.
  const ranked = [...clubs].sort(
    (a, b) =>
      b.level - a.level || a.reputation - b.reputation || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
  const late = ranked.slice(opening).map((club) => club.id);

  const sizes: number[] = [];
  if (opening > 0) sizes.push(opening);
  for (let bracket = size; bracket >= 2; bracket /= 2) sizes.push(bracket);
  const phases: KnockoutPhase[] = sizes.map((count, index) => {
    const fromFinal = sizes.length - 1 - index;
    const semi = count === 4;
    const final = count === 2;
    return {
      name: index === 0 && opening > 0 ? "Primeira fase" : phaseName(count),
      legs: cupLegs(fromFinal),
      tiebreakers: ["extra-time", "penalties"],
      home: semi || final ? "draw" : "division",
      prize: PRIZES_FROM_FINAL[fromFinal] ?? 30_000,
      ...(final ? { neutral: true, gapWeeks: 1 } : {}),
    };
  });

  return {
    id,
    countryId,
    name,
    format: {
      type: "knockout",
      phases,
      ...(opening > 0 ? { entries: [{ phase: 1, clubIds: late }] } : {}),
    },
    divisions: [
      {
        level: 1,
        name,
        clubIds: clubs.map((club) => club.id),
        promotionSlots: 0,
        relegationSlots: 0,
      },
    ],
    schedule: { weekday: 3, startWeek: 1, everyWeeks: 2 },
  };
}
