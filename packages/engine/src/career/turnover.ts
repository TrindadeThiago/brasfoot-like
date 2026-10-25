/**
 * Virada de temporada como pipeline de etapas nomeadas (research.md R5, FR-017 a FR-019).
 *
 * Contrato de extensão para sistemas futuros (finanças, evolução, mercado, diretoria):
 * - uma etapa é `{ id, run(context) }`; `run` é pura e devolve um novo contexto;
 * - registre-a com `{ step, before: "<id>" }` ou `{ step, after: "<id>" }`, onde a âncora é uma
 *   etapa padrão (`TURNOVER_STEP_IDS`) ou outra etapa extra;
 * - várias etapas na mesma âncora e direção rodam em ordem de `id` (nunca na ordem de registro);
 * - o contexto traz a temporada encerrada (`finished`, só leitura), as classificações finais, o
 *   histórico, o rascunho da próxima temporada (`next`) e, depois de `generate-calendars`, a nova
 *   liga (`league`), além das finanças (`finances`) quando a carreira as tem; toda aleatoriedade
 *   vem de `rng(id)`, um gerador próprio de cada etapa.
 * Sistemas que mudam elencos rodam antes de `generate-calendars`; os que leem o resultado da
 * temporada rodam depois de `record-history`. As finanças (008) são etapas padrão: premiação e
 * fechamento da temporada logo depois de `record-history`; patrocínio e revisão da IA depois de
 * `generate-calendars`.
 */

import { boardNewSeasonStep } from "../board/turnover";
import { seasonDate } from "../calendar/date";
import { continentalEdition } from "../continental/history";
import { continentalReputationStep } from "../continental/reputation";
import { isInternationalCompetition } from "../continental/scope";
import { fansNewSeasonStep } from "../fans/turnover";
import {
  aiFinanceReview,
  closeFinanceSeason,
  payPrizes,
  paySponsorship,
} from "../finance/turnover";
import { cupEntry, cupSeasonOf } from "../knockout/history";
import {
  ageOutFreeAgentsStep,
  expireContractsStep,
  resetMarketStep,
  returnLoansStep,
} from "../market/turnover";
import type { CompletedBank } from "../model/types";
import { newsNewSeasonStep, newsQualificationStep } from "../news/turnover";
import { applyQualification } from "../qualification/apply";
import { resolveFinishedSeasons } from "../qualification/finish";
import {
  balanceSquadsStep,
  evolvePlayersStep,
  generateYouthStep,
  regulateWorldStep,
  retirePlayersStep,
} from "../renewal/turnover";
import { createRng } from "../rng/xoshiro";
import { type SeasonError, seasonError } from "../season/errors";
import { standings } from "../season/standings";
import type { PlayerStatus, StandingRow } from "../season/types";
import { isCountryMain } from "../world/countries";
import { nextComposition } from "./composition";
import { competitionEntry, historyEntry } from "./history";
import { isLeagueSeasonOver, leagueRound, leagueSeasonSeed } from "./league";
import { createCareerSeason } from "./season-state";
import type {
  LeagueSeason,
  SeasonHistoryEntry,
  TurnoverContext,
  TurnoverOptions,
  TurnoverRegistration,
  TurnoverResult,
  TurnoverStep,
} from "./types";

export const TURNOVER_STEP_IDS = [
  "record-history",
  "continental-reputation",
  "fans-new-season",
  "news-new-season",
  "pay-prizes",
  "close-finance-season",
  "return-loans",
  "evolve-players",
  "retire-players",
  "expire-contracts",
  "regulate-world",
  "generate-youth",
  "balance-squads",
  "age-out-free-agents",
  "promotion-relegation",
  "resolve-qualification",
  "news-qualification",
  "advance-year",
  "reset-season-stats",
  "generate-calendars",
  "pay-sponsorship",
  "ai-finance-review",
  "reset-market",
  "board-new-season",
] as const;

/** Falha de uma etapa, convertida em erro da virada por `seasonTurnover`. */
class TurnoverFailure extends Error {
  constructor(readonly error: SeasonError) {
    super(error.code);
  }
}

