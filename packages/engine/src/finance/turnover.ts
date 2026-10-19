import { seasonDate } from "../calendar/date";
import type { TurnoverContext, TurnoverStep } from "../career/types";
import { aiRoundReview } from "./ai";
import { annualWageBill, sponsorshipFor } from "./create";
import { draft, post } from "./ledger";
import { divisionEconomy, economyRules } from "./rules";
import { type EconomyRules, LEDGER_CATEGORIES, type LedgerCategory } from "./types";

/**
 * Etapas financeiras da virada de temporada (research.md R8). Sem `finances` no contexto (usos
 * só da liga), não fazem nada.
 */

/** Premiação por posição (linear de `first` a `last`) e prêmio de título ao campeão (FR-012). */
export function prizeFor(
  rules: EconomyRules,
  level: number,
  position: number,
  clubs: number,
  isChampion: boolean,
): number {
  const { first, last, title } = divisionEconomy(rules, level).prizes;
  const step = clubs > 1 ? Math.round(((first - last) * (position - 1)) / (clubs - 1)) : 0;
  return first - step + (isChampion ? title : 0);
}

export const payPrizes: TurnoverStep = {
  id: "pay-prizes",
  run: (context) => {
    if (!context.finances) return context;
    const rules = economyRules(context.world, context.finished.competitionId);
    const working = draft(context.finances);
    for (const season of [...context.finished.divisions].sort(
      (a, b) => a.divisionLevel - b.divisionLevel,
    )) {
      const table = context.finalStandings[season.divisionLevel] ?? [];
      for (const row of table) {
        post(working, {
          clubId: row.clubId,
          season: context.finished.number,
          round: 0,
          category: "prize",
          amount: prizeFor(
            rules,
            season.divisionLevel,
            row.position,
            table.length,
            row.position === 1,
          ),
        });
      }
    }
    return { ...context, finances: working };
  },
};

export const closeFinanceSeason: TurnoverStep = {
  id: "close-finance-season",
  run: (context) => {
    if (!context.finances) return context;
    const working = draft(context.finances);
    const empty = () =>
      Object.fromEntries(LEDGER_CATEGORIES.map((category) => [category, 0])) as Record<
        LedgerCategory,
        number
      >;
    const totals = new Map<string, Record<LedgerCategory, number>>();
    for (const entry of working.ledger) {
      const club = totals.get(entry.clubId) ?? empty();
      club[entry.category] += entry.amount;
      totals.set(entry.clubId, club);
    }
    for (const clubId of Object.keys(working.clubs).sort()) {
      const club = working.clubs[clubId];
      if (!club) continue;
      working.seasons.push({
        season: context.finished.number,
        year: context.finished.year,
        clubId,
        startCash: club.seasonStartCash,
        endCash: club.cash,
        totals: totals.get(clubId) ?? empty(),
        debtEnd: club.debt,
        capacityEnd: club.capacity,
      });
      club.seasonStartCash = club.cash;
    }
    working.ledger = [];
    working.gates = [];
    return { ...context, finances: working };
  },
};

export const paySponsorship: TurnoverStep = {
  id: "pay-sponsorship",
  run: (context: TurnoverContext) => {
    if (!context.finances || !context.league) return context;
    const rules = economyRules(context.world, context.league.competitionId);
    const working = draft(context.finances);
    for (const season of context.league.divisions) {
      for (const clubId of [...season.clubIds].sort()) {
        const reputation = context.world.clubs.find((club) => club.id === clubId)?.reputation ?? 0;
        const wages = annualWageBill(
          context.world,
          clubId,
          seasonDate(context.world.manifest.referenceDate, context.league.year),
        );
        post(working, {
          clubId,
          season: context.league.number,
          round: 0,
          category: "sponsorship",
          amount: sponsorshipFor(rules, season.divisionLevel, reputation, wages),
        });
      }
    }
    return { ...context, finances: working };
  },
};

/** Início de temporada: a IA só revisa o crédito (ainda não há jogos para medir a ocupação). */
export const aiFinanceReview: TurnoverStep = {
  id: "ai-finance-review",
  run: (context) => {
    if (!context.finances || !context.league) return context;
    return {
      ...context,
      finances: aiRoundReview(
        context.finances,
        context.league,
        context.world,
        0,
        context.managerClubId ?? "",
        {
          prices: false,
          works: false,
        },
      ),
    };
  },
};
