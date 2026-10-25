import type { Competition } from "../../model/types";
import type { ParsedItem, SemanticContext } from "../context";
import { makeIssue, type ValidationIssue } from "../issues";

/** Mínimo de nomes e sobrenomes de um banco de nomes de país (009). */
export const MIN_COUNTRY_NAMES = 20;

/**
 * Competição principal de cada país (020 R1): a primeira do arquivo com aquele `countryId`. Dela
 * vêm as regras do país, e as demais competições do país só têm clubes dela.
 */
export function mainCompetitions(
  context: Pick<SemanticContext, "competitions">,
): Map<string, ParsedItem<Competition>> {
  const mains = new Map<string, ParsedItem<Competition>>();
  for (const item of context.competitions) {
    // Competição entre países (022) não é a principal de nenhum país.
    if (item.value.countryId === undefined) continue;
    if (!mains.has(item.value.countryId)) mains.set(item.value.countryId, item);
  }
  return mains;
}

/** Bancos de nomes dos países com variedade suficiente para gerar jogadores. */
export function checkCountries(context: SemanticContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const { index, value } of context.countries) {
    if (!value.names) continue;
    for (const kind of ["firstNames", "surnames"] as const) {
      const count = value.names[kind].length;
      if (count < MIN_COUNTRY_NAMES) {
        issues.push(
          makeIssue(
            "country.names_too_few",
            "countries",
            [index, "names", kind],
            { kind, count, min: MIN_COUNTRY_NAMES },
            value.id,
          ),
        );
      }
    }
  }
  return [...issues, ...checkWorld(context)];
}

/**
 * Vários países (020): cada país com clubes tem competição principal de liga; os clubes da
 * principal são do país e não se repetem entre países; num banco com mais de um país cada país
 * traz o seu banco de nomes; o limite de estrangeiros vale para os elencos iniciais.
 */
function checkWorld(context: SemanticContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const mains = mainCompetitions(context);

  const clubById = new Map(context.clubs.map((item) => [item.value.id, item.value]));
  const owner = new Map<string, string>();
  for (const [countryId, main] of mains) {
    const competition = main.value;
    if (competition.format.type === "knockout") {
      issues.push(
        makeIssue(
          "country.main_not_league",
          "competitions",
          [main.index, "format", "type"],
          { countryId, competitionId: competition.id },
          competition.id,
        ),
      );
    }
    competition.divisions.forEach((division, position) => {
      division.clubIds.forEach((clubId, clubIndex) => {
        const path = [main.index, "divisions", position, "clubIds", clubIndex];
        const other = owner.get(clubId);
        if (other !== undefined && other !== competition.id) {
          issues.push(
            makeIssue(
              "unique.duplicate_club_in_country",
              "competitions",
              path,
              { clubId, otherCompetitionId: other },
              competition.id,
            ),
          );
        } else {
          owner.set(clubId, competition.id);
        }
      });
    });
  }

  if (mains.size > 1) {
    for (const { index, value } of context.countries) {
      if (mains.has(value.id) && !value.names) {
        issues.push(
          makeIssue(
            "country.names_missing",
            "countries",
            [index, "names"],
            { countryId: value.id },
            value.id,
          ),
        );
      }
    }
  }

  const limits = new Map(
    context.countries.flatMap(({ value }) =>
      value.rules?.foreignLimit === undefined
        ? []
        : [[value.id, value.rules.foreignLimit] as const],
    ),
  );
  if (limits.size > 0) {
    const foreigners = new Map<string, number>();
    for (const { value } of context.players) {
      const club = clubById.get(value.clubId);
      if (club && value.nationalityId !== club.countryId) {
        foreigners.set(club.id, (foreigners.get(club.id) ?? 0) + 1);
      }
    }
    for (const { index, value } of context.clubs) {
      const limit = limits.get(value.countryId);
      const count = foreigners.get(value.id) ?? 0;
      if (limit !== undefined && count > limit) {
        issues.push(
          makeIssue(
            "country.foreign_limit_exceeded",
            "clubs",
            [index],
            { clubId: value.id, limit, count },
            value.id,
          ),
        );
      }
    }
  }
  return issues;
}
