import { managerClubOf } from "../board/create";
import { boardAfterExtraMatches } from "../board/round";
import type { CalendarSlot } from "../calendar/season-calendar";
import { fansAfterExtraMatches } from "../fans/mood";
import {
  applyExtraGates,
  applyRoundSystems,
  type CareerBoard,
  type CareerFans,
  type CareerMarket,
  type CareerNews,
  type CareerRenewal,
  type CareerRoundResult,
} from "../finance/round";
import type { FinanceState } from "../finance/types";
import { fitnessAfterMatches, worldWithFitness } from "../fitness/fitness";
import { fitnessRules } from "../fitness/rules";
import type { Lineup } from "../match/types";
import type { CompletedBank } from "../model/types";
import { newsAfterExtraMatches } from "../news/round";
import type { SeasonError } from "../season/errors";
import { finishRound, type LiveRound } from "../season/live-round";
import type { MatchRecord, SeasonStep } from "../season/types";
import { clubsInRound, syncInjuries } from "./injuries";
import { leagueRound } from "./league";
import { completeLeagueRound, startLeagueRound } from "./league-round";
import {
  type CareerSeasonState,
  competitionSeason,
  currentDay,
  type DayMatch,
  isCalendarOver,
  leagueCalendar,
  nextClubFixture,
  roundMatches,
} from "./season-state";
import type { LeagueSeason } from "./types";

/**
 * Dia de jogos da carreira (017 R4): fecha, de uma vez, as rodadas de todas as competições que
 * jogam na data e aplica as consequências do dia. Ao vivo e direto usam este mesmo caminho.
 */

export type CareerDayResult =
  | { ok: true; state: CareerSeasonState }
  | { ok: false; error: SeasonError };

/** O clube joga na rodada do slot? */
function playsIn(
  state: CareerSeasonState,
  slot: CalendarSlot,
  clubIds: readonly string[],
): boolean {
  const season = competitionSeason(state, slot.competitionId);
  return season.divisions.some((division) =>
    division.calendar[slot.round - 1]?.fixtures.some(
      (fixture) => clubIds.includes(fixture.home) || clubIds.includes(fixture.away),
    ),
  );
}

/**
 * Temporada da competição do slot pronta para a rodada: as secundárias recebem as lesões da
 * principal dos clubes que jogam (017 R6, lesões valem para todas as competições).
 */
function slotSeason(state: CareerSeasonState, slot: CalendarSlot): LeagueSeason {
  const season = competitionSeason(state, slot.competitionId);
  if (slot.competitionId === state.league.competitionId) return season;
  return syncInjuries(state.league, season, state.world, clubsInRound(season, slot.round));
}

/** Slot do dia em que o clube joga, se jogar. */
function clubSlot(state: CareerSeasonState, clubId: string): CalendarSlot | undefined {
  const day = currentDay(state);
  return day?.slots.find((slot) => playsIn(state, slot, [clubId]));
}

/**
 * Rodada ao vivo da competição em que `clubId` joga hoje; sem `live` quando o clube não joga no
 * dia. `lineups` vale para os clubes que jogam na rodada.
 */
export function startCareerDay(
  state: CareerSeasonState,
  clubId: string,
  lineups?: Record<string, Lineup>,
): { ok: true; live?: LiveRound } | { ok: false; error: SeasonError } {
  const day = currentDay(state);
  if (!day) throw new Error("temporada encerrada");
  const slot = clubSlot(state, clubId);
  if (!slot) return { ok: true };
  const started = startLeagueRound(slotSeason(state, slot), tiredWorld(state, day.date), lineups);
  if (!started.ok) return started;
  return { ok: true, live: { ...started.round, date: day.date } };
}

/** Mundo do dia: a força dos jogadores cansados reduzida (017 R5); regras da competição principal. */
function tiredWorld(state: CareerSeasonState, date: string) {
  const rules = fitnessRules(state.world, state.league.competitionId);
  return worldWithFitness(state.world, state.fitness, date, rules);
}

