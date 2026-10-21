import clubs from "@brasfoot-like/default-mod/clubs.json" with { type: "json" };
import competitions from "@brasfoot-like/default-mod/competitions.json" with { type: "json" };
import countries from "@brasfoot-like/default-mod/countries.json" with { type: "json" };
import mod from "@brasfoot-like/default-mod/mod.json" with { type: "json" };
import players from "@brasfoot-like/default-mod/players.json" with { type: "json" };
import rivalries from "@brasfoot-like/default-mod/rivalries.json" with { type: "json" };
import {
  completeCareerRound,
  createBoard,
  finishRound,
  isLeagueSeasonOver,
  joinBankFiles,
  startLeagueRound,
} from "@brasfoot-like/engine";
import {
  advanceCareerSeason,
  createSave,
  initialLineup,
  managedClubId,
  type SaveFile,
  userSeason,
  withRoundResult,
} from "@brasfoot-like/save";

export const SERIE_A = (competitions[0]?.divisions[0]?.clubIds ?? []) as string[];

let base: SaveFile | undefined;

function bankFiles() {
  return joinBankFiles({
    "mod.json": mod,
    "countries.json": countries,
    "competitions.json": competitions,
    "clubs.json": clubs,
    "players.json": players,
    "rivalries.json": rivalries,
  });
}

/** Save válido com id, data e clube escolhidos (o banco é calculado uma vez e clonado). */
export function careerSave(
  id: string,
  savedAt = "2026-10-16T12:00:00.000Z",
  clubIndex = 0,
): SaveFile {
  if (!base) {
    const result = createSave({
      id: "base",
      now: savedAt,
      managerName: "Ana Souza",
      clubId: SERIE_A[0] as string,
      seed: "teste-web",
      defaultBank: bankFiles(),
    });
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    base = result.save;
  }
  const copy = JSON.parse(JSON.stringify(base)) as SaveFile;
  const clubId = SERIE_A[clubIndex] as string;
  if (clubIndex === 0) return { ...copy, id, savedAt, createdAt: savedAt };
  const moved = {
    ...copy,
    clubId,
    board: createBoard(copy.bank, copy.league, copy.finances, copy.seed, {
      clubId,
      noFiring: false,
    }),
  };
  const lineup = initialLineup(copy.bank, userSeason(moved), clubId);
  return { ...moved, id, savedAt, createdAt: savedAt, lineup };
}

/** Uma rodada direta com todos os sistemas da carreira (mesmo caminho do provider). */
function playRound(save: SaveFile): SaveFile {
  const managed = managedClubId(save);
  const started = startLeagueRound(
    save.league,
    save.bank,
    managed ? { [managed]: save.lineup } : undefined,
  );
  if (!started.ok) throw new Error(JSON.stringify(started.error));
  const result = completeCareerRound(
    save.league,
    save.finances,
    save.bank,
    finishRound(started.round),
    managed,
    { state: save.renewal, careerSeed: save.seed },
    { state: save.market, careerSeed: save.seed },
    { state: save.board, careerSeed: save.seed },
    { state: save.fans },
    { state: save.news, careerSeed: save.seed },
  );
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return withRoundResult(save, result);
}

/**
 * Carreira longa (016 R1): `seasonOver` = fim da última temporada jogada (antes da virada) e
 * `next` = começo da seguinte. Sem demissão, para o técnico seguir no clube.
 */
export function longCareer(id: string, seasons: number): { seasonOver: SaveFile; next: SaveFile } {
  const now = "2026-10-20T00:00:00.000Z";
  const created = createSave({
    id,
    now,
    managerName: "Ana Souza",
    clubId: SERIE_A[0] as string,
    seed: "longa",
    defaultBank: bankFiles(),
    noFiring: true,
  });
  if (!created.ok) throw new Error(JSON.stringify(created.error));
  let save = created.save;
  let seasonOver = save;
  for (let season = 1; season <= seasons; season++) {
    while (!isLeagueSeasonOver(save.league)) save = playRound(save);
    seasonOver = save;
    const turned = advanceCareerSeason(save, now);
    if (!turned.ok) throw new Error(JSON.stringify(turned.error));
    save = turned.save;
  }
  return { seasonOver, next: save };
}
