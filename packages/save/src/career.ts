import {
  adjustLineup,
  type CalendarDay,
  type CareerRoundResult,
  type CareerSeasonState,
  type ClubFixture,
  clubDivision,
  competitionSeason,
  currentDay,
  isCalendarOver,
  leagueCalendar,
  managerClubOf,
  nextClubFixture,
  type QualificationRecord,
  resolveFinishedSeasons,
  type Season,
  type SeasonError,
  seasonDate,
  seasonTurnover,
  upcomingUnavailability,
  withDefaultCupLegs,
  withNationalCup,
} from "@brasfoot-like/engine";
import type { SaveFile } from "./format";

/** Temporada da divisão que o clube do jogador disputa (contracts/save-format-v3.md). */
export function userSeason(save: SaveFile): Season {
  const season = clubDivision(save.league, save.clubId);
  if (!season) throw new Error(`o clube ${save.clubId} não está em nenhuma divisão`);
  return season;
}

export function userDivisionLevel(save: SaveFile): number {
  return userSeason(save).divisionLevel;
}

/** Data do jogo na temporada atual: idades são calculadas nela (research.md R6). */
export function currentDate(save: SaveFile): string {
  return seasonDate(save.bank.manifest.referenceDate, save.league.year);
}

/** Esquema do clube do jogador na temporada da sua divisão = o da escalação. */
export function withManagerFormation(save: SaveFile): SaveFile {
  // Desempregado (012): o clube em foco é da IA e escolhe o próprio esquema.
  if (save.board.manager.clubId === null) return save;
  const level = userDivisionLevel(save);
  return {
    ...save,
    league: {
      ...save.league,
      divisions: save.league.divisions.map((season) =>
        season.divisionLevel === level
          ? {
              ...season,
              formations: { ...season.formations, [save.clubId]: save.lineup.formation },
            }
          : season,
      ),
    },
  };
}

/** Ajuste automático da escalação; as trocas se somam ao aviso ainda não dispensado. */
export function withAdjustedLineup(save: SaveFile): SaveFile {
  if (save.board.manager.clubId === null) return save;
  const squad = save.bank.players.filter((player) => player.clubId === save.clubId);
  const inSquad = new Set(squad.map((player) => player.id));
  const left = [...Object.values(save.lineup.starters), ...save.lineup.bench]
    .filter((playerId) => !inSquad.has(playerId))
    .map((playerId) => ({ playerId, reason: "left" as const, remaining: 0 }));
  // Suspensões valem por competição (017): conta a do próximo jogo do clube.
  const unavailable = [...upcomingUnavailability(seasonStateOf(save), save.clubId), ...left];
  const { lineup, changes } = adjustLineup(save.lineup, squad, unavailable);
  if (changes.length === 0) return save;
  const named = changes.map((change) => {
    if (change.kind === "short_squad") return change;
    // Quem segue no banco tem o nome à mão; só quem saiu do mundo precisa dele no aviso.
    if (save.bank.players.some((player) => player.id === change.outId)) return change;
    const outName = departedName(save, change.outId);
    return outName === undefined ? change : { ...change, outName };
  });
  return { ...save, lineup, lineupNotice: [...(save.lineupNotice ?? []), ...named] };
}

/** Nome de um jogador, mesmo se já saiu do mundo (aposentado, dispensado ou agente livre). */
function departedName(save: SaveFile, playerId: string): string | undefined {
  const notice = save.renewal.squadNotice;
  const gone = notice ? [...notice.retired, ...notice.released] : [];
  return (
    save.bank.players.find((player) => player.id === playerId)?.displayName ??
    gone.find((ref) => ref.playerId === playerId)?.displayName ??
    save.market.freeAgents.find((agent) => agent.player.id === playerId)?.player.displayName
  );
}

/** A parte do save que o dia de jogos da carreira lê e escreve (017). */
export function seasonStateOf(save: SaveFile): CareerSeasonState {
  return {
    league: save.league,
    competitions: save.competitions,
    calendar: save.calendar,
    fitness: save.fitness,
    finances: save.finances,
    world: save.bank,
    renewal: save.renewal,
    market: save.market,
    board: save.board,
    fans: save.fans,
    news: save.news,
  };
}

/** Todos os jogos de todas as competições foram disputados (a temporada pode virar). */
export function isCareerSeasonOver(save: SaveFile): boolean {
  return isCalendarOver(seasonStateOf(save));
}

/**
 * Vagas entre competições que a virada vai resolver (021), calculadas antes dela para a tela de fim
 * de temporada. Só existe com a temporada encerrada e vagas no banco.
 */
export function qualificationPreview(save: SaveFile): QualificationRecord | undefined {
  if (!isCareerSeasonOver(save)) return undefined;
  const outcome = resolveFinishedSeasons(
    save.bank,
    [save.league, ...save.competitions],
    save.league,
  );
  return outcome?.ok ? outcome.result.record : undefined;
}

/** Próximo dia de jogos da temporada (de qualquer competição); undefined com ela encerrada. */
export function currentDayOf(save: SaveFile): CalendarDay | undefined {
  return currentDay(seasonStateOf(save));
}

/** Próximo jogo do clube em foco, de qualquer competição; undefined sem jogos restantes. */
export function nextFixture(save: SaveFile): ClubFixture | undefined {
  return nextClubFixture(seasonStateOf(save), save.clubId);
}

