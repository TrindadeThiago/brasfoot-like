import type { Club, Competition, Country } from "../../model/types";
import { type ContinentalSize, continentalCompetitions } from "../continental";
import type { Confederation } from "./profile";

/** Nome curto da confederação, para os nomes das competições ("Europeia", "da Oceania"…). */
function shortName(confederation: Confederation): string {
  return confederation.name.replace(/^Confederação /, "");
}

/** Competição grande (40 clubes) com 8 países ou mais; com 4 a 7 a compacta (16); com 3 a mini (12). */
export function continentalSize(countries: number): ContinentalSize {
  return countries >= 8 ? "full" : countries >= 4 ? "compact" : "mini";
}

/**
 * Competições continentais de uma confederação (024 R7): a principal e, se o perfil pede, a
 * secundária, ligadas entre si. Só usa os países e clubes da confederação, então as confederações
 * são independentes. Os ids são `continental-<confederação>-maior` e `-menor`.
 */
export function buildConfederation(input: {
  confederation: Confederation;
  countries: readonly Country[];
  competitions: readonly Competition[];
  clubs: readonly Club[];
  strengths: readonly number[];
}): Competition[] {
  const { confederation } = input;
  const name = shortName(confederation);
  return continentalCompetitions(
    {
      size: continentalSize(input.countries.length),
      ids: {
        major: `continental-${confederation.id}-maior`,
        minor: `continental-${confederation.id}-menor`,
      },
      names: { major: `Taça Continental ${name}`, minor: `Copa Complementar ${name}` },
      countries: input.countries,
      competitions: input.competitions,
      clubs: input.clubs,
      scales: input.strengths,
    },
    { minor: confederation.minor },
  );
}