function systemsOf(state: CareerSeasonState, careerSeed: string) {
  return {
    ...(state.renewal ? { renewal: { state: state.renewal, careerSeed } } : {}),
    ...(state.market ? { market: { state: state.market, careerSeed } } : {}),
    ...(state.board ? { board: { state: state.board, careerSeed } } : {}),
    ...(state.fans ? { fans: { state: state.fans } } : {}),
    ...(state.news ? { news: { state: state.news, careerSeed } } : {}),
  };
}

function withLeague(state: CareerSeasonState, season: LeagueSeason): CareerSeasonState {
  if (season.competitionId === state.league.competitionId) return { ...state, league: season };
  return {
    ...state,
    competitions: state.competitions.map((entry) =>
      entry.competitionId === season.competitionId ? season : entry,
    ),
  };
}

function withSystems(state: CareerSeasonState, result: CareerRoundResult & { ok: true }) {
  return {
    ...state,
    league: result.league,
    finances: result.finances,
    world: result.world,
    ...(result.renewal ? { renewal: result.renewal } : {}),
    ...(result.market ? { market: result.market } : {}),
    ...(result.board ? { board: result.board } : {}),
    ...(result.fans ? { fans: result.fans } : {}),
    ...(result.news ? { news: result.news } : {}),
  };
}

/**
 * Fecha o dia atual. `live` é a rodada ao vivo do clube do jogador (já terminada); sem ela, o
 * jogo dele é simulado direto com `lineups`. As demais competições do dia são sempre simuladas
 * direto. Não altera a entrada.
 */
export function completeCareerDay(
  state: CareerSeasonState,
  careerSeed: string,
  managerClubId: string,
  live?: LiveRound,
  lineups?: Record<string, Lineup>,
): CareerDayResult {
  const day = currentDay(state);
  if (!day) throw new Error("temporada encerrada");
  if (live) {
    if (live.date !== undefined && live.date !== day.date) throw new Error("rodada de outro dia");
    if (!day.slots.some((slot) => slot.competitionId === live.competitionId)) {
      throw new Error("rodada de outra competição");
    }
  }
  const lineupClubs = Object.keys(lineups ?? {});
  let next = state;
  let principalRound: number | undefined;
  const played: MatchRecord[] = [];
  /** Jogos das competições secundárias do dia (a principal tem o caminho próprio). */
  const extra: DayMatch[] = [];
  for (const slot of day.slots) {
    const season = slotSeason(next, slot);
    let round: LiveRound;
    if (live && live.competitionId === slot.competitionId) {
      round = live;
    } else {
      const own = lineups && playsIn(next, slot, lineupClubs) ? lineups : undefined;
      const started = startLeagueRound(season, tiredWorld(state, day.date), own);
      if (!started.ok) return started;
      round = finishRound(started.round);
    }
    const completed = completeLeagueRound(season, next.world, round);
    if (!completed.ok) return completed;
    next = withLeague(next, completed.league);
    if (slot.competitionId !== state.league.competitionId) {
      // As lesões novas e o desconto do jogo voltam para a principal.
      const clubs = clubsInRound(completed.league, slot.round);
      next = { ...next, league: syncInjuries(completed.league, next.league, next.world, clubs) };
    }
    const matches = roundMatches(completed.league, slot.round, day.date);
    played.push(...matches.map((match) => match.record));
    if (slot.competitionId === state.league.competitionId) principalRound = slot.round;
    else extra.push(...matches);
  }
  if (principalRound !== undefined) {
    // Consequências da rodada da principal (finanças, evolução, mercado, torcida, diretoria,
    // notícias): o mesmo caminho da rodada antiga.
    const systems = systemsOf(next, careerSeed);
    const applied = applyRoundSystems(
      next.league,
      next.finances,
      next.world,
      principalRound,
      managerClubId,
      systems.renewal,
      systems.market,
      systems.board,
      systems.fans,
      systems.news,
      next.competitions,
    );
    if (!applied.ok) return applied;
    next = withSystems(next, applied);
  }
  if (extra.length > 0) next = afterExtraMatches(next, careerSeed, managerClubId, extra);
  const rules = fitnessRules(next.world, next.league.competitionId);
  const fitness = fitnessAfterMatches(next.fitness, played, day.date, rules);
  return { ok: true, state: { ...next, fitness } };
}

