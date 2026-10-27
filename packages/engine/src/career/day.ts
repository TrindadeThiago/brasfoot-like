import { boardAfterContinental } from "../board/continental";
import { managerClubOf } from "../board/create";
import { boardAfterRegional } from "../board/regional";
import { boardAfterCup, boardAfterExtraMatches } from "../board/round";
import type { CalendarSlot } from "../calendar/season-calendar";
import { competitionAwards } from "../continental/awards";
import { sealDropIns } from "../continental/dropins";
import { type ContinentalFacts, continentalFacts } from "../continental/facts";
import { isInternationalCompetition } from "../continental/scope";
import type { CompetitionPrize } from "../continental/types";
import { fansAfterContinentalTitle, fansAfterCup, fansAfterExtraMatches } from "../fans/mood";
import {
  applyCupPrizes,
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
import { drawReady } from "../knockout/bracket";
import { type CupEnd, type CupEvent, cupEnd, cupEvents } from "../knockout/events";
import { cupPrizes } from "../knockout/prizes";
import type { Lineup } from "../match/types";
import type { CompletedBank, KnockoutFormat } from "../model/types";
import { newsAfterContinental, newsAfterCup, newsAfterExtraMatches } from "../news/round";
import { newsRules } from "../news/rules";
import type { SeasonError } from "../season/errors";
import { finishRound, type LiveRound } from "../season/live-round";
import type { MatchRecord, Season, SeasonStep } from "../season/types";
import { advanceStages } from "../stages/advance";
import { cupView } from "../stages/cup-view";
import { isCountryMain, mainCompetitionOf } from "../world/countries";
import { mainLeagueOfClub, simulationKindFor } from "../world/leagues";
import { clubsInRound, syncInjuries } from "./injuries";
import { leagueRound } from "./league";
import { completeLeagueRound, playSummaryLeagueRound, startLeagueRound } from "./league-round";
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
 * Ligas principais de onde vêm as lesões dos clubes de uma rodada, com os clubes de cada uma (017
 * R6): a do país da competição; numa competição entre países (022), a do país de cada clube.
 */
function injurySources(
  state: CareerSeasonState,
  competitionId: string,
  clubs: ReadonlySet<string>,
): { main: LeagueSeason; clubs: Set<string> }[] {
  const competition = state.world.competitions.find((entry) => entry.id === competitionId);
  if (!competition || competition.countryId !== undefined) {
    return [{ main: countryMain(state, competitionId), clubs: new Set(clubs) }];
  }
  const groups = new Map<string, { main: LeagueSeason; clubs: Set<string> }>();
  for (const clubId of [...clubs].sort()) {
    const main = mainLeagueOfClub(state, clubId) ?? state.league;
    const group = groups.get(main.competitionId) ?? { main, clubs: new Set<string>() };
    group.clubs.add(clubId);
    groups.set(main.competitionId, group);
  }
  return [...groups.values()].sort((a, b) =>
    a.main.competitionId < b.main.competitionId ? -1 : 1,
  );
}

/**
 * Temporada da competição do slot pronta para a rodada: as secundárias recebem as lesões da
 * principal dos clubes que jogam (017 R6, lesões valem para todas as competições).
 */
function slotSeason(state: CareerSeasonState, slot: CalendarSlot): LeagueSeason {
  const season = competitionSeason(state, slot.competitionId);
  const main = countryMain(state, slot.competitionId);
  if (slot.competitionId === main.competitionId) return season;
  let synced = season;
  for (const source of injurySources(state, slot.competitionId, clubsInRound(season, slot.round))) {
    synced = syncInjuries(source.main, synced, state.world, source.clubs);
  }
  return drawn(synced, state.world);
}

/**
 * Liga principal do país da competição (020 R2): a `league` do técnico ou a de outro país, que fica
 * em `competitions`. Competição desconhecida ou de país sem liga principal cai na `league`.
 */
function countryMain(state: CareerSeasonState, competitionId: string): LeagueSeason {
  const competition = state.world.competitions.find((entry) => entry.id === competitionId);
  const main =
    competition?.countryId !== undefined
      ? mainCompetitionOf(state.world, competition.countryId)
      : undefined;
  if (!main || main.id === state.league.competitionId) return state.league;
  return state.competitions.find((entry) => entry.competitionId === main.id) ?? state.league;
}

/** Copa: sorteia as fases prontas (idempotente); as demais competições não mudam (018 R4). */
function drawn(league: LeagueSeason, world: CompletedBank): LeagueSeason {
  const season = league.divisions[0];
  if (!season?.bracket) return league;
  const ready = drawReady(season, world);
  return ready === season ? league : { ...league, divisions: [ready] };
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

/**
 * Ligação entre competições (022 R3): sela os clubes que descem de uma competição que acabou de
 * fechar uma fase e começa a fase de destino, se ela só esperava por eles. Sem ligações, devolve o
 * mesmo estado.
 */
function bridgeDropIns(state: CareerSeasonState): CareerSeasonState {
  const before = [state.league, ...state.competitions];
  const bridged = sealDropIns(state.world, before);
  if (bridged.sealed.length === 0) return state;
  let next = state;
  bridged.seasons.forEach((league, index) => {
    if (league === before[index]) return;
    next = withLeague(next, {
      ...league,
      divisions: league.divisions.map((season) => advanceStages(season, state.world)),
    });
  });
  return next;
}

/** Resultado da rodada de uma liga de outro país: a liga em si não muda, só os sistemas. */
function withForeignSystems(state: CareerSeasonState, result: CareerRoundResult & { ok: true }) {
  return {
    ...state,
    finances: result.finances,
    world: result.world,
    ...(result.renewal ? { renewal: result.renewal } : {}),
    ...(result.market ? { market: result.market } : {}),
    ...(result.board ? { board: result.board } : {}),
    ...(result.fans ? { fans: result.fans } : {}),
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
  /** Rodadas fechadas hoje das ligas principais dos outros países (020 R6). */
  const foreignRounds: { competitionId: string; round: number }[] = [];
  const played: MatchRecord[] = [];
  /** Jogos das competições secundárias do dia (a principal tem o caminho próprio). */
  const extra: DayMatch[] = [];
  /** Prêmios das regras `awards` das competições entre países (022 R4). */
  const awarded: (CompetitionPrize & { competitionId: string })[] = [];
  /** Fatos das competições entre países hoje: títulos, avanços, eliminações, goleadas (022 R7, R8). */
  const continental: ContinentalFacts = { titles: [], advances: [], eliminations: [], routs: [] };
  for (const slot of day.slots) {
    const season = slotSeason(next, slot);
    let completed: ReturnType<typeof completeLeagueRound>;
    if (simulationKindFor(next, slot.competitionId, managerClubId) === "summary") {
      // Liga de outro país: simulação resumida (020), sem rodada ao vivo nem escalação do técnico.
      completed = playSummaryLeagueRound(season, tiredWorld(state, day.date));
    } else {
      let round: LiveRound;
      if (live && live.competitionId === slot.competitionId) {
        round = live;
      } else {
        const own = lineups && playsIn(next, slot, lineupClubs) ? lineups : undefined;
        const started = startLeagueRound(season, tiredWorld(state, day.date), own);
        if (!started.ok) return started;
        round = finishRound(started.round);
      }
      completed = completeLeagueRound(season, next.world, round);
    }
    if (!completed.ok) return completed;
    next = withLeague(next, drawn(completed.league, next.world));
    const main = countryMain(next, slot.competitionId);
    if (slot.competitionId !== main.competitionId) {
      // As lesões novas e o desconto do jogo voltam para a principal do país de cada clube.
      const clubs = clubsInRound(completed.league, slot.round);
      for (const source of injurySources(next, slot.competitionId, clubs)) {
        const target = competitionSeason(next, source.main.competitionId);
        next = withLeague(next, syncInjuries(completed.league, target, next.world, source.clubs));
      }
    }
    const matches = roundMatches(completed.league, slot.round, day.date);
    awarded.push(
      ...slotAwards(
        competitionSeason(state, slot.competitionId),
        competitionSeason(next, slot.competitionId),
        next.world,
        matches,
        day.date,
      ),
    );
    if (isInternationalCompetition(next.world, slot.competitionId)) {
      const now = competitionSeason(next, slot.competitionId).divisions[0];
      const was = competitionSeason(state, slot.competitionId).divisions[0];
      if (now && was) {
        const today = continentalFacts(
          next.world,
          was,
          now,
          matches,
          newsRules(next.world, next.league.competitionId).routMargin,
        );
        continental.titles.push(...today.titles);
        continental.advances.push(...today.advances);
        continental.eliminations.push(...today.eliminations);
        continental.routs.push(...today.routs);
      }
    }
    played.push(...matches.map((match) => match.record));
    if (slot.competitionId === state.league.competitionId) principalRound = slot.round;
    else if (isCountryMain(state.world, slot.competitionId)) {
      foreignRounds.push({ competitionId: slot.competitionId, round: slot.round });
    } else extra.push(...matches);
  }
  next = bridgeDropIns(next);
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
    // Fases eliminatórias de divisões em fases da liga principal: prêmios e eliminações (019 R12).
    const knockouts = roundMatches(next.league, principalRound, day.date).filter(
      (match) => match.fixture.stage?.kind === "knockout",
    );
    if (knockouts.length > 0)
      next = afterStagedKnockout(next, careerSeed, managerClubId, knockouts);
  }
  for (const { competitionId, round } of foreignRounds) {
    const league = competitionSeason(next, competitionId);
    const siblings = next.competitions.filter(
      (entry) =>
        entry.competitionId !== competitionId &&
        countryMain(next, entry.competitionId).competitionId === competitionId,
    );
    const systems = systemsOf(next, careerSeed);
    // Sem clube do técnico nesta liga: a IA decide por todos os clubes dela.
    const applied = applyRoundSystems(
      league,
      next.finances,
      next.world,
      round,
      "",
      systems.renewal,
      systems.market,
      systems.board,
      systems.fans,
      undefined,
      siblings,
      { foreign: true },
    );
    if (!applied.ok) return applied;
    next = withForeignSystems(next, applied);
    const knockouts = roundMatches(league, round, day.date).filter(
      (match) => match.fixture.stage?.kind === "knockout",
    );
    if (knockouts.length > 0) next = foreignExtraMatches(next, league, knockouts);
  }
  if (extra.length > 0) next = afterAllExtraMatches(next, careerSeed, managerClubId, extra);
  if (next.news && Object.values(continental).some((list) => list.length > 0)) {
    next = {
      ...next,
      news: newsAfterContinental(
        {
          world: next.world,
          league: next.league,
          news: next.news,
          careerSeed,
          managerClubId: currentManager(next, managerClubId),
        },
        continental,
        Math.max(1, leagueRound(next.league) - 1),
      ),
    };
  }
  if (next.fans && continental.titles.length > 0) {
    next = {
      ...next,
      fans: fansAfterContinentalTitle(
        { world: next.world, league: next.league, finances: next.finances, fans: next.fans },
        continental.titles,
        Math.max(1, leagueRound(next.league) - 1),
        currentManager(next, managerClubId),
      ),
    };
  }
  if (
    next.board &&
    extra.some((match) => isInternationalCompetition(next.world, match.competitionId))
  ) {
    // Meta continental (022 R6): avaliada quando a campanha de um clube termina.
    next = {
      ...next,
      board: boardAfterContinental(
        {
          world: next.world,
          league: next.league,
          finances: next.finances,
          board: next.board,
          careerSeed,
        },
        [next.league, ...next.competitions],
        Math.max(1, leagueRound(next.league) - 1),
      ),
    };
  }
  if (next.board && extra.some((match) => isRegionalMatch(next.world, match))) {
    // Meta do estadual (023 R7): avaliada quando a campanha de um clube termina.
    next = {
      ...next,
      board: boardAfterRegional(
        {
          world: next.world,
          league: next.league,
          finances: next.finances,
          board: next.board,
          careerSeed,
        },
        [next.league, ...next.competitions],
        Math.max(1, leagueRound(next.league) - 1),
      ),
    };
  }
  if (awarded.length > 0) {
    next = { ...next, finances: applyCupPrizes(next.finances, next.league, awarded) };
  }
  const rules = fitnessRules(next.world, next.league.competitionId);
  const fitness = fitnessAfterMatches(next.fitness, played, day.date, rules);
  return { ok: true, state: { ...next, fitness } };
}

/**
 * Liga principal cujas regras valem no jogo (022 R1): a do país da competição; numa competição
 * entre países, a do país do mandante.
 */
function matchMain(state: CareerSeasonState, match: DayMatch): LeagueSeason {
  const competition = state.world.competitions.find((entry) => entry.id === match.competitionId);
  if (competition && competition.countryId === undefined) {
    return mainLeagueOfClub(state, match.fixture.home) ?? state.league;
  }
  return countryMain(state, match.competitionId);
}

/** O jogo é de um estadual (023)? */
function isRegionalMatch(world: CompletedBank, match: DayMatch): boolean {
  return (
    world.competitions.find((entry) => entry.id === match.competitionId)?.regional !== undefined
  );
}

/** Prêmios `awards` (022) dos jogos de uma rodada: compara cada divisão antes e depois dela. */
function slotAwards(
  before: LeagueSeason,
  after: LeagueSeason,
  world: CompletedBank,
  matches: readonly DayMatch[],
  date: string,
): (CompetitionPrize & { competitionId: string })[] {
  return after.divisions.flatMap((division) => {
    const prior = before.divisions.find((entry) => entry.divisionLevel === division.divisionLevel);
    if (!prior) return [];
    const mine = matches.filter((match) => match.divisionLevel === division.divisionLevel);
    return competitionAwards(world, prior, division, mine, date).map((prize) => ({
      ...prize,
      competitionId: after.competitionId,
    }));
  });
}

/**
 * Jogos de competições secundárias do dia: os do país do técnico seguem o caminho completo; os de
 * outros países só movimentam o caixa (bilheteria e prêmios), com as regras do país deles (020).
 */
function afterAllExtraMatches(
  state: CareerSeasonState,
  careerSeed: string,
  managerClubId: string,
  matches: readonly DayMatch[],
): CareerSeasonState {
  const international = (match: DayMatch) =>
    state.world.competitions.find((entry) => entry.id === match.competitionId)?.countryId ===
    undefined;
  const mainOf = (match: DayMatch) => matchMain(state, match);
  const ownMain = (match: DayMatch) => mainOf(match).competitionId === state.league.competitionId;
  // Reações (torcida, diretoria, notícias) e prêmios: jogos do país do técnico e das competições
  // entre países (022), onde o clube dele joga fora de casa em campo estrangeiro. A bilheteria
  // vai sempre para o país do mandante, com as regras dele.
  const reacting = matches.filter((match) => ownMain(match) || international(match));
  let next =
    reacting.length > 0
      ? afterExtraMatches(state, careerSeed, managerClubId, reacting, matches.filter(ownMain))
      : state;
  const groups = new Map<string, DayMatch[]>();
  for (const match of matches) {
    const principal = mainOf(match);
    if (principal.competitionId === state.league.competitionId) continue;
    groups.set(principal.competitionId, [...(groups.get(principal.competitionId) ?? []), match]);
  }
  for (const [principalId, group] of [...groups].sort(([a], [b]) => (a < b ? -1 : 1))) {
    next = foreignExtraMatches(
      next,
      competitionSeason(next, principalId),
      group,
      group.filter((match) => !international(match)),
    );
  }
  return next;
}

/** Bilheteria e prêmios dos jogos de uma liga ou copa de outro país (020). */
function foreignExtraMatches(
  state: CareerSeasonState,
  principal: LeagueSeason,
  matches: readonly DayMatch[],
  /** Jogos cujos prêmios saem aqui; os de competições entre países pagam no caminho comum. */
  prizeMatches: readonly DayMatch[] = matches,
): CareerSeasonState {
  const gated = applyExtraGates(state.finances, principal, state.world, matches, state.fans);
  const prizes = cupSources(state).flatMap(({ competitionId, season }) =>
    cupPrizes(state.world, season, prizeMatches).map((prize) => ({ ...prize, competitionId })),
  );
  const finances = applyCupPrizes(gated, principal, prizes);
  return finances === state.finances ? state : { ...state, finances };
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
  /** Jogos cuja bilheteria sai pelas regras do país do técnico (o mandante é de lá). */
  gateMatches: readonly DayMatch[] = matches,
): CareerSeasonState {
  const round = Math.max(1, leagueRound(state.league) - 1);
  const manager = currentManager(state, managerClubId);
  // A bilheteria usa o humor de antes do jogo.
  const gated = applyExtraGates(state.finances, state.league, state.world, gateMatches, state.fans);
  const finances = withCupPrizes(state, gated, matches);
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
  const cup = cupFacts(next, matches);
  if (next.fans && cup.events.length > 0) {
    next = {
      ...next,
      fans: fansAfterCup(
        { world: next.world, league: next.league, finances, fans: next.fans },
        cup.events,
        round,
        manager,
      ),
    };
  }
  if (next.board && (cup.events.length > 0 || cup.ends.length > 0)) {
    next = {
      ...next,
      board: boardAfterCup(
        {
          world: next.world,
          league: next.league,
          finances,
          board: next.board,
          careerSeed,
          ...(next.fans ? { fans: next.fans } : {}),
        },
        cup.events,
        cup.ends[0],
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
  if (next.news) {
    for (const [competitionId, events, format] of cup.byCompetition) {
      next = {
        ...next,
        news: newsAfterCup(
          {
            world: next.world,
            league: next.league,
            news: next.news as NonNullable<typeof next.news>,
            careerSeed,
            managerClubId: manager,
          },
          events,
          competitionId,
          round,
          format,
        ),
      };
    }
  }
  return next;
}

/**
 * Prêmios e eliminações dos confrontos de uma fase eliminatória de divisão em fases da liga
 * principal (019 R12). A bilheteria, a torcida, a diretoria e as notícias do jogo em si já vieram
 * do caminho da rodada da liga.
 */
function afterStagedKnockout(
  state: CareerSeasonState,
  careerSeed: string,
  managerClubId: string,
  matches: readonly DayMatch[],
): CareerSeasonState {
  const round = Math.max(1, leagueRound(state.league) - 1);
  const manager = currentManager(state, managerClubId);
  const finances = withCupPrizes(state, state.finances, matches);
  let next: CareerSeasonState = finances === state.finances ? state : { ...state, finances };
  const cup = cupFacts(next, matches);
  if (next.fans && cup.events.length > 0) {
    next = {
      ...next,
      fans: fansAfterCup(
        { world: next.world, league: next.league, finances, fans: next.fans },
        cup.events,
        round,
        manager,
      ),
    };
  }
  if (next.board && cup.events.length > 0) {
    next = {
      ...next,
      board: boardAfterCup(
        {
          world: next.world,
          league: next.league,
          finances,
          board: next.board,
          careerSeed,
          ...(next.fans ? { fans: next.fans } : {}),
        },
        cup.events,
        undefined,
        round,
      ),
    };
  }
  if (next.news) {
    for (const [competitionId, events, format] of cup.byCompetition) {
      next = {
        ...next,
        news: newsAfterCup(
          {
            world: next.world,
            league: next.league,
            news: next.news as NonNullable<typeof next.news>,
            careerSeed,
            managerClubId: manager,
          },
          events,
          competitionId,
          round,
          format,
        ),
      };
    }
  }
  return next;
}

/** Eliminações, títulos e fim das copas nos jogos do dia (018 R13). */
function cupFacts(
  state: CareerSeasonState,
  matches: readonly DayMatch[],
): {
  events: CupEvent[];
  ends: CupEnd[];
  byCompetition: [string, CupEvent[], KnockoutFormat | undefined][];
} {
  const events: CupEvent[] = [];
  const ends: CupEnd[] = [];
  const byCompetition: [string, CupEvent[], KnockoutFormat | undefined][] = [];
  for (const { competitionId, season } of cupSources(state)) {
    const own = cupEvents(state.world, season, matches);
    events.push(...own);
    if (own.length > 0) byCompetition.push([competitionId, own, season.cupView?.format]);
    // O fim de uma fase eliminatória é o campeonato da divisão: entra no histórico normal.
    const end = season.cupView ? undefined : cupEnd(state.world, season, matches);
    if (end) ends.push(end);
  }
  return { events, ends, byCompetition };
}

/**
 * As temporadas eliminatórias da carreira: as copas (018) e as fases eliminatórias já começadas de
 * divisões em fases (019), estas como visões da fase.
 */
function cupSources(state: CareerSeasonState): { competitionId: string; season: Season }[] {
  const sources: { competitionId: string; season: Season }[] = [];
  for (const league of [state.league, ...state.competitions]) {
    const first = league.divisions[0];
    if (first?.bracket) {
      sources.push({ competitionId: league.competitionId, season: first });
      continue;
    }
    for (const division of league.divisions) {
      for (const stage of division.stages ?? []) {
        if (!stage.started || stage.kind !== "knockout") continue;
        sources.push({
          competitionId: league.competitionId,
          season: cupView(division, state.world, stage.index),
        });
      }
    }
  }
  return sources;
}

/** Prêmios dos confrontos de copa decididos nos jogos do dia (018 R12). */
function withCupPrizes(
  state: CareerSeasonState,
  finances: FinanceState,
  matches: readonly DayMatch[],
): FinanceState {
  const prizes = cupSources(state).flatMap(({ competitionId, season }) =>
    cupPrizes(state.world, season, matches).map((prize) => ({ ...prize, competitionId })),
  );
  return applyCupPrizes(finances, state.league, prizes);
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
