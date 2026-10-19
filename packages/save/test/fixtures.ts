import clubs from "@brasfoot-like/default-mod/clubs.json" with { type: "json" };
import competitions from "@brasfoot-like/default-mod/competitions.json" with { type: "json" };
import countries from "@brasfoot-like/default-mod/countries.json" with { type: "json" };
import mod from "@brasfoot-like/default-mod/mod.json" with { type: "json" };
import players from "@brasfoot-like/default-mod/players.json" with { type: "json" };
import {
  advanceLeague,
  advanceSeason,
  joinBankFiles,
  type Season,
  type SeasonStep,
} from "@brasfoot-like/engine";
import { createSave, type SaveFile } from "../src";

export const SERIE_A = (competitions[0]?.divisions[0]?.clubIds ?? []) as string[];
export const SERIE_B = (competitions[0]?.divisions[1]?.clubIds ?? []) as string[];

export function defaultBank(): unknown {
  return joinBankFiles({
    "mod.json": mod,
    "countries.json": countries,
    "competitions.json": competitions,
    "clubs.json": clubs,
    "players.json": players,
  });
}

const cached = new Map<string, SaveFile>();

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
export type SaveV2 = Omit<SaveFile, "formatVersion" | "league" | "history" | "finances"> & {
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
      formatVersion: _version,
      ...rest
    } = validSave();
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
export type SaveV3 = Omit<SaveFile, "formatVersion" | "finances"> & { formatVersion: 3 };

const v3Cache = new Map<string, SaveV3>();

/** Save v3 com a liga avançada `step`. */
export function saveV3(step: SeasonStep = { rounds: 0 }): SaveV3 {
  const key = JSON.stringify(step);
  let save = v3Cache.get(key);
  if (!save) {
    const { finances: _finances, formatVersion: _version, ...rest } = validSave();
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
