import clubs from "@brasfoot-like/default-mod/clubs.json" with { type: "json" };
import competitions from "@brasfoot-like/default-mod/competitions.json" with { type: "json" };
import countries from "@brasfoot-like/default-mod/countries.json" with { type: "json" };
import mod from "@brasfoot-like/default-mod/mod.json" with { type: "json" };
import players from "@brasfoot-like/default-mod/players.json" with { type: "json" };
import rivalries from "@brasfoot-like/default-mod/rivalries.json" with { type: "json" };
import {
  advanceCareer,
  advanceLeague,
  advanceSeason,
  completeCareerDay,
  joinBankFiles,
  type Season,
  type SeasonStep,
} from "@brasfoot-like/engine";
import {
  advanceCareerSeason,
  createSave,
  isCareerSeasonOver,
  managedClubId,
  type SaveFile,
  seasonStateOf,
  withDayResult,
} from "../src";

export const SERIE_A = (competitions[0]?.divisions[0]?.clubIds ?? []) as string[];
export const SERIE_B = (competitions[0]?.divisions[1]?.clubIds ?? []) as string[];

export function defaultBank(): unknown {
  return joinBankFiles({
    "mod.json": mod,
    "countries.json": countries,
    "competitions.json": competitions,
    "clubs.json": clubs,
    "players.json": players,
    "rivalries.json": rivalries,
  });
}

const cached = new Map<string, SaveFile>();

/** Campos criados pela 017 (versão 12): as fixtures de versões antigas não os têm. */
type V12Fields = "competitions" | "calendar" | "fitness" | "competitionHistory";

/** Save atual sem os campos da v12, a base das fixtures de versões antigas. */
function legacySave(): Omit<SaveFile, V12Fields> {
  const {
    competitions: _competitions,
    calendar: _calendar,
    fitness: _fitness,
    competitionHistory: _history,
    ...rest
  } = validSave();
  return rest;
}

/** Save válido da versão atual (memorizado por clube; clonar antes de alterar). */
export function validSave(clubId: string = SERIE_A[0] as string): SaveFile {
  let save = cached.get(clubId);
  if (!save) {
    const result = createSave({
      id: "carreira-teste",
      now: "2026-10-16T12:00:00.000Z",
      managerName: "Ana Souza",
      clubId,
      seed: "teste",
      defaultBank: defaultBank(),
    });
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    save = result.save;
    cached.set(clubId, save);
  }
  return JSON.parse(JSON.stringify(save)) as SaveFile;
}

/** Save no formato da 005/006 (versão 2): uma única `season` da Série A, sem liga nem histórico. */
export type SaveV2 = Omit<
  SaveFile,
  V12Fields | "formatVersion" | "league" | "history" | "finances" | "renewal" | "market"
> & {
  formatVersion: 2;
  season: Season;
};

const v2Cache = new Map<string, SaveV2>();

/** Save v2 com a Série A avançada `step` (a Série A de uma carreira v3 é a mesma da v2, R3). */
export function saveV2(step: SeasonStep = { rounds: 0 }): SaveV2 {
  const key = JSON.stringify(step);
  let save = v2Cache.get(key);
  if (!save) {
    const {
      league,
      history: _history,
      finances: _finances,
      renewal: _renewal,
      formatVersion: _version,
      ...rest
    } = withoutMarket(legacySave());
    const serieA = league.divisions[0];
    if (!serieA) throw new Error("sem Série A");
    let season = serieA;
    if (!("rounds" in step) || step.rounds > 0) {
      const advanced = advanceSeason(serieA, rest.bank, step);
      if (!advanced.ok) throw new Error(JSON.stringify(advanced.error));
      season = advanced.season;
    }
    save = { ...rest, formatVersion: 2, season };
    v2Cache.set(key, save);
  }
  return JSON.parse(JSON.stringify(save)) as SaveV2;
}

/** v2 no meio da temporada (10 rodadas disputadas). */
export function saveV2MidSeason(): SaveV2 {
  return saveV2({ rounds: 10 });
}

/** v2 com a temporada encerrada (38 rodadas). */
export function saveV2SeasonOver(): SaveV2 {
  return saveV2({ toEnd: true });
}

/** Save no formato da 004 (versão 1): como a v2, sem escalação. */
export function saveV1(mutate?: (save: SaveV2) => void) {
  const save = saveV2();
  mutate?.(save);
  const { lineup: _lineup, lineupNotice: _notice, ...rest } = save;
  return { ...rest, formatVersion: 1 };
}

/** Save no formato da 007 (versão 3): liga e histórico, sem finanças. */
export type SaveV3 = Omit<
  SaveFile,
  V12Fields | "formatVersion" | "finances" | "renewal" | "market"
> & {
  formatVersion: 3;
};

const v3Cache = new Map<string, SaveV3>();