const recordHistory: TurnoverStep = {
  id: "record-history",
  run: (context) => ({
    ...context,
    history: [
      ...context.history,
      historyEntry(
        context.finished,
        context.finalStandings,
        nextComposition(context.finished, context.world),
      ),
    ],
    // As competições secundárias guardam o próprio histórico (017 FR-034); as copas, o delas (018).
    competitionHistory: [
      ...(context.competitionHistory ?? []),
      ...(context.finishedCompetitions ?? [])
        .filter((league) => !cupSeasonOf(league))
        .map((league) => competitionEntry(league, context.world)),
    ],
    cupHistory: [
      ...(context.cupHistory ?? []),
      ...(context.finishedCompetitions ?? []).flatMap((league) => cupEntry(league) ?? []),
    ],
    // Competições entre países (022): uma edição por temporada encerrada.
    continentalHistory: [
      ...(context.continentalHistory ?? []),
      ...(context.finishedCompetitions ?? []).flatMap((league) =>
        isInternationalCompetition(context.world, league.competitionId)
          ? (continentalEdition(context.world, league) ?? [])
          : [],
      ),
    ],
  }),
};

const promotionRelegation: TurnoverStep = {
  id: "promotion-relegation",
  run: (context) => ({
    ...context,
    next: {
      ...context.next,
      composition: nextComposition(context.finished, context.world).composition,
    },
  }),
};

/**
 * Vagas entre competições (021 R2): resolve, depois das pirâmides, quem disputa as competições
 * alimentadas na próxima temporada e grava no mundo vivo. Sem vagas no banco não faz nada.
 */
const resolveQualificationStep: TurnoverStep = {
  id: "resolve-qualification",
  run: (context) => {
    const { world } = context;
    const finished = [context.finished, ...(context.finishedCompetitions ?? [])];
    const outcome = resolveFinishedSeasons(world, finished, context.finished);
    if (!outcome) return context;
    if (!outcome.ok) throw new TurnoverFailure(outcome.error);
    const result = outcome.result;
    return {
      ...context,
      world: applyQualification(world, result),
      qualification: result,
      qualificationHistory: [...(context.qualificationHistory ?? []), result.record],
      next: {
        ...context.next,
        composition:
          result.compositions[context.finished.competitionId] ?? context.next.composition,
      },
    };
  },
};

const advanceYear: TurnoverStep = {
  id: "advance-year",
  run: (context) => {
    const number = context.finished.number + 1;
    const year = context.finished.year + 1;
    const manifest = context.world.manifest;
    return {
      ...context,
      // O mundo vivo avança no tempo (009): a data de referência acompanha a temporada, para que
      // as idades dos jogadores gerados sigam válidas pelo schema do banco.
      world: {
        ...context.world,
        manifest: { ...manifest, referenceDate: seasonDate(manifest.referenceDate, year) },
      },
      next: {
        ...context.next,
        number,
        year,
        seed: leagueSeasonSeed(context.careerSeed, number),
      },
    };
  },
};

/** Estatística da temporada recomeça; lesão é condição do jogador e continua (R7). */
const resetSeasonStats: TurnoverStep = {
  id: "reset-season-stats",
  run: (context) => {
    const carryOver: Record<string, PlayerStatus> = {};
    for (const season of context.finished.divisions) {
      for (const [playerId, entry] of Object.entries(season.status)) {
        if (entry.injury > 0)
          carryOver[playerId] = { yellows: 0, suspension: 0, injury: entry.injury };
      }
    }
    return { ...context, next: { ...context.next, carryOver } };
  },
};

