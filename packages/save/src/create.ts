import {
  type CompletedBank,
  clubDivision,
  completeHiddenAttributes,
  createBoard,
  createCareerSeason,
  createFans,
  createFinances,
  createNews,
  emptyMarket,
  ensureContracts,
  initialRenewal,
  validateBank,
} from "@brasfoot-like/engine";
import { MANAGER_NAME_MAX, SAVE_FORMAT_VERSION, type SaveError, type SaveFile } from "./format";
import { initialLineup } from "./lineup";

export interface CreateSaveInput {
  id: string;
  /** Data/hora ISO vinda da interface (o pacote não lê relógio). */
  now: string;
  managerName: string;
  clubId: string;
  seed: string;
  /** Opção "sem demissão" (012 FR-035); padrão desativada. */
  noFiring?: boolean;
  /** Banco (padrão ou de um mod) já unido (`joinBankFiles`), ainda não validado. */
  defaultBank: unknown;
  /** Imagens do mod (caminho → data URI); só as usadas pelos escudos vão para o save (015). */
  assets?: Record<string, string>;
}

/** Imagens referenciadas pelos escudos dos clubes do banco. */
function usedAssets(
  bank: Pick<CompletedBank, "clubs">,
  assets: Record<string, string>,
): Record<string, string> {
  const used: Record<string, string> = {};
  for (const club of bank.clubs) {
    const path = club.crest.image;
    const data = path ? assets[path] : undefined;
    if (path && data) used[path] = data;
  }
  return used;
}

export type CreateSaveResult = { ok: true; save: SaveFile } | { ok: false; error: SaveError };

/**
 * Cria a carreira (FR-001, FR-003): valida o nome e o banco, completa os atributos ocultos com a
 * seed da carreira e cria a temporada da liga (todas as divisões) com a mesma seed (007 R10).
 */
export function createSave(input: CreateSaveInput): CreateSaveResult {
  const managerName = input.managerName.trim();
  if (managerName.length < 1 || managerName.length > MANAGER_NAME_MAX) {
    return {
      ok: false,
      error: {
        code: "save.invalid_name",
        params: { length: managerName.length, max: MANAGER_NAME_MAX },
      },
    };
  }
  const validation = validateBank(input.defaultBank);
  if (!validation.ok) {
    return {
      ok: false,
      error: { code: "save.invalid_bank", params: { issues: validation.errors.length } },
    };
  }
  const completed = completeHiddenAttributes(validation.bank, input.seed);
  const bank = ensureContracts(
    completed,
    Number(completed.manifest.referenceDate.slice(0, 4)),
    input.seed,
  );
  const competition = bank.competitions[0];
  if (!competition?.divisions.some((division) => division.clubIds.includes(input.clubId))) {
    return {
      ok: false,
      error: { code: "save.club_not_in_league", params: { clubId: input.clubId } },
    };
  }
  const seasons = createCareerSeason(bank, { careerSeed: input.seed });
  const season = seasons.ok ? clubDivision(seasons.league, input.clubId) : undefined;
  if (!seasons.ok || !season) {
    return { ok: false, error: { code: "save.invalid_bank", params: { issues: 1 } } };
  }
  const finances = createFinances(bank, seasons.league);
  return {
    ok: true,
    save: {
      formatVersion: SAVE_FORMAT_VERSION,
      id: input.id,
      createdAt: input.now,
      savedAt: input.now,
      managerName,
      clubId: input.clubId,
      seed: input.seed,
      bank,
      league: seasons.league,
      history: [],
      competitions: seasons.competitions,
      calendar: seasons.calendar,
      fitness: seasons.fitness,
      competitionHistory: [],
      cupHistory: [],
      finances,
      renewal: initialRenewal(bank),
      market: emptyMarket(),
      fans: createFans(bank, seasons.league),
      news: createNews(),
      assets: usedAssets(bank, input.assets ?? {}),
      board: createBoard(bank, seasons.league, finances, input.seed, {
        clubId: input.clubId,
        noFiring: input.noFiring ?? false,
      }),
      lineup: initialLineup(bank, season, input.clubId),
    },
  };
}