/**
 * Consequências dos jogos de competições secundárias (017 FR-027, FR-029): bilheteria de todo jogo
 * em casa e reação da torcida, da diretoria e das notícias ao resultado. Folha, juros, mercado,
 * metas e avaliação seguem os dias da liga principal.
 */
function afterExtraMatches(
  state: CareerSeasonState,
  careerSeed: string,
  managerClubId: string,
  matches: readonly DayMatch[],
): CareerSeasonState {
  const round = Math.max(1, leagueRound(state.league) - 1);
  const manager = currentManager(state, managerClubId);
  // A bilheteria usa o humor de antes do jogo.
  const finances = applyExtraGates(state.finances, state.league, state.world, matches, state.fans);
  let next: CareerSeasonState = { ...state, finances };
  if (next.fans) {
    next = {
      ...next,
      fans: fansAfterExtraMatches(
        { world: next.world, league: next.league, finances, fans: next.fans },
        matches,
        round,
        manager,
      ),
    };
  }
  if (next.board) {
    next = {
      ...next,
      board: boardAfterExtraMatches(
        {
          world: next.world,
          league: next.league,
          finances,
          board: next.board,
          careerSeed,
          ...(next.fans ? { fans: next.fans } : {}),
        },
        matches,
        round,
      ),
    };
  }
  if (next.news) {
    next = {
      ...next,
      news: newsAfterExtraMatches(
        {
          world: next.world,
          league: next.league,
          news: next.news,
          careerSeed,
          managerClubId: manager,
        },
        matches,
        round,
      ),
    };
  }
  return next;
}

/** O clube do técnico: com diretoria, pode mudar no meio do avanço (demissão). */
function currentManager(state: CareerSeasonState, fallback: string): string {
  return state.board ? managerClubOf(state.board) : fallback;
}

/**
 * Simula os dias em que o clube do jogador não joga e para no dia do próximo jogo dele (FR-011).
 * Sem jogos restantes do clube, simula até o fim da temporada (FR-013). `followClubId` é o clube
 * cujo jogo interrompe o avanço (padrão: o do técnico; desempregado, o clube em foco).
 */
export function advanceCareerToNextMatch(
  state: CareerSeasonState,
  careerSeed: string,
  managerClubId: string,
  followClubId?: string,
): CareerDayResult {
  let current = state;
  while (!isCalendarOver(current)) {
    const manager = currentManager(current, managerClubId);
    const target = nextClubFixture(current, followClubId ?? manager);
    const day = currentDay(current);
    if (target && day && target.date === day.date) break;
    const done = completeCareerDay(current, careerSeed, manager);
    if (!done.ok) return done;
    current = done.state;
  }
  return { ok: true, state: current };
}

/** `lineups` só vale no primeiro dia, e só se o clube jogar nele. */
export function advanceCareerDays(
  state: CareerSeasonState,
  step: { days: number } | { toEnd: true },
  careerSeed: string,
  managerClubId: string,
  lineups?: Record<string, Lineup>,
): CareerDayResult {
  let current = state;
  const total = "toEnd" in step ? current.calendar.days.length : step.days;
  for (let played = 0; played < total && !isCalendarOver(current); played++) {
    const manager = currentManager(current, managerClubId);
    const done = completeCareerDay(
      current,
      careerSeed,
      manager,
      undefined,
      played === 0 ? lineups : undefined,
    );
    if (!done.ok) return done;
    current = done.state;
  }
  return { ok: true, state: current };
}