const generateCalendars: TurnoverStep = {
  id: "generate-calendars",
  run: (context) => {
    const carry = context.next.carryOver;
    const compositions: Record<string, Record<number, readonly string[]>> = {
      [context.finished.competitionId]: context.next.composition,
    };
    const statuses: Record<string, Record<string, PlayerStatus>> = {
      [context.finished.competitionId]: carry,
    };
    for (const league of context.finishedCompetitions ?? []) {
      if (cupSeasonOf(league)) {
        // A copa recomeça do zero com novo sorteio; só as lesões passam (018).
        statuses[league.competitionId] = carry;
        continue;
      }
      compositions[league.competitionId] =
        context.qualification?.compositions[league.competitionId] ??
        nextComposition(league, context.world).composition;
      // Lesões valem para todas as competições; os cartões recomeçam.
      statuses[league.competitionId] = carry;
    }
    const created = createCareerSeason(context.world, {
      careerSeed: context.careerSeed,
      number: context.next.number,
      year: context.next.year,
      compositions,
      statuses,
      leagueCompetitionId: context.finished.competitionId,
    });
    if (!created.ok) throw new TurnoverFailure(created.error);
    const origins = context.qualification?.origins ?? {};
    const withOrigins = (season: LeagueSeason): LeagueSeason => {
      const own = origins[season.competitionId];
      return own ? { ...season, origins: own } : season;
    };
    return {
      ...context,
      league: withOrigins(created.league),
      competitions: created.competitions.map(withOrigins),
      calendar: created.calendar,
    };
  },
};

function countryOfCompetition(world: CompletedBank, competitionId: string): string | undefined {
  return world.competitions.find((entry) => entry.id === competitionId)?.countryId;
}

/** Ligas principais encerradas dos outros países, na ordem do banco (020 R6). */
function foreignFinished(context: TurnoverContext): LeagueSeason[] {
  return (context.finishedCompetitions ?? []).filter((league) =>
    isCountryMain(context.world, league.competitionId),
  );
}

/** O contexto da virada visto de uma liga principal de outro país (020 R6). */
function foreignContext(context: TurnoverContext, league: LeagueSeason): TurnoverContext {
  const { world } = context;
  const country = countryOfCompetition(world, league.competitionId);
  const sameCountry = (competitionId: string) =>
    competitionId !== league.competitionId &&
    countryOfCompetition(world, competitionId) === country;
  const finalStandings: Record<number, StandingRow[]> = {};
  for (const season of league.divisions) {
    finalStandings[season.divisionLevel] = standings(season, world);
  }
  const { league: _league, competitions: _competitions, ...rest } = context;
  const created = context.competitions?.find(
    (entry) => entry.competitionId === league.competitionId,
  );
  return {
    ...rest,
    finished: league,
    finalStandings,
    finishedCompetitions: (context.finishedCompetitions ?? []).filter((entry) =>
      sameCountry(entry.competitionId),
    ),
    ...(created
      ? {
          league: created,
          competitions: (context.competitions ?? []).filter((entry) =>
            sameCountry(entry.competitionId),
          ),
        }
      : {}),
  };
}

/**
 * Etapa que age sobre uma liga (020 R6): roda para as ligas principais dos outros países, cada uma
 * com o seu contexto, e por último para a do técnico (que fica com a última palavra sobre o que o
 * jogador vê, como a última evolução). Sem outros países, é a própria etapa.
 */
function perCountry(step: TurnoverStep): TurnoverStep {
  return {
    id: step.id,
    run: (context) => {
      let current = context;
      for (const league of foreignFinished(context)) {
        const done = step.run(foreignContext(current, league));
        current = {
          ...current,
          world: done.world,
          ...(done.finances ? { finances: done.finances } : {}),
          ...(done.renewal ? { renewal: done.renewal } : {}),
          ...(done.market ? { market: done.market } : {}),
          ...(done.board ? { board: done.board } : {}),
          ...(done.fans ? { fans: done.fans } : {}),
          ...(done.news ? { news: done.news } : {}),
        };
      }
      return step.run(current);
    },
  };
}

