import type { Headline, HeadlineType, RoundFeed } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";

/**
 * Fatos da liga principal: a manchete não leva `vars.competition`, então a competição é a liga do
 * save (029 R6).
 */
export const LEAGUE_TYPES = [
  "result",
  "hatTrick",
  "rout",
  "comeback",
  "upset",
  "derby",
  "streak",
  "droughtEnd",
  "record",
  "titleClinched",
  "promotionClinched",
  "relegationConfirmed",
  "seasonSummary",
] as const satisfies readonly HeadlineType[];

/** Manchetes que o motor já grava com `vars.competition`. */
export const COMPETITION_TYPES = [
  "cupUpset",
  "cupElimination",
  "cupFinal",
  "cupChampion",
  "qualification",
  "continentalAdvanced",
  "continentalEliminated",
  "continentalChampion",
  "continentalRout",
  "regionalChampion",
  "regionalPromoted",
  "regionalRelegated",
] as const satisfies readonly HeadlineType[];

/** Pessoas e transferências: não pertencem a uma competição e vão para "Geral". */
export const GENERAL_TYPES = [
  "coachFired",
  "coachHired",
  "managerFired",
  "managerHired",
  "bigTransfer",
] as const satisfies readonly HeadlineType[];

const GENERAL = "general";

/** Id da competição da manchete, ou `undefined` se ela não pertence a nenhuma ("Geral"). */
export function headlineCompetition(save: SaveFile, headline: Headline): string | undefined {
  const own = headline.vars.competition;
  if (typeof own === "string" && own !== "") return own;
  if ((GENERAL_TYPES as readonly HeadlineType[]).includes(headline.type)) return undefined;
  return save.league.competitionId;
}

export interface NewsGroup {
  /** `mine`, `general` ou o id da competição. */
  id: string;
  kind: "mine" | "competition" | "general";
  headlines: Headline[];
}

/**
 * Seções das manchetes de uma rodada: "Do seu clube" (as `mine`), uma por competição (na ordem do
 * banco, depois as que o banco não conhece) e "Geral". A manchete do clube entra também na seção da
 * sua competição, e uma seção sem manchete não existe.
 */
export function groupHeadlines(save: SaveFile, headlines: readonly Headline[]): NewsGroup[] {
  const mine = headlines.filter((headline) => headline.mine);
  const byCompetition = new Map<string, Headline[]>();
  const general: Headline[] = [];
  for (const headline of headlines) {
    const id = headlineCompetition(save, headline);
    if (id === undefined) {
      general.push(headline);
      continue;
    }
    byCompetition.set(id, [...(byCompetition.get(id) ?? []), headline]);
  }
  const known = save.bank.competitions.map((entry) => entry.id);
  const ordered = [
    ...known.filter((id) => byCompetition.has(id)),
    ...[...byCompetition.keys()].filter((id) => !known.includes(id)),
  ];
  return [
    ...(mine.length > 0 ? [{ id: "mine", kind: "mine" as const, headlines: mine }] : []),
    ...ordered.map((id) => ({
      id,
      kind: "competition" as const,
      headlines: byCompetition.get(id) ?? [],
    })),
    ...(general.length > 0 ? [{ id: GENERAL, kind: "general" as const, headlines: general }] : []),
  ];
}

export interface NewsFilter {
  scope: "all" | "mine";
  /** Id da competição, ou `general`; sem ele, todas. */
  competition?: string | undefined;
}

/** Aplica o filtro do painel: só as do clube e/ou só uma competição. */
export function filterHeadlines(
  save: SaveFile,
  headlines: readonly Headline[],
  filter: NewsFilter,
): Headline[] {
  return headlines.filter((headline) => {
    if (filter.scope === "mine" && !headline.mine) return false;
    if (filter.competition === undefined) return true;
    return (headlineCompetition(save, headline) ?? GENERAL) === filter.competition;
  });
}

/** Rodadas guardadas vizinhas da escolhida, na ordem do feed (da mais antiga à mais nova). */
export function roundNav(
  feed: readonly RoundFeed[],
  current: { season: number; round: number },
): { previous: RoundFeed | undefined; next: RoundFeed | undefined } {
  const index = feed.findIndex(
    (entry) => entry.season === current.season && entry.round === current.round,
  );
  if (index < 0) return { previous: undefined, next: undefined };
  return { previous: feed[index - 1], next: feed[index + 1] };
}
