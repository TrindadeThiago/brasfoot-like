import {
  adjustLineup,
  type CareerRoundResult,
  clubDivision,
  clubUnavailability,
  managerClubOf,
  type Season,
  type SeasonError,
  seasonDate,
  seasonTurnover,
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
  const unavailable = [...clubUnavailability(userSeason(save), save.bank, save.clubId), ...left];
  const { lineup, changes } = adjustLineup(save.lineup, squad, unavailable);
  if (changes.length === 0) return save;
  return { ...save, lineup, lineupNotice: [...(save.lineupNotice ?? []), ...changes] };
}

/**
 * Grava no save o resultado de uma rodada da carreira (ao vivo ou direto). Se o técnico perdeu o
 * clube na rodada (012), o aviso de escalação some; senão a escalação é ajustada.
 */
export function withRoundResult(
  save: SaveFile,
  result: Extract<CareerRoundResult, { ok: true }>,
): SaveFile {
  const next: SaveFile = {
    ...save,
    league: result.league,
    finances: result.finances,
    bank: result.world,
    renewal: result.renewal ?? save.renewal,
    market: result.market ?? save.market,
    board: result.board ?? save.board,
    fans: result.fans ?? save.fans,
    news: result.news ?? save.news,
  };
  if (save.board.manager.clubId !== null && next.board.manager.clubId === null) {
    const { lineupNotice: _notice, ...rest } = next;
    return rest;
  }
  return withAdjustedLineup(next);
}

/**
 * Virada da carreira (atômica): virada de temporada do motor, esquema do clube do jogador na
 * nova divisão e escalação ajustada às ausências herdadas. Devolve o save novo, sem salvar.
 */
export function advanceCareerSeason(
  save: SaveFile,
  now: string,
): { ok: true; save: SaveFile } | { ok: false; error: SeasonError } {
  const turned = seasonTurnover(save.league, save.bank, save.history, {
    careerSeed: save.seed,
    finances: save.finances,
    managerClubId: managerClubOf(save.board),
    renewal: save.renewal,
    market: save.market,
    board: save.board,
    fans: save.fans,
    news: save.news,
  });
  if (!turned.ok) return turned;
  const next = withAdjustedLineup(
    withManagerFormation({
      ...save,
      league: turned.league,
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