/** Etapas padrão, na ordem fixa documentada (FR-017). */
export const DEFAULT_TURNOVER_STEPS: readonly TurnoverStep[] = [
  recordHistory,
  continentalReputationStep,
  fansNewSeasonStep,
  newsNewSeasonStep,
  perCountry(payPrizes),
  closeFinanceSeason,
  returnLoansStep,
  perCountry(evolvePlayersStep),
  perCountry(retirePlayersStep),
  expireContractsStep,
  perCountry(regulateWorldStep),
  perCountry(generateYouthStep),
  perCountry(balanceSquadsStep),
  ageOutFreeAgentsStep,
  promotionRelegation,
  resolveQualificationStep,
  newsQualificationStep,
  advanceYear,
  resetSeasonStats,
  generateCalendars,
  perCountry(paySponsorship),
  perCountry(aiFinanceReview),
  resetMarketStep,
  perCountry(boardNewSeasonStep),
];

function stepsError(stepId: string, reason: string) {
  return { ok: false as const, error: seasonError("turnover.invalid_steps", { stepId, reason }) };
}

/**
 * Ordem final das etapas (FR-018): cada extra fica imediatamente antes/depois da âncora; extras
 * na mesma âncora e direção são ordenadas por id.
 */
export function resolveTurnoverSteps(
  extras: readonly TurnoverRegistration[] = [],
): { ok: true; steps: TurnoverStep[] } | { ok: false; error: SeasonError } {
  const ids = new Set<string>(DEFAULT_TURNOVER_STEPS.map((step) => step.id));
  for (const registration of extras) {
    if (ids.has(registration.step.id)) return stepsError(registration.step.id, "id repetido");
    ids.add(registration.step.id);
  }
  const attached = new Map<string, { before: TurnoverStep[]; after: TurnoverStep[] }>();
  for (const registration of extras) {
    const anchor = registration.before ?? registration.after;
    if (anchor === undefined || !ids.has(anchor)) {
      return stepsError(registration.step.id, `âncora inexistente: ${String(anchor)}`);
    }
    const slot = attached.get(anchor) ?? { before: [], after: [] };
    (registration.before !== undefined ? slot.before : slot.after).push(registration.step);
    attached.set(anchor, slot);
  }
  const byId = (a: TurnoverStep, b: TurnoverStep) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  // Só o que está pendurado nas etapas padrão é alcançado; extras em ciclo ficam de fora.
  const expand = (step: TurnoverStep): TurnoverStep[] => {
    const slot = attached.get(step.id);
    return [
      ...[...(slot?.before ?? [])].sort(byId).flatMap(expand),
      step,
      ...[...(slot?.after ?? [])].sort(byId).flatMap(expand),
    ];
  };
  const steps = DEFAULT_TURNOVER_STEPS.flatMap(expand);
  if (steps.length !== ids.size) {
    const placed = new Set(steps.map((step) => step.id));
    const lost = extras.find((registration) => !placed.has(registration.step.id));
    return stepsError(lost?.step.id ?? "", "âncora circular");
  }
  return { ok: true, steps };
}

/** Motivo pelo qual a nova liga viola os invariantes da temporada (data-model.md). */
function hasBerths(world: CompletedBank, competitionId: string): boolean {
  return (
    world.competitions
      .find((entry) => entry.id === competitionId)
      ?.divisions.some((division) => (division.berths?.length ?? 0) > 0) ?? false
  );
}

function resultProblem(
  world: CompletedBank,
  finished: LeagueSeason,
  league: LeagueSeason | undefined,
): string | undefined {
  if (!league) return "a etapa generate-calendars não criou a temporada";
  if (league.divisions.length !== finished.divisions.length) return "número de divisões mudou";
  const before = finished.divisions.flatMap((season) => season.clubIds).sort();
  const after = league.divisions.flatMap((season) => season.clubIds).sort();
  if (before.join() !== after.join() && !hasBerths(world, finished.competitionId)) {
    return "os clubes da competição mudaram";
  }
  for (const season of finished.divisions) {
    const next = league.divisions.find((entry) => entry.divisionLevel === season.divisionLevel);
    if (!next) return `divisão ${season.divisionLevel} sumiu`;
    if (next.clubIds.length !== season.clubIds.length)
      return `divisão ${season.divisionLevel} mudou de tamanho`;
    if (next.nextRound !== 1 || next.records.length > 0)
      return `divisão ${season.divisionLevel} não começa do zero`;
  }
  return undefined;
}