/** Save v3 com a liga avançada `step`. */
export function saveV3(step: SeasonStep = { rounds: 0 }): SaveV3 {
  const key = JSON.stringify(step);
  let save = v3Cache.get(key);
  if (!save) {
    const {
      finances: _finances,
      renewal: _renewal,
      formatVersion: _version,
      ...rest
    } = withoutMarket(legacySave());
    let league = rest.league;
    if (!("rounds" in step) || step.rounds > 0) {
      const advanced = advanceLeague(league, rest.bank, step);
      if (!advanced.ok) throw new Error(JSON.stringify(advanced.error));
      league = advanced.league;
    }
    save = { ...rest, formatVersion: 3, league };
    v3Cache.set(key, save);
  }
  return JSON.parse(JSON.stringify(save)) as SaveV3;
}

/** v3 no meio da temporada (10 rodadas). */
export function saveV3MidSeason(): SaveV3 {
  return saveV3({ rounds: 10 });
}

/** v3 com a temporada encerrada. */
export function saveV3SeasonOver(): SaveV3 {
  return saveV3({ toEnd: true });
}

/** Save no formato da 008 (versão 4): finanças, sem renovação. */
export type SaveV4 = Omit<SaveFile, V12Fields | "formatVersion" | "renewal" | "market"> & {
  formatVersion: 4;
};

/** Save no formato da 009 (versão 5): renovação, sem contratos nem mercado. */
export type SaveV5 = Omit<SaveFile, V12Fields | "formatVersion" | "market"> & { formatVersion: 5 };

const v4Cache = new Map<string, SaveV4>();

/** Save v4 com a carreira (liga + finanças) avançada `step`. */
export function saveV4(step: SeasonStep = { rounds: 0 }): SaveV4 {
  const key = JSON.stringify(step);
  let save = v4Cache.get(key);
  if (!save) {
    const { renewal: _renewal, formatVersion: _version, ...rest } = withoutMarket(legacySave());
    let { league, finances } = rest;
    if (!("rounds" in step) || step.rounds > 0) {
      const advanced = advanceCareer(league, finances, rest.bank, step, rest.clubId);
      if (!advanced.ok) throw new Error(JSON.stringify(advanced.error));
      ({ league, finances } = advanced);
    }
    save = { ...rest, formatVersion: 4, league, finances };
    v4Cache.set(key, save);
  }
  return JSON.parse(JSON.stringify(save)) as SaveV4;
}

export function saveV4MidSeason(): SaveV4 {
  return saveV4({ rounds: 10 });
}

export function saveV4SeasonOver(): SaveV4 {
  return saveV4({ toEnd: true });
}

/**
 * Remove o que a v6 e as seguintes acrescentaram (mercado, contratos e diretoria), para comparar
 * com saves antigos.
 */
export function withoutMarket<T extends { bank: { players: { contract?: unknown }[] } }>(
  save: T,
): Omit<T, "market"> {
  const {
    market: _market,
    board: _board,
    fans: _fans,
    news: _news,
    assets: _assets,
    competitions: _competitions,
    calendar: _calendar,
    fitness: _fitness,
    competitionHistory: _competitionHistory,
    ...rest
  } = save as T & {
    market?: unknown;
    board?: unknown;
    fans?: unknown;
    news?: unknown;
    assets?: unknown;
    competitions?: unknown;
    calendar?: unknown;
    fitness?: unknown;
    competitionHistory?: unknown;
  };
  return {
    ...rest,
    bank: {
      ...rest.bank,
      players: rest.bank.players.map(({ contract: _contract, ...player }) => player),
    },
  } as unknown as Omit<T, "market">;
}

const v5Cache = new Map<string, SaveV5>();

/** Save v5 com a carreira (liga + finanças + renovação) avançada `step`. */
export function saveV5(step: SeasonStep = { rounds: 0 }): SaveV5 {
  const key = JSON.stringify(step);
  let save = v5Cache.get(key);
  if (!save) {
    const { formatVersion: _version, ...rest } = withoutMarket(legacySave());
    let { league, finances } = rest;
    if (!("rounds" in step) || step.rounds > 0) {
      const advanced = advanceCareer(league, finances, rest.bank, step, rest.clubId);
      if (!advanced.ok) throw new Error(JSON.stringify(advanced.error));
      ({ league, finances } = advanced);
    }
    save = { ...rest, formatVersion: 5, league, finances };
    v5Cache.set(key, save);
  }
  return JSON.parse(JSON.stringify(save)) as SaveV5;
}

export function saveV5MidSeason(): SaveV5 {
  return saveV5({ rounds: 10 });
}

export function saveV5SeasonOver(): SaveV5 {
  return saveV5({ toEnd: true });
}

/** Save no formato da 010 (versão 6): mercado sem resumos de janela. */
export type SaveV6 = Omit<
  SaveFile,
  V12Fields | "formatVersion" | "board" | "fans" | "news" | "assets"
> & {
  formatVersion: 6;
};

export function saveV6(): SaveV6 {
  const {
    formatVersion: _version,
    market,
    board: _board,
    fans: _fans,
    news: _news,
    assets: _assets,
    ...rest
  } = legacySave();
  const { reports: _reports, ...legacy } = market;
  return { ...rest, market: legacy as SaveFile["market"], formatVersion: 6 };
}