/** Temporada da divisão que o clube do jogador disputa numa competição da carreira. */
export function userSeasonFor(save: SaveFile, competitionId: string): Season | undefined {
  return clubDivision(competitionSeason(seasonStateOf(save), competitionId), save.clubId);
}

/**
 * Se o técnico perdeu o clube na rodada (012), o aviso de escalação some; senão a escalação é
 * ajustada.
 */
function settled(before: SaveFile, next: SaveFile): SaveFile {
  if (before.board.manager.clubId !== null && next.board.manager.clubId === null) {
    const { lineupNotice: _notice, ...rest } = next;
    return rest;
  }
  return withAdjustedLineup(next);
}

/**
 * Grava no save o resultado de uma rodada da carreira (ao vivo ou direto), no caminho anterior ao
 * calendário por datas.
 *
 * @deprecated use `withDayResult`.
 */
export function withRoundResult(
  save: SaveFile,
  result: Extract<CareerRoundResult, { ok: true }>,
): SaveFile {
  return settled(save, {
    ...save,
    league: result.league,
    finances: result.finances,
    bank: result.world,
    renewal: result.renewal ?? save.renewal,
    market: result.market ?? save.market,
    board: result.board ?? save.board,
    fans: result.fans ?? save.fans,
    news: result.news ?? save.news,
  });
}

/** Grava no save o resultado de um dia de jogos da carreira (ao vivo ou direto). */
export function withDayResult(save: SaveFile, state: CareerSeasonState): SaveFile {
  return settled(save, {
    ...save,
    league: state.league,
    competitions: state.competitions,
    calendar: state.calendar,
    fitness: state.fitness,
    finances: state.finances,
    bank: state.world,
    renewal: state.renewal ?? save.renewal,
    market: state.market ?? save.market,
    board: state.board ?? save.board,
    fans: state.fans ?? save.fans,
    news: state.news ?? save.news,
  });
}

/**
 * Mundo da virada: carreiras do mundo padrão criadas antes da 018 não têm a copa nacional; ela
 * entra aqui e a próxima temporada já a traz. As que têm a copa de jogo único recebem as pernas
 * de hoje (ida e volta nas oitavas, quartas e semifinal). Mods não mudam.
 */
function worldForNextSeason(save: SaveFile): SaveFile["bank"] {
  return save.bank.manifest.id === "default"
    ? withDefaultCupLegs(withNationalCup(save.bank))
    : save.bank;
}

/**
 * Virada da carreira (atômica): virada de temporada do motor, esquema do clube do jogador na
 * nova divisão e escalação ajustada às ausências herdadas. Devolve o save novo, sem salvar.
 */
export function advanceCareerSeason(
  save: SaveFile,
  now: string,
): { ok: true; save: SaveFile } | { ok: false; error: SeasonError } {
  const turned = seasonTurnover(save.league, worldForNextSeason(save), save.history, {
    careerSeed: save.seed,
    finances: save.finances,
    managerClubId: managerClubOf(save.board),
    renewal: save.renewal,
    market: save.market,
    board: save.board,
    fans: save.fans,
    news: save.news,
    competitions: save.competitions,
    calendar: save.calendar,
    competitionHistory: save.competitionHistory,
    cupHistory: save.cupHistory,
    ...(save.qualificationHistory ? { qualificationHistory: save.qualificationHistory } : {}),
    ...(save.continentalHistory ? { continentalHistory: save.continentalHistory } : {}),
    ...(save.regionalHistory ? { regionalHistory: save.regionalHistory } : {}),
  });
  if (!turned.ok) return turned;
  const next = withAdjustedLineup(
    withManagerFormation({
      ...save,
      league: turned.league,
      competitions: turned.competitions ?? [],
      calendar: turned.calendar ?? leagueCalendar(turned.world, turned.league),
      // A condição física volta ao máximo na pré-temporada (017 FR-022).
      fitness: { players: {} },
      competitionHistory: turned.competitionHistory ?? save.competitionHistory,
      cupHistory: turned.cupHistory ?? save.cupHistory,
      ...((turned.qualificationHistory ?? save.qualificationHistory)
        ? { qualificationHistory: turned.qualificationHistory ?? save.qualificationHistory }
        : {}),
      ...((turned.continentalHistory ?? save.continentalHistory)
        ? { continentalHistory: turned.continentalHistory ?? save.continentalHistory }
        : {}),
      ...((turned.regionalHistory ?? save.regionalHistory)
        ? { regionalHistory: turned.regionalHistory ?? save.regionalHistory }
        : {}),
      history: turned.history,
      finances: turned.finances ?? save.finances,
      bank: turned.world,
      renewal: turned.renewal ?? save.renewal,
      market: turned.market ?? save.market,
      board: turned.board ?? save.board,
      fans: turned.fans ?? save.fans,
      news: turned.news ?? save.news,
      savedAt: now,
    }),
  );
  return { ok: true, save: next };
}

/** Some com o aviso de mudanças do elenco da virada (009 US6). */
export function dismissSquadNotice(save: SaveFile): SaveFile {
  if (!save.renewal.squadNotice) return save;
  const { squadNotice: _notice, ...renewal } = save.renewal;
  return { ...save, renewal };
}