/** Sistemas opcionais da carreira (renovação, mercado, diretoria, torcida e notícias) de uma chamada. */
interface LegacySystems {
  renewal?: CareerRenewal;
  market?: CareerMarket;
  board?: CareerBoard;
  fans?: CareerFans;
  news?: CareerNews;
}

/** Estado de uma carreira só com a competição principal, a partir das peças soltas. */
function principalOnly(
  league: LeagueSeason,
  finances: FinanceState,
  world: CompletedBank,
  systems: LegacySystems,
): { state: CareerSeasonState; careerSeed: string } {
  const careerSeed =
    systems.renewal?.careerSeed ??
    systems.market?.careerSeed ??
    systems.board?.careerSeed ??
    systems.news?.careerSeed ??
    league.seed;
  return {
    careerSeed,
    state: {
      league,
      competitions: [],
      calendar: leagueCalendar(world, league),
      fitness: { players: {} },
      finances,
      world,
      ...(systems.renewal ? { renewal: systems.renewal.state } : {}),
      ...(systems.market ? { market: systems.market.state } : {}),
      ...(systems.board ? { board: systems.board.state } : {}),
      ...(systems.fans ? { fans: systems.fans.state } : {}),
      ...(systems.news ? { news: systems.news.state } : {}),
    },
  };
}

function legacyResult(state: CareerSeasonState): Extract<CareerRoundResult, { ok: true }> {
  return {
    ok: true,
    league: state.league,
    finances: state.finances,
    world: state.world,
    ...(state.renewal ? { renewal: state.renewal } : {}),
    ...(state.market ? { market: state.market } : {}),
    ...(state.board ? { board: state.board } : {}),
    ...(state.fans ? { fans: state.fans } : {}),
    ...(state.news ? { news: state.news } : {}),
  };
}

/**
 * Fecha a rodada da liga principal (ao vivo ou direta) e aplica o que acontece depois, num passo,
 * para carreiras só com a competição principal. É `completeCareerDay` sobre o calendário da liga.
 */
export function completeCareerRound(
  league: LeagueSeason,
  finances: FinanceState,
  world: CompletedBank,
  round: LiveRound,
  managerClubId: string,
  renewal?: CareerRenewal,
  market?: CareerMarket,
  board?: CareerBoard,
  fans?: CareerFans,
  news?: CareerNews,
): CareerRoundResult {
  const { state, careerSeed } = principalOnly(league, finances, world, {
    ...(renewal ? { renewal } : {}),
    ...(market ? { market } : {}),
    ...(board ? { board } : {}),
    ...(fans ? { fans } : {}),
    ...(news ? { news } : {}),
  });
  const done = completeCareerDay(state, careerSeed, managerClubId, round);
  return done.ok ? legacyResult(done.state) : done;
}

/**
 * Joga `step` rodadas da liga principal (ou até o fim) com os sistemas da carreira, para carreiras
 * só com a competição principal: simulações e testes. É `advanceCareerDays` sobre o calendário da
 * liga.
 */
export function advanceCareer(
  league: LeagueSeason,
  finances: FinanceState,
  world: CompletedBank,
  step: SeasonStep,
  managerClubId: string,
  lineups?: Record<string, Lineup>,
  renewal?: CareerRenewal,
  market?: CareerMarket,
  board?: CareerBoard,
  fans?: CareerFans,
  news?: CareerNews,
): CareerRoundResult {
  const { state, careerSeed } = principalOnly(league, finances, world, {
    ...(renewal ? { renewal } : {}),
    ...(market ? { market } : {}),
    ...(board ? { board } : {}),
    ...(fans ? { fans } : {}),
    ...(news ? { news } : {}),
  });
  const days = "toEnd" in step ? ({ toEnd: true } as const) : { days: step.rounds };
  const done = advanceCareerDays(state, days, careerSeed, managerClubId, lineups);
  return done.ok ? legacyResult(done.state) : done;
}