/** Save no formato da 011 (versão 7): mercado com resumos, sem diretoria. */
export type SaveV7 = Omit<
  SaveFile,
  V12Fields | "formatVersion" | "board" | "fans" | "news" | "assets"
> & {
  formatVersion: 7;
};

/** Save v7 com a carreira avançada `step` (sem diretoria). */
export function saveV7(step: SeasonStep = { rounds: 0 }): SaveV7 {
  const {
    formatVersion: _version,
    board: _board,
    fans: _fans,
    news: _news,
    assets: _assets,
    ...rest
  } = legacySave();
  let { league, finances, bank, market } = rest;
  if (!("rounds" in step) || step.rounds > 0) {
    const advanced = advanceCareer(
      league,
      finances,
      bank,
      step,
      rest.clubId,
      undefined,
      undefined,
      { state: market, careerSeed: rest.seed },
    );
    if (!advanced.ok || !advanced.market) throw new Error(JSON.stringify(advanced));
    ({ league, finances, world: bank, market } = advanced);
  }
  return JSON.parse(
    JSON.stringify({ ...rest, formatVersion: 7, league, finances, bank, market }),
  ) as SaveV7;
}

/** Save no formato da 012 (versão 8): diretoria, sem torcidas nem rivalidades no banco. */
export type SaveV8 = Omit<SaveFile, V12Fields | "formatVersion" | "fans" | "news" | "assets"> & {
  formatVersion: 8;
};

export function saveV8(): SaveV8 {
  const {
    formatVersion: _version,
    fans: _fans,
    news: _news,
    assets: _assets,
    ...rest
  } = legacySave();
  const { rivalries: _rivalries, ...bank } = rest.bank;
  return JSON.parse(JSON.stringify({ ...rest, bank, formatVersion: 8 })) as SaveV8;
}

/** Save no formato da 013 (versão 9): torcidas, sem notícias. */
export type SaveV9 = Omit<SaveFile, V12Fields | "formatVersion" | "news" | "assets"> & {
  formatVersion: 9;
};

export function saveV9(): SaveV9 {
  const { formatVersion: _version, news: _news, assets: _assets, ...rest } = legacySave();
  return JSON.parse(JSON.stringify({ ...rest, formatVersion: 9 })) as SaveV9;
}

/** Save no formato da 014 (versão 10): notícias, sem imagens de escudo. */
export type SaveV10 = Omit<SaveFile, V12Fields | "formatVersion" | "assets"> & {
  formatVersion: 10;
};

export function saveV10(): SaveV10 {
  const { formatVersion: _version, assets: _assets, ...rest } = legacySave();
  return JSON.parse(JSON.stringify({ ...rest, formatVersion: 10 })) as SaveV10;
}

/** Quanto da carreira o save v11 já jogou: rodadas da 1ª temporada, o fim dela ou temporadas inteiras. */
export type SaveV11Step = { rounds: number } | { toEnd: true } | { seasons: number };

const NOW_V11 = "2026-10-21T00:00:00.000Z";

/** Um dia de jogos (uma rodada da liga, com o banco padrão) pelo caminho da carreira. */
export function playDay(save: SaveFile): SaveFile {
  const managed = managedClubId(save);
  const result = completeCareerDay(
    seasonStateOf(save),
    save.seed,
    managed,
    undefined,
    managed ? { [managed]: save.lineup } : undefined,
  );
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return withDayResult(save, result.state);
}

function playedCurrentSave(step: SaveV11Step): SaveFile {
  let save = validSave();
  const seasons = "seasons" in step ? step.seasons : 0;
  for (let season = 0; season < seasons; season++) {
    while (!isCareerSeasonOver(save)) save = playDay(save);
    const turned = advanceCareerSeason(save, NOW_V11);
    if (!turned.ok) throw new Error(JSON.stringify(turned.error));
    save = turned.save;
  }
  const rounds = "rounds" in step ? step.rounds : "toEnd" in step ? Number.POSITIVE_INFINITY : 0;
  for (let played = 0; played < rounds && !isCareerSeasonOver(save); played++) save = playDay(save);
  return save;
}

/** Save no formato da 015 (versão 11): sem calendário por datas nem condição física. */
export type SaveV11 = Omit<SaveFile, V12Fields | "formatVersion"> & { formatVersion: 11 };

const v11Cache = new Map<string, SaveV11>();

export function saveV11(step: SaveV11Step = { rounds: 0 }): SaveV11 {
  const key = JSON.stringify(step);
  let save = v11Cache.get(key);
  if (!save) {
    const {
      formatVersion: _version,
      competitions: _competitions,
      calendar: _calendar,
      fitness: _fitness,
      competitionHistory: _history,
      ...rest
    } = playedCurrentSave(step);
    save = { ...rest, formatVersion: 11 };
    v11Cache.set(key, save);
  }
  return JSON.parse(JSON.stringify(save)) as SaveV11;
}
