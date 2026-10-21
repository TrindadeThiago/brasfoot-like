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

/** O banco padrão da liga: sem a copa nacional (018), que tem os próprios testes. */
const leagueCompetitions = competitions.filter(
  (competition) => competition.format.type !== "knockout",
);

function bankFiles(withCup = false) {
  return joinBankFiles({
    // Sem a copa o banco é de um "mod" qualquer: o mundo padrão sem copa a ganha na virada (018).
    "mod.json": withCup ? mod : { ...mod, id: "default-liga" },
    "countries.json": countries,
    "competitions.json": withCup ? competitions : leagueCompetitions,
    "clubs.json": clubs,
    "players.json": players,
    "rivalries.json": rivalries,
  });
}

/** Id e nome do torneio do banco de duas competições (017 R14). */
export const TOURNAMENT_ID = "torneio-teste";
export const TOURNAMENT_NAME = "Torneio de Teste";

/** Banco padrão mais o Torneio de Teste: 10 clubes, ida e volta, às quartas, a cada 2 semanas. */
function twoCompetitionsBank() {
  const main = leagueCompetitions[0];
  if (!main) throw new Error("sem competição");
  const serieB = (main.divisions[1]?.clubIds ?? []) as string[];
  const tournament = {
    id: TOURNAMENT_ID,
    countryId: main.countryId,
    name: TOURNAMENT_NAME,
    format: JSON.parse(JSON.stringify(main.format)),
    divisions: [
      {
        level: 1,
        name: "Divisão única",
        clubIds: [...[...SERIE_A].sort().slice(0, 6), ...[...serieB].sort().slice(0, 4)],
        promotionSlots: 0,
        relegationSlots: 0,
      },
    ],
    schedule: { weekday: 3, startWeek: 1, everyWeeks: 2 },
  };
  return joinBankFiles({
    "mod.json": { ...mod, id: "default-torneio" },
    "countries.json": countries,
    "competitions.json": [...leagueCompetitions, tournament],
    "clubs.json": clubs,
    "players.json": players,
    "rivalries.json": rivalries,
  });
}

let twoBase: SaveFile | undefined;

/**
 * Carreira num banco com duas competições (017): o clube escolhido é o `clubIndex`-ésimo da
 * Série A. Os 6 primeiros por id jogam também o torneio.
 */
export function twoCompetitionsSave(id: string, clubIndex = 0): SaveFile {
  const clubId = SERIE_A[clubIndex] as string;
  const key = `${clubIndex}`;
  if (!twoBase || twoBase.clubId !== clubId) {
    const result = createSave({
      id: "base-duas",
      now: "2026-10-21T12:00:00.000Z",
      managerName: "Ana Souza",
      clubId,
      seed: `teste-web-${key}`,
      defaultBank: twoCompetitionsBank(),
    });
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    twoBase = result.save;
  }
  const copy = JSON.parse(JSON.stringify(twoBase)) as SaveFile;
  return { ...copy, id };
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

let cupBase: SaveFile | undefined;

/** Carreira no banco padrão como é distribuído, com a copa nacional (018). */
export function cupSave(id: string, clubIndex = 0): SaveFile {
  const clubId = SERIE_A[clubIndex] as string;
  if (!cupBase || cupBase.clubId !== clubId) {
    const result = createSave({
      id: "base-copa",
      now: "2026-10-21T12:00:00.000Z",
      managerName: "Ana Souza",
      clubId,
      seed: `teste-web-copa-${clubIndex}`,
      defaultBank: bankFiles(true),
      noFiring: true,
    });
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    cupBase = result.save;
  }
  return { ...(JSON.parse(JSON.stringify(cupBase)) as SaveFile), id };
}