/**
 * Executa a virada sobre uma liga encerrada (contracts/league-api.md). Determinística: mesma liga,
 * mesmo histórico e mesmas etapas ⇒ mesmo resultado. Não altera as entradas.
 */
export function seasonTurnover(
  league: LeagueSeason,
  world: CompletedBank,
  history: readonly SeasonHistoryEntry[],
  options: TurnoverOptions,
): TurnoverResult {
  if (!isLeagueSeasonOver(league)) {
    return {
      ok: false,
      error: seasonError("turnover.season_not_over", { round: leagueRound(league) }),
    };
  }
  const resolved = resolveTurnoverSteps(options.extraSteps);
  if (!resolved.ok) return resolved;
  const finalStandings: Record<number, StandingRow[]> = {};
  for (const season of league.divisions) {
    finalStandings[season.divisionLevel] = standings(season, world);
  }
  const nextNumber = league.number + 1;
  let context: TurnoverContext = {
    world,
    careerSeed: options.careerSeed,
    finished: league,
    finalStandings,
    history: [...history],
    next: {
      number: league.number,
      year: league.year,
      seed: league.seed,
      composition: {},
      carryOver: {},
    },
    rng: (stepId) => createRng(`${options.careerSeed}:turnover:${nextNumber}:${stepId}`),
    ...(options.finances ? { finances: options.finances } : {}),
    ...(options.managerClubId ? { managerClubId: options.managerClubId } : {}),
    ...(options.renewal ? { renewal: options.renewal } : {}),
    ...(options.market ? { market: options.market } : {}),
    ...(options.board ? { board: options.board } : {}),
    ...(options.fans ? { fans: options.fans } : {}),
    ...(options.news ? { news: options.news } : {}),
    ...(options.competitions ? { finishedCompetitions: options.competitions } : {}),
    ...(options.calendar ? { finishedCalendar: options.calendar } : {}),
    ...(options.competitionHistory ? { competitionHistory: [...options.competitionHistory] } : {}),
    ...(options.cupHistory ? { cupHistory: [...options.cupHistory] } : {}),
    ...(options.qualificationHistory
      ? { qualificationHistory: [...options.qualificationHistory] }
      : {}),
    ...(options.continentalHistory ? { continentalHistory: [...options.continentalHistory] } : {}),
  };
  try {
    for (const step of resolved.steps) context = step.run(context);
  } catch (error) {
    if (error instanceof TurnoverFailure) {
      return {
        ok: false,
        error: seasonError("turnover.invalid_result", {
          reason: `${error.error.code}: ${JSON.stringify(error.error.params)}`,
        }),
      };
    }
    throw error;
  }
  const problem = resultProblem(context.world, league, context.league);
  if (problem || !context.league) {
    return {
      ok: false,
      error: seasonError("turnover.invalid_result", { reason: problem ?? "sem temporada" }),
    };
  }
  return {
    ok: true,
    league: context.league,
    history: context.history,
    ...(context.finances ? { finances: context.finances } : {}),
    world: context.world,
    ...(context.renewal ? { renewal: context.renewal } : {}),
    ...(context.market ? { market: context.market } : {}),
    ...(context.board ? { board: context.board } : {}),
    ...(context.fans ? { fans: context.fans } : {}),
    ...(context.news ? { news: context.news } : {}),
    ...(context.competitions ? { competitions: context.competitions } : {}),
    ...(context.calendar ? { calendar: context.calendar } : {}),
    ...(context.competitionHistory ? { competitionHistory: context.competitionHistory } : {}),
    ...(context.cupHistory ? { cupHistory: context.cupHistory } : {}),
    ...(context.qualificationHistory ? { qualificationHistory: context.qualificationHistory } : {}),
    ...(context.continentalHistory && context.continentalHistory.length > 0
      ? { continentalHistory: context.continentalHistory }
      : {}),
  };
}
