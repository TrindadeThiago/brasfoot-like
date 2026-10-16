import type { CompletedBank } from "../../../src/model/types";
import { advanceSeason, createSeason } from "../../../src/season/season";
import type { Season, SeasonOptions } from "../../../src/season/types";
import { generateDefaultBank } from "../../../src/worldgen/generate";
import { completeHiddenAttributes } from "../../../src/worldgen/hidden";

let world: CompletedBank | undefined;

/** Mundo padrão com atributos ocultos completos, construído uma vez por arquivo de teste. */
export function testWorld(): CompletedBank {
  world ??= completeHiddenAttributes(
    generateDefaultBank({ seed: "brasfoot-like-default-1" }),
    "testes-temporada",
  );
  return world;
}

export function serieAOptions(seed: string | number): SeasonOptions {
  const competition = testWorld().competitions[0];
  if (!competition) throw new Error("sem competição");
  return { competitionId: competition.id, divisionLevel: 1, seed };
}

export function newSeason(seed: string | number, worldOverride?: CompletedBank): Season {
  const result = createSeason(worldOverride ?? testWorld(), serieAOptions(seed));
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.season;
}

const played = new Map<string | number, Season>();

/** Temporada da Série A jogada até o fim (memorizada por seed). */
export function playedSeason(seed: string | number): Season {
  let season = played.get(seed);
  if (!season) {
    const result = advanceSeason(newSeason(seed), testWorld(), { toEnd: true });
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    season = result.season;
    played.set(seed, season);
  }
  return season;
}
